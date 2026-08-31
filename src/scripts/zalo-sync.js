const { Zalo, LoginQRCallbackEventType } = require('zca-js');
const qrcode = require('qrcode-terminal');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.ENV') });

const authDir = path.resolve(__dirname, '../../zalo_auth');
const credsPath = path.join(authDir, 'credentials.json');
const uploadDir = path.resolve(__dirname, '../../public/uploads/zalo');

if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}
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

let apiInstance;
let channelId;

async function initChannel(zaloUid, zaloName) {
  // Lấy id platform zalo (thường là 2)
  let platRes = await pool.query(`SELECT id FROM channels_platforms WHERE name = 'zalo'`);
  let platformId = platRes.rows.length > 0 ? platRes.rows[0].id : 2;

  const currentZaloId = String(zaloUid || 'zalo-main');

  // Tìm channel có đúng UID này hoặc channel Zalo đang active
  let chanRes = await pool.query(
    `SELECT id, external_channel_id FROM channels WHERE id__channels_platforms = $1 AND (external_channel_id = $2 OR is_active = true) ORDER BY is_active DESC, updated_at DESC LIMIT 1`,
    [platformId, currentZaloId]
  );

  if (chanRes.rows.length === 0) {
    const newChan = await pool.query(`
      INSERT INTO channels (id__channels_platforms, name, external_channel_id, avatar_url, is_active)
      VALUES ($1, $2, $3, 'https://img.icons8.com/color/512/zalo.png', true)
      RETURNING id
    `, [platformId, zaloName ? `Zalo: ${zaloName}` : 'Zalo Cá Nhân', currentZaloId]);
    channelId = newChan.rows[0].id;
  } else {
    channelId = chanRes.rows[0].id;
    await pool.query(
      `UPDATE channels SET name = $1, external_channel_id = $2, is_active = true, updated_at = NOW() WHERE id = $3`,
      [zaloName ? `Zalo: ${zaloName}` : 'Zalo Cá Nhân', currentZaloId, channelId]
    );
  }
  console.log(`✅ Đã liên kết Zalo Channel ID trong DB: ${channelId} (UID: ${currentZaloId})`);
}

async function saveZaloMessage(senderId, senderName, textContent, msgId, isOutgoing, mediaUrl = null, messageTypeId = 1) {
  try {
    if (!textContent && !mediaUrl) return;

    // 1. Lưu Contact
    let contactRes = await pool.query(
      `SELECT id FROM contacts WHERE channel_id = $1 AND external_user_id = $2`,
      [channelId, senderId]
    );
    let contactId;
    if (contactRes.rows.length === 0) {
      const newContact = await pool.query(
        `INSERT INTO contacts (channel_id, external_user_id, name, phone, metadata)
         VALUES ($1, $2, $3, '', '{}')
         RETURNING id`,
        [channelId, senderId, senderName || `Zalo User ${senderId}`]
      );
      contactId = newContact.rows[0].id;
    } else {
      contactId = contactRes.rows[0].id;
      if (senderName && !senderName.startsWith('Zalo User')) {
        await pool.query(`UPDATE contacts SET name = $1 WHERE id = $2`, [senderName, contactId]);
      }
    }

    // 2. Lưu Conversation
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

    // 3. Kiểm tra trùng Message
    if (msgId) {
      const dup = await pool.query(
        `SELECT id FROM messages WHERE conversation_id = $1 AND external_message_id = $2`,
        [convId, msgId]
      );
      if (dup.rows.length > 0) return;
    }

    const senderTypeId = isOutgoing ? 2 : 1;
    await pool.query(
      `INSERT INTO messages (conversation_id, id__messages_sender_types, id__messages_types, content, media_url, external_message_id, id__messages_statuses)
       VALUES ($1, $2, $3, $4, $5, $6, 3)`,
      [convId, senderTypeId, messageTypeId, textContent, mediaUrl, msgId || null]
    );
  } catch (err) {
    console.error('Lỗi lưu tin nhắn Zalo:', err.message);
  }
}

