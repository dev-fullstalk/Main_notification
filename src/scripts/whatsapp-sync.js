const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  downloadMediaMessage 
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.ENV'), quiet: true });

// Thư mục lưu auth session & media tải từ WhatsApp
const authDir = path.resolve(__dirname, '../../whatsapp_auth');
const uploadDir = path.resolve(__dirname, '../../public/uploads/whatsapp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'terax_database',
  user: process.env.DB_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'postgres',
  options: '-c search_path=notification',
});

let sock;
let channelId;

async function initChannel() {
  // Đảm bảo platform whatsapp có trong channels_platforms
  let platRes = await pool.query(`SELECT id FROM channels_platforms WHERE name = 'whatsapp'`);
  let platformId;
  if (platRes.rows.length === 0) {
    const newPlat = await pool.query(`INSERT INTO channels_platforms (name) VALUES ('whatsapp') RETURNING id`);
    platformId = newPlat.rows[0].id;
  } else {
    platformId = platRes.rows[0].id;
  }

  // Đảm bảo channel WhatsApp có trong channels
  let chanRes = await pool.query(`SELECT id FROM channels WHERE id__channels_platforms = $1 LIMIT 1`, [platformId]);
  if (chanRes.rows.length === 0) {
    const newChan = await pool.query(`
      INSERT INTO channels (id__channels_platforms, name, external_channel_id, avatar_url, is_active)
      VALUES ($1, 'WhatsApp Cá Nhân', 'whatsapp-main', 'https://img.icons8.com/color/512/whatsapp--v1.png', true)
      RETURNING id
    `, [platformId]);
    channelId = newChan.rows[0].id;
  } else {
    channelId = chanRes.rows[0].id;
  }
}

