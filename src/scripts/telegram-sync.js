const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.ENV') });

const apiId = 38802670;
const apiHash = '245dbf5bc61c0590b473fb31747bb198';
const sessionString = process.env.TELEGRAM_USER_SESSION || '';

if (!sessionString) {
  console.error('❌ Chưa có TELEGRAM_USER_SESSION trong .ENV!');
  console.error('👉 Vui lòng chạy lệnh: node src/scripts/telegram-login.js để đăng nhập trước.');
  process.exit(1);
}

// Tạo thư mục lưu media tải từ Telegram
const uploadDir = path.resolve(__dirname, '../../public/uploads/telegram');
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

async function main() {
  console.log('🚀 Đang kết nối Telegram MTProto Client (Tài khoản cá nhân)...');
  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  const me = await client.getMe();
  console.log(`✅ Kết nối thành công! Tài khoản: ${me.firstName} ${me.lastName || ''} (@${me.username || me.id})`);

  let channelRes = await pool.query(
    `SELECT id, external_channel_id FROM channels WHERE id__channels_platforms = 3 LIMIT 1`
  );
  let channelId;
  const currentUserId = String(me.id);

  if (channelRes.rows.length === 0) {
    const newChan = await pool.query(`
      INSERT INTO channels (id__channels_platforms, name, external_channel_id, avatar_url, is_active)
      VALUES (3, $1, $2, 'https://img.icons8.com/color/512/telegram-app.png', true)
      RETURNING id
    `, [`Telegram: ${me.firstName}`, currentUserId]);
    channelId = newChan.rows[0].id;
  } else {
    channelId = channelRes.rows[0].id;
    const oldExternalId = channelRes.rows[0].external_channel_id;

    // Nếu phát hiện đăng nhập tài khoản khác (ID khác) -> xóa sạch tin nhắn của tài khoản cũ
    if (oldExternalId && oldExternalId !== currentUserId) {
      console.log(`🔄 Phát hiện đổi sang tài khoản Telegram mới (ID ${currentUserId} khác với ID cũ ${oldExternalId})!`);
      console.log('🧹 Đang tự động dọn dẹp sạch toàn bộ tin nhắn & hội thoại của tài khoản cũ...');
      await pool.query(`DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE channel_id = $1)`, [channelId]);
      await pool.query(`DELETE FROM conversations WHERE channel_id = $1`, [channelId]);
      await pool.query(`DELETE FROM contacts WHERE channel_id = $1`, [channelId]);
      await pool.query(`UPDATE channels SET external_channel_id = $1, name = $2, is_active = true, updated_at = NOW() WHERE id = $3`, [currentUserId, `Telegram: ${me.firstName}`, channelId]);
      console.log('✨ Đã làm sạch xong dữ liệu cũ!');
    }
  }

  // --- HÀM TẢI VÀ LƯU FILE MEDIA ---
  async function downloadMessageMedia(msg) {
    if (!msg.media) return { mediaUrl: null, messageTypeId: 1 };
    try {
      let ext = 'jpg';
      let messageTypeId = 2; // default image

      if (msg.photo) {
        ext = 'jpg';
        messageTypeId = 2;
      } else if (msg.gif || (msg.document && msg.document.mimeType && msg.document.mimeType.includes('gif'))) {
        ext = 'mp4'; // Telegram saves GIFs as MP4 animations
        messageTypeId = 2;
      } else if (msg.video) {
        ext = 'mp4';
        messageTypeId = 3;
      } else if (msg.voice || msg.audio) {
        ext = 'ogg';
        messageTypeId = 5;
      } else if (msg.sticker) {
        ext = 'webp';
        messageTypeId = 6;
      } else if (msg.document) {
        ext = 'bin';
        messageTypeId = 4;
      }

      const fileName = `tg_${msg.id}_${Date.now()}.${ext}`;
      const filePath = path.join(uploadDir, fileName);

      const buffer = await client.downloadMedia(msg, {});
      if (buffer && buffer.length > 0) {
        fs.writeFileSync(filePath, buffer);
        console.log(`🖼️ Đã tải và lưu media: ${fileName} (${buffer.length} bytes)`);
        return { mediaUrl: `/uploads/telegram/${fileName}`, messageTypeId };
      }
    } catch (e) {
      console.warn('Không thể tải media:', e.message);
    }
    return { mediaUrl: null, messageTypeId: 1 };
  }

  // --- HÀM LƯU TIN NHẮN VÀO DATABASE ---
  async function saveTelegramMessage(senderId, senderName, textContent, msgId, isOutgoing = false, mediaUrl = null, messageTypeId = 1) {
    try {
      if (!textContent && !mediaUrl) textContent = '[Tập tin/Hình ảnh]';

      // 1. Contact
      let contactRes = await pool.query(
        `SELECT id FROM contacts WHERE channel_id = $1 AND external_user_id = $2`,
        [channelId, senderId]
      );
      let contactId;
      if (contactRes.rows.length === 0) {
        const newContact = await pool.query(
          `INSERT INTO contacts (channel_id, external_user_id, name, metadata)
           VALUES ($1, $2, $3, '{}')
           RETURNING id`,
          [channelId, senderId, senderName]
        );
        contactId = newContact.rows[0].id;
      } else {
        contactId = contactRes.rows[0].id;
      }

      // 2. Conversation
      const lastPreview = mediaUrl ? (messageTypeId === 2 ? '[Hình ảnh/GIF]' : '[Tài liệu]') : textContent;
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

      // 3. Message check trùng
      if (msgId) {
        const dup = await pool.query(
          `SELECT id, media_url FROM messages WHERE conversation_id = $1 AND external_message_id = $2`,
          [convId, msgId]
        );
        if (dup.rows.length > 0) {
          if (mediaUrl && !dup.rows[0].media_url) {
            await pool.query(
              `UPDATE messages SET media_url = $1, id__messages_types = $2 WHERE id = $3`,
              [mediaUrl, messageTypeId, dup.rows[0].id]
            );
            console.log(`🔄 Đã cập nhật media cho tin nhắn cũ ID ${dup.rows[0].id}`);
          }
          return;
        }
      }

      const senderTypeId = isOutgoing ? 2 : 1; // 1: customer, 2: agent
      await pool.query(
        `INSERT INTO messages (conversation_id, id__messages_sender_types, id__messages_types, content, media_url, external_message_id, id__messages_statuses)
         VALUES ($1, $2, $3, $4, $5, $6, 3)`,
        [convId, senderTypeId, messageTypeId, textContent, mediaUrl, msgId || null]
      );
    } catch (e) {
      console.error('Lỗi khi lưu tin nhắn:', e.message);
    }
  }

  // --- 1. ĐỒNG BỘ LỊCH SỬ TIN NHẮN GẦN NHẤT (DIALOGS) ---
  console.log('🔄 Đang đồng bộ các cuộc trò chuyện gần nhất...');
  try {
    const dialogs = await client.getDialogs({ limit: 15 });
    for (const dialog of dialogs) {
      if (!dialog.isUser) continue;
      const peer = dialog.entity;
      if (!peer || String(peer.id) === String(me.id)) continue;

      const peerId = String(peer.id);
      const peerName = [peer.firstName, peer.lastName].filter(Boolean).join(' ') || peer.username || `User ${peerId}`;

      const history = await client.getMessages(peer, { limit: 15 });
      for (const msg of history.reverse()) {
        const text = msg.message || '';
        let mediaUrl = null;
        let msgType = 1;
        if (msg.media) {
          const dl = await downloadMessageMedia(msg);
          mediaUrl = dl.mediaUrl;
          msgType = dl.messageTypeId;
        }
        await saveTelegramMessage(peerId, peerName, text, String(msg.id), Boolean(msg.out), mediaUrl, msgType);
      }
    }
    console.log('✅ Đã đồng bộ xong lịch sử tin nhắn & hình ảnh vào Web App!');
  } catch (err) {
    console.warn('Cảnh báo khi đồng bộ lịch sử:', err.message);
  }

  // --- 2. LẮNG NGHE TIN NHẮN MỚI THỜI GIAN THỰC ---
  client.addEventHandler(async (event) => {
    try {
      const message = event.message;
      // Kiểm tra xem kênh này có còn đang active và đúng tài khoản hiện tại không
      const chCheck = await pool.query(
        `SELECT is_active, external_channel_id FROM channels WHERE id = $1`,
        [channelId]
      );
      if (chCheck.rows.length === 0 || !chCheck.rows[0].is_active || chCheck.rows[0].external_channel_id !== String(me.id)) {
        console.log(`⚠️ Phiên Telegram này (ID: ${me.id}) không còn là tài khoản hoạt động. Bỏ qua tin nhắn.`);
        return;
      }

      const sender = await message.getSender();
      if (!sender || !sender.id) return;

      const isOut = Boolean(message.out);
      const peerId = String(sender.id);
      const peerName = [sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.username || `User ${peerId}`;
      const textContent = message.message || '';
      
      let mediaUrl = null;
      let msgType = 1;
      if (message.media) {
        const dl = await downloadMessageMedia(message);
        mediaUrl = dl.mediaUrl;
        msgType = dl.messageTypeId;
      }

      console.log(`📥 [${isOut ? 'Bạn gửi' : 'Khách gửi'}] (${peerName}): ${textContent || '[Media file]'}`);
      await saveTelegramMessage(peerId, peerName, textContent, String(message.id), isOut, mediaUrl, msgType);
    } catch (err) {
      console.error('Lỗi nhận tin nhắn live:', err.message);
    }
  }, new NewMessage({}));

  // --- 2.1 LẮNG NGHE XÓA / THU HỒI TIN NHẮN TELEGRAM ---
  const { Raw } = require('telegram/events');
  client.addEventHandler(async (update) => {
    try {
      if (!update) return;

      // Xóa tin nhắn
      if ((update.className === 'UpdateDeleteMessages' || update.className === 'UpdateDeleteChannelMessages') && Array.isArray(update.messages)) {
        for (const delId of update.messages) {
          console.log(`🗑️ [Telegram] Xóa / thu hồi tin nhắn: ID ${delId}`);
          await pool.query(`DELETE FROM messages WHERE external_message_id = $1`, [String(delId)]);
        }
      }

      // Khách đang soạn tin nhắn
      if (update.className === 'UpdateUserTyping' || update.className === 'UpdateChatUserTyping') {
        const peerUserId = String(update.userId || update.fromId?.userId || '');
        if (peerUserId) {
          await pool.query(`
            UPDATE conversations 
            SET is_typing = true, typing_updated_at = CURRENT_TIMESTAMP 
            WHERE channel_id = $1 AND contact_id = (SELECT id FROM contacts WHERE channel_id = $1 AND external_user_id = $2 LIMIT 1)
          `, [channelId, peerUserId]);
        }
      }
    } catch (delErr) {
      console.error('Lỗi xử lý sự kiện Telegram:', delErr.message);
    }
  }, new Raw({}));

  // --- 3. TỰ ĐỘNG GỬI TIN NHẮN VÀ TYPING TỪ WEB APP SANG TELEGRAM ---
  setInterval(async () => {
    try {
      // 3.1 Gửi typing khi Agent đang gõ trên Web
      const typingRows = await pool.query(`
        SELECT external_user_id, is_typing 
        FROM outbound_typing 
        WHERE channel_id = $1 AND updated_at > CURRENT_TIMESTAMP - INTERVAL '5 seconds'
      `, [channelId]);

      for (const tRow of typingRows.rows) {
        if (tRow.is_typing && tRow.external_user_id) {
          try {
            const inputPeer = await client.getInputEntity(tRow.external_user_id);
            await client.invoke(new Api.messages.SetTyping({
              peer: inputPeer,
              action: new Api.SendMessageTypingAction()
            }));
          } catch (e) {}
        }
      }

      // 3.2 Gửi tin nhắn chưa gửi
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
          console.log(`📤 Đang gửi từ Web App tới Telegram (User ID: ${row.external_user_id}): "${row.content}"`);
          try {
            const inputPeer = await client.getInputEntity(row.external_user_id);
            const sentMsg = await client.sendMessage(inputPeer, {
              message: row.content
            });
            
            await pool.query(`
              UPDATE messages 
              SET external_message_id = $1, id__messages_statuses = 3 
              WHERE id = $2
            `, [String(sentMsg.id), row.id]);
            console.log(`✅ Gửi tin nhắn thành công qua Telegram!`);
          } catch (sendErr) {
            console.error('Lỗi gửi Telegram qua MTProto:', sendErr.message);
            await pool.query(`UPDATE messages SET external_message_id = 'ERR' WHERE id = $1`, [row.id]);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }, 1000);

  console.log('📡 Đang lắng nghe & đồng bộ 2 chiều thời gian thực...');
}

main().catch(err => {
  console.error('❌ Lỗi:', err);
});