async function startZalo() {
  console.log('🚀 Khởi tạo kết nối Zalo Cá Nhân...');
  const zalo = new Zalo({ selfListen: true, logging: false });

  // Kiểm tra xem đã có session credentials đã lưu trước đó chưa
  if (fs.existsSync(credsPath)) {
    try {
      console.log('🔑 Tìm thấy phiên đăng nhập cũ, đang kết nối lại...');
      const rawCreds = fs.readFileSync(credsPath, 'utf8');
      const credentials = JSON.parse(rawCreds);
      apiInstance = await zalo.login(credentials);
      console.log('✅ Đăng nhập Zalo thành công từ phiên lưu sẵn!');
    } catch (e) {
      console.warn('⚠️ Phiên đăng nhập Zalo cũ đã hết hạn hoặc không hợp lệ. Sẽ tạo mã QR mới...');
      fs.unlinkSync(credsPath);
      apiInstance = null;
    }
  }

  // Nếu chưa có phiên đăng nhập, không tự động bật mã QR làm gián đoạn người dùng
  if (!apiInstance) {
    console.log('ℹ️ Chưa có phiên đăng nhập Zalo lưu sẵn. Vui lòng vào giao diện Web và bấm "Ấn để tạo mã QR" khi muốn liên kết.');
    return;
  }

  // Khởi tạo channel trong DB
  const ownId = apiInstance.getOwnId ? apiInstance.getOwnId() : 'zalo-user';
  let displayName = 'Zalo Account';
  try {
    const accInfo = await apiInstance.fetchAccountInfo();
    if (accInfo && accInfo.data && accInfo.data.name) {
      displayName = accInfo.data.name;
    }
  } catch (e) {}

  await initChannel(ownId, displayName);
  console.log(`👤 Tài khoản Zalo: ${displayName} (ID: ${ownId})`);

  // --- 1. LẮNG NGHE TIN NHẮN MỚI THỜI GIAN THỰC ---
  apiInstance.listener.on('message', async (msg) => {
    try {
      if (!msg) return;

      const chCheck = await pool.query(`SELECT is_active, external_channel_id FROM channels WHERE id = $1`, [channelId]);
      if (chCheck.rows.length === 0) {
        return;
      }
      if (!chCheck.rows[0].is_active) {
        await pool.query(`UPDATE channels SET is_active = true WHERE id = $1`, [channelId]);
      }

      const isSelf = Boolean(msg.isSelf);
      const peerId = String(msg.threadId);
      const data = msg.data || {};
      const peerName = isSelf ? `Zalo User ${peerId}` : (data.dName || `Zalo User ${peerId}`);
      let textContent = '';
      let mediaUrl = null;
      let msgTypeId = 1;

      if (typeof data.content === 'string') {
        textContent = data.content;
      } else if (data.content && typeof data.content === 'object') {
        if (data.content.title) {
          textContent = data.content.title;
        } else if (data.content.href || data.content.thumb) {
          mediaUrl = data.content.href || data.content.thumb;
          textContent = '[Hình ảnh/Liên kết]';
          msgTypeId = 2;
        } else {
          textContent = JSON.stringify(data.content);
        }
      }

      console.log(`📥 [Zalo] ${isSelf ? 'Bạn gửi' : 'Khách gửi'} (${peerName}): ${textContent}`);
      await saveZaloMessage(peerId, peerName, textContent, String(data.msgId || Date.now()), isSelf, mediaUrl, msgTypeId);
    } catch (err) {
      console.error('Lỗi nhận tin nhắn Zalo live:', err.message);
    }
  });

  // --- 1.1 LẮNG NGHE THU HỒI / XÓA TIN NHẮN ZALO ---
  apiInstance.listener.on('undo', async (undo) => {
    try {
      if (!undo || !undo.data) return;
      const msgId = String(undo.data.msgId || undo.data.content?.globalMsgId || undo.data.content?.cliMsgId || '');
      if (msgId) {
        console.log(`🗑️ [Zalo] Thu hồi / xóa tin nhắn: ID ${msgId}`);
        await pool.query(`DELETE FROM messages WHERE external_message_id = $1`, [msgId]);
      }
    } catch (err) {
      console.error('Lỗi xử lý thu hồi tin Zalo:', err.message);
    }
  });

  // --- 1.2 LẮNG NGHE KHÁCH ĐANG SOẠN TIN TRÊN ZALO ---
  apiInstance.listener.on('typing', async (typing) => {
    try {
      if (!typing) return;
      const peerId = String(typing.threadId || typing.uid || '');
      if (peerId) {
        await pool.query(`
          UPDATE conversations 
          SET is_typing = true, typing_updated_at = CURRENT_TIMESTAMP 
          WHERE channel_id = $1 AND contact_id = (SELECT id FROM contacts WHERE channel_id = $1 AND external_user_id = $2 LIMIT 1)
        `, [channelId, peerId]);
      }
    } catch (e) {}
  });

  apiInstance.listener.start({ retryOnClose: true });
  console.log('📡 Đã kích hoạt lắng nghe tin nhắn Zalo 2 chiều thời gian thực!');

  // --- 2. TỰ ĐỘNG GỬI TIN NHẮN TỪ WEB APP SANG ZALO ---
  setInterval(async () => {
    try {
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
          console.log(`📤 Đang gửi từ Web App tới Zalo (User ID: ${row.external_user_id}): "${row.content}"`);
          try {
            const sendPayload = typeof row.content === 'string' ? { msg: row.content } : row.content;
            const sendResult = await apiInstance.sendMessage(
              sendPayload,
              row.external_user_id,
              0 // 0 = ThreadType.User
            );

            const sentMsgId = sendResult && sendResult.message ? String(sendResult.message.msgId) : `zalo_sent_${Date.now()}`;

            await pool.query(`
              UPDATE messages 
              SET external_message_id = $1, id__messages_statuses = 3 
              WHERE id = $2
            `, [sentMsgId, row.id]);
            console.log(`✅ Gửi tin nhắn thành công qua Zalo tới ${row.external_user_id}!`);
          } catch (sendErr) {
            console.error('Lỗi gửi tin qua Zalo API:', sendErr.message);
            // Thử lại dạng chuỗi thuần
            try {
              await apiInstance.sendMessage(row.content, row.external_user_id, 0);
              await pool.query(`UPDATE messages SET external_message_id = $1, id__messages_statuses = 3 WHERE id = $2`, [`zalo_${Date.now()}`, row.id]);
              console.log(`✅ Gửi tin nhắn fallback thành công qua Zalo!`);
            } catch (fallbackErr) {
              await pool.query(`UPDATE messages SET external_message_id = 'ERR' WHERE id = $1`, [row.id]);
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }, 1000);
}

startZalo().catch((err) => {
  console.error('❌ Lỗi khởi động Zalo Sync:', err);
});