async function connectToWhatsApp() {
  const credsFile = path.join(authDir, 'creds.json');
  if (!fs.existsSync(credsFile)) {
    console.log('ℹ️ Chưa có phiên đăng nhập WhatsApp lưu sẵn. Vui lòng vào Web để quét mã QR.');
    return;
  }

  await initChannel();

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['Terax Omnichannel', 'Chrome', '1.0.0'],
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  let qrCount = 0;
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCount++;
      console.clear();
      console.log('================================================================');
      console.log(`📱 MÃ QR KẾT NỐI WHATSAPP (Mã thứ ${qrCount} - Làm mới mỗi 20s):`);
      console.log('👉 WhatsApp trên ĐT > Cài đặt > Thiết bị liên kết > Quét mã QR');
      console.log('================================================================\n');
      qrcode.generate(qr, { small: true });
      console.log('\n💡 MẸO QUÉT NHANH:');
      console.log('- Đặt màn hình rộng để mã QR không bị méo dòng.');
      console.log('- Để camera điện thoại thẳng và lấy nét vào giữa mã.');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log('⚠️ Đang kết nối lại WhatsApp...');
        setTimeout(connectToWhatsApp, 2000);
      } else {
        console.log('❌ Phiên đăng nhập đã bị đăng xuất.');
      }
    } else if (connection === 'open') {
      console.clear();
      const userJid = sock.user?.id || '';
      console.log(`========================================================`);
      console.log(`🎉 KẾT NỐI WHATSAPP THÀNH CÔNG RỰC RỠ!`);
      console.log(`👤 Số tài khoản: ${userJid.split(':')[0] || userJid}`);
      console.log(`📡 Đang lắng nghe & đồng bộ tin nhắn 2 chiều thời gian thực...`);
      console.log(`========================================================`);
    }
  });

  // --- 1. LẮNG NGHE TIN NHẮN ĐẾN ---
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return;

    for (const msg of m.messages) {
      try {
        if (!msg.message) continue;
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || remoteJid === 'status@broadcast') continue;

        const isOutgoing = Boolean(msg.key.fromMe);
        const senderId = remoteJid; // e.g. 84912345678@s.whatsapp.net
        const senderPhone = remoteJid.split('@')[0];
        const senderName = msg.pushName || `+${senderPhone}`;
        const msgId = msg.key.id;

        // Kiểm tra nếu là tin nhắn Thu Hồi (Revoke / Delete)
        if (msg.message.protocolMessage && (msg.message.protocolMessage.type === 0 || msg.message.protocolMessage.type === 14)) {
          const revokedMsgId = msg.message.protocolMessage.key?.id;
          if (revokedMsgId) {
            console.log(`🗑️ [WhatsApp] Thu hồi / xóa tin nhắn: ID ${revokedMsgId}`);
            await pool.query(`DELETE FROM messages WHERE external_message_id = $1`, [revokedMsgId]);
          }
          continue;
        }

        // Trích xuất nội dung
        let textContent = '';
        let mediaUrl = null;
        let messageTypeId = 1;

        if (msg.message.conversation) {
          textContent = msg.message.conversation;
        } else if (msg.message.extendedTextMessage?.text) {
          textContent = msg.message.extendedTextMessage.text;
        } else if (msg.message.imageMessage) {
          textContent = msg.message.imageMessage.caption || '[Hình ảnh]';
          messageTypeId = 2;
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            const fileName = `wa_${msgId}_${Date.now()}.jpg`;
            fs.writeFileSync(path.join(uploadDir, fileName), buffer);
            mediaUrl = `/uploads/whatsapp/${fileName}`;
          } catch (e) {}
        } else if (msg.message.videoMessage) {
          textContent = msg.message.videoMessage.caption || '[Video]';
          messageTypeId = 3;
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            const fileName = `wa_${msgId}_${Date.now()}.mp4`;
            fs.writeFileSync(path.join(uploadDir, fileName), buffer);
            mediaUrl = `/uploads/whatsapp/${fileName}`;
          } catch (e) {}
        } else if (msg.message.audioMessage) {
          textContent = '[Tin nhắn thoại]';
          messageTypeId = 5;
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            const fileName = `wa_${msgId}_${Date.now()}.ogg`;
            fs.writeFileSync(path.join(uploadDir, fileName), buffer);
            mediaUrl = `/uploads/whatsapp/${fileName}`;
          } catch (e) {}
        } else if (msg.message.documentMessage) {
          textContent = msg.message.documentMessage.fileName || '[Tài liệu]';
          messageTypeId = 4;
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            const ext = msg.message.documentMessage.fileName?.split('.').pop() || 'bin';
            const fileName = `wa_${msgId}_${Date.now()}.${ext}`;
            fs.writeFileSync(path.join(uploadDir, fileName), buffer);
            mediaUrl = `/uploads/whatsapp/${fileName}`;
          } catch (e) {}
        } else if (msg.message.stickerMessage) {
          textContent = '[Sticker]';
          messageTypeId = 6;
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            const fileName = `wa_${msgId}_${Date.now()}.webp`;
            fs.writeFileSync(path.join(uploadDir, fileName), buffer);
            mediaUrl = `/uploads/whatsapp/${fileName}`;
          } catch (e) {}
        }

        if (!textContent && !mediaUrl) continue;

        console.log(`📥 [WhatsApp] ${isOutgoing ? 'Bạn gửi' : 'Khách gửi'} (${senderName}): ${textContent}`);

        // Lưu Contact
        let contactRes = await pool.query(
          `SELECT id FROM contacts WHERE channel_id = $1 AND external_user_id = $2`,
          [channelId, senderId]
        );
        let contactId;
        if (contactRes.rows.length === 0) {
          const newContact = await pool.query(
            `INSERT INTO contacts (channel_id, external_user_id, name, phone, metadata)
             VALUES ($1, $2, $3, $4, '{}')
             RETURNING id`,
            [channelId, senderId, senderName, senderPhone]
          );
          contactId = newContact.rows[0].id;
        } else {
          contactId = contactRes.rows[0].id;
        }

        // Lưu Conversation
        const lastPreview = mediaUrl ? (messageTypeId === 2 ? '[Hình ảnh]' : '[Tài liệu]') : textContent;
        let convRes = await pool.query(
          `SELECT id FROM conversations WHERE channel_id = $1 AND contact_id = $2`,
          [channelId, contactId]
        );
        let convId;
        if (convRes.rows.length === 0) {
          const newConv = await pool.query(
            `INSERT INTO conversations (channel_id, contact_id, id__conversations_statuses, last_message_preview, last_message_at, unread_count)
             VALUES ($1, $2, 1, $3, CURRENT_TIMESTAMP, $4)
             RETURNING id`,
            [channelId, contactId, lastPreview, isOutgoing ? 0 : 1]
          );
          convId = newConv.rows[0].id;
        } else {
          convId = convRes.rows[0].id;
          await pool.query(
            `UPDATE conversations 
             SET last_message_preview = $1, 
                 last_message_at = CURRENT_TIMESTAMP, 
                 unread_count = CASE WHEN $3 = true THEN unread_count ELSE unread_count + 1 END
             WHERE id = $2`,
            [lastPreview, convId, isOutgoing]
          );
        }

        // Lưu Message
        if (msgId) {
          const dup = await pool.query(
            `SELECT id FROM messages WHERE conversation_id = $1 AND external_message_id = $2`,
            [convId, msgId]
          );
          if (dup.rows.length > 0) continue;
        }

        const senderTypeId = isOutgoing ? 2 : 1;
        await pool.query(
          `INSERT INTO messages (conversation_id, id__messages_sender_types, id__messages_types, content, media_url, external_message_id, id__messages_statuses)
           VALUES ($1, $2, $3, $4, $5, $6, 3)`,
          [convId, senderTypeId, messageTypeId, textContent, mediaUrl, msgId || null]
        );

      } catch (err) {
        console.error('Lỗi lưu tin nhắn WhatsApp:', err.message);
      }
    }
  });

  // --- 1.1 LẮNG NGHE KHÁCH ĐANG SOẠN TIN TRÊN WHATSAPP ---
  sock.ev.on('presence.update', async ({ id, presences }) => {
    try {
      if (!id || !presences) return;
      const presence = presences[id];
      const isComposing = presence && presence.lastKnownPresence === 'composing';
      if (isComposing) {
        await pool.query(`
          UPDATE conversations 
          SET is_typing = true, typing_updated_at = CURRENT_TIMESTAMP 
          WHERE channel_id = $1 AND contact_id = (SELECT id FROM contacts WHERE channel_id = $1 AND external_user_id = $2 LIMIT 1)
        `, [channelId, id]);
      }
    } catch (e) {}
  });

  // --- 2. TỰ ĐỘNG GỬI TIN NHẮN VÀ TRẠNG THÁI TYPING TỪ WEB APP SANG WHATSAPP ---
  setInterval(async () => {
    if (!sock || !channelId) return;
    try {
      // 2.1 Gửi typing khi Agent đang gõ trên Web
      const typingRows = await pool.query(`
        SELECT external_user_id, is_typing 
        FROM outbound_typing 
        WHERE channel_id = $1 AND updated_at > CURRENT_TIMESTAMP - INTERVAL '5 seconds'
      `, [channelId]);

      for (const tRow of typingRows.rows) {
        if (tRow.external_user_id) {
          try {
            await sock.sendPresenceUpdate(tRow.is_typing ? 'composing' : 'paused', tRow.external_user_id);
          } catch (e) {}
        }
      }

      // 2.2 Gửi tin nhắn chưa gửi
      const unsent = await pool.query(`
        SELECT m.id, m.conversation_id, m.content, cont.external_user_id
        FROM messages m
        JOIN conversations conv ON m.conversation_id = conv.id
        JOIN contacts cont ON conv.contact_id = cont.id
        WHERE conv.channel_id = $1 
          AND m.id__messages_sender_types = 2 
          AND (m.external_message_id IS NULL OR m.external_message_id = '')
        ORDER BY m.created_at ASC
        LIMIT 5
      `, [channelId]);

      for (const row of unsent.rows) {
        if (row.content && row.external_user_id) {
          console.log(`📤 Đang gửi từ Web App tới WhatsApp (${row.external_user_id}): "${row.content}"`);
          try {
            const sent = await sock.sendMessage(row.external_user_id, {
              text: row.content
            });

            await pool.query(`
              UPDATE messages 
              SET external_message_id = $1, id__messages_statuses = 3 
              WHERE id = $2
            `, [sent.key.id, row.id]);

            console.log(`✅ Gửi tin nhắn thành công qua WhatsApp!`);
          } catch (sendErr) {
            console.error('Lỗi gửi WhatsApp:', sendErr.message);
            await pool.query(`UPDATE messages SET external_message_id = 'ERR' WHERE id = $1`, [row.id]);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }, 1000);
}

connectToWhatsApp().catch(err => {
  console.error('❌ Lỗi tiến trình WhatsApp:', err);
});
