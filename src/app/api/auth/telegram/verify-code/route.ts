import { TelegramClient, Api, sessions } from 'telegram';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { query } from '@/config/database';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber, phoneCodeHash, phoneCode, password, tempSession, customChannelName } = body;

    if (!phoneNumber || !phoneCodeHash || !phoneCode || !tempSession) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin xác thực (Số điện thoại, OTP, hoặc phiên)' },
        { status: 400 }
      );
    }

    const apiId = Number(process.env.TELEGRAM_API_ID) || 38802670;
    const apiHash = process.env.TELEGRAM_API_HASH || '245dbf5bc61c0590b473fb31747bb198';

    const client = new TelegramClient(new sessions.StringSession(tempSession), apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.connect();

    let user;
    try {
      const result = await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phoneNumber.trim().replace(/\s+/g, ''),
          phoneCodeHash: phoneCodeHash.trim(),
          phoneCode: phoneCode.trim(),
        })
      );
      user = (result as any).user || result;
    } catch (err: any) {
      if (err?.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        if (!password) {
          await client.disconnect();
          return NextResponse.json({
            success: false,
            requires2FA: true,
            message: 'Tài khoản yêu cầu mật khẩu bảo vệ 2 lớp (2FA). Vui lòng nhập mật khẩu.',
          });
        }

        user = await client.signInWithPassword(
          { apiId, apiHash },
          {
            password: async () => password.trim(),
            onError: async (pErr) => {
              console.error('2FA error:', pErr);
              return true;
            },
          }
        );
      } else {
        throw err;
      }
    }

    const finalSession = client.session.save();
    const me = (await client.getMe()) as any;

    // 1. Cập nhật file .ENV và .env.local
    const envPath = path.resolve(process.cwd(), '.ENV');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    if (envContent.includes('TELEGRAM_USER_SESSION=')) {
      envContent = envContent.replace(/TELEGRAM_USER_SESSION=.*/, `TELEGRAM_USER_SESSION=${finalSession}`);
    } else {
      envContent += `\nTELEGRAM_API_ID=${apiId}\nTELEGRAM_API_HASH=${apiHash}\nTELEGRAM_USER_SESSION=${finalSession}\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf-8');

    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      let envLocalContent = fs.readFileSync(envLocalPath, 'utf-8');
      if (envLocalContent.includes('TELEGRAM_USER_SESSION=')) {
        envLocalContent = envLocalContent.replace(/TELEGRAM_USER_SESSION=.*/, `TELEGRAM_USER_SESSION=${finalSession}`);
      } else {
        envLocalContent += `\nTELEGRAM_USER_SESSION=${finalSession}\n`;
      }
      fs.writeFileSync(envLocalPath, envLocalContent, 'utf-8');
    }

    // 2. Cập nhật Channel trong Database
    const fullName = `${me.firstName || ''} ${me.lastName || ''}`.trim() || 'Telegram User';
    const channelName = customChannelName && typeof customChannelName === 'string' && customChannelName.trim()
      ? customChannelName.trim()
      : `Telegram: ${fullName}`;
    let channelId: any = null;

    try {
      const existing = await query(
        `SELECT id, external_channel_id FROM channels WHERE id__channels_platforms = 3 LIMIT 1`
      );
      if (existing.rows.length === 0) {
        const newCh = await query(
          `
          INSERT INTO channels (id__channels_platforms, name, external_channel_id, avatar_url, is_active)
          VALUES (3, $1, $2, 'https://img.icons8.com/color/512/telegram-app.png', true)
          RETURNING id
        `,
          [channelName, String(me.id)]
        );
        channelId = newCh.rows[0].id;
      } else {
        channelId = existing.rows[0].id;
        const oldId = existing.rows[0].external_channel_id;

        // Nếu ID tài khoản mới khác ID cũ -> xóa sạch tin nhắn của tài khoản cũ
        if (oldId && oldId !== String(me.id)) {
          console.log(`🔄 Đổi sang tài khoản Telegram mới (ID ${me.id} khác ID cũ ${oldId})!`);
          console.log('🧹 Đang xóa sạch tin nhắn và hội thoại của tài khoản cũ...');
          await query(`DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE channel_id = $1)`, [channelId]);
          await query(`DELETE FROM conversations WHERE channel_id = $1`, [channelId]);
          await query(`DELETE FROM contacts WHERE channel_id = $1`, [channelId]);
        }

        await query(
          `
          UPDATE channels 
          SET name = $1, external_channel_id = $2, is_active = true, updated_at = NOW()
          WHERE id = $3
        `,
          [channelName, String(me.id), channelId]
        );
      }

      // 3. TỰ ĐỘNG ĐỒNG BỘ CÁC HỘI THOẠI GẦN NHẤT CỦA SẾP VÀO DB
      console.log('🔄 Đang tự động kéo các cuộc hội thoại Telegram gần nhất vào Web...');
      const dialogs = await client.getDialogs({ limit: 15 });
      for (const dialog of dialogs) {
        if (!dialog.isUser) continue;
        const peer = dialog.entity as any;
        if (!peer || String(peer.id) === String(me.id)) continue;

        const peerId = String(peer.id);
        const peerName = [peer.firstName, peer.lastName].filter(Boolean).join(' ') || peer.username || `User ${peerId}`;

        // Contact
        let contactRes = await query(
          `SELECT id FROM contacts WHERE channel_id = $1 AND external_user_id = $2`,
          [channelId, peerId]
        );
        let contactId;
        if (contactRes.rows.length === 0) {
          const newContact = await query(
            `INSERT INTO contacts (channel_id, external_user_id, name, metadata)
             VALUES ($1, $2, $3, '{}')
             RETURNING id`,
            [channelId, peerId, peerName]
          );
          contactId = newContact.rows[0].id;
        } else {
          contactId = contactRes.rows[0].id;
        }

        // Fetch recent messages
        const history = await client.getMessages(peer, { limit: 10 });
        const lastMsg = history[0];
        const lastPreview = lastMsg?.message || '[Đính kèm]';

        // Conversation
        let convRes = await query(
          `SELECT id FROM conversations WHERE channel_id = $1 AND contact_id = $2`,
          [channelId, contactId]
        );
        let convId;
        if (convRes.rows.length === 0) {
          const newConv = await query(
            `INSERT INTO conversations (channel_id, contact_id, id__conversations_statuses, last_message_preview, last_message_at, unread_count)
             VALUES ($1, $2, 1, $3, CURRENT_TIMESTAMP, 0)
             RETURNING id`,
            [channelId, contactId, lastPreview]
          );
          convId = newConv.rows[0].id;
        } else {
          convId = convRes.rows[0].id;
          await query(
            `UPDATE conversations 
             SET last_message_preview = $1, last_message_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [lastPreview, convId]
          );
        }

        // Messages
        for (const msg of history.reverse()) {
          const text = msg.message || '';
          const isOut = Boolean(msg.out);
          const msgId = String(msg.id);

          const dup = await query(
            `SELECT id FROM messages WHERE conversation_id = $1 AND external_message_id = $2`,
            [convId, msgId]
          );
          if (dup.rows.length === 0) {
            await query(
              `INSERT INTO messages (conversation_id, id__messages_sender_types, id__messages_types, content, external_message_id, id__messages_statuses)
               VALUES ($1, $2, 1, $3, $4, 3)`,
              [convId, isOut ? 2 : 1, text, msgId]
            );
          }
        }
      }
      console.log('✅ Đã đồng bộ xong lịch sử tin nhắn của Sếp vào Web!');
    } catch (syncErr: any) {
      console.warn('Sync recent dialogs warning:', syncErr.message);
    }

    await client.disconnect();

    // Tự động khởi động lại Sync Engine ngầm cho Telegram ngay trên Web
    try {
      const { restartSync } = await import('@/lib/sync-manager');
      restartSync('telegram');
    } catch (e: any) {
      console.warn('Auto-restart sync warning:', e.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Đăng nhập và đồng bộ tài khoản Telegram thành công!',
      data: {
        id: String(me.id),
        firstName: me.firstName,
        lastName: me.lastName,
        username: me.username || null,
        phone: me.phone || phoneNumber,
        channelName,
      },
    });
  } catch (error: any) {
    console.error('Telegram verifyCode error:', error);
    const errorMessage = error?.errorMessage || error?.message || 'Mã xác nhận OTP hoặc mật khẩu không chính xác';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
