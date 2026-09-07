const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.ENV'), quiet: true });

const pageId = process.env.FACEBOOK_PAGE_ID || '';
const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';
const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || 'terax_secret_token';

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'terax_database',
  user: process.env.DB_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'postgres',
  options: '-c search_path=notification',
});

async function main() {
  console.log('====================================================');
  console.log('🔵 ĐỒNG BỘ TIN NHẮN FACEBOOK MESSENGER (META GRAPH API)');
  console.log('====================================================');

  try {
    const client = await pool.connect();
    console.log('✅ Kết nối cơ sở dữ liệu PostgreSQL thành công!');
    client.release();
  } catch (err) {
    console.error('❌ Không thể kết nối cơ sở dữ liệu:', err.message);
    process.exit(1);
  }

  if (!pageAccessToken) {
    console.log('\n⚠️ Chưa tìm thấy FACEBOOK_PAGE_ACCESS_TOKEN trong .ENV!');
    console.log('👉 Vui lòng điền FACEBOOK_PAGE_ACCESS_TOKEN vào file .ENV');
    return;
  }

  console.log('🚀 Đang kiểm tra kết nối với Facebook Graph API...');
  let channelId;
  let pageInfo;

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,picture&access_token=${pageAccessToken}`);
    pageInfo = await res.json();

    if (pageInfo.error) {
      console.error('❌ Token Facebook không hợp lệ:', pageInfo.error.message);
      return;
    }

    console.log(`✅ Kết nối Fanpage thành công! Tên Page: "${pageInfo.name}" (ID: ${pageInfo.id})`);

    // Tự động đăng ký Webhook cho Fanpage
    try {
      const subRes = await fetch(`https://graph.facebook.com/v19.0/${pageInfo.id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_reads,message_deliveries&access_token=${pageAccessToken}`, {
        method: 'POST'
      });
      const subData = await subRes.json();
      if (subData.success) {
        console.log('🔗 Đã tự động kích hoạt nhận sự kiện tin nhắn (Subscribed Webhooks) cho Fanpage!');
      }
    } catch (subErr) {
      // Ignore
    }

    // Đảm bảo kênh Facebook đã tồn tại trong CSDL
    let channelRes = await pool.query(
      `SELECT id FROM channels WHERE id__channels_platforms = 1 AND external_channel_id = $1 LIMIT 1`,
      [String(pageInfo.id)]
    );

    const avatarUrl = pageInfo.picture?.data?.url || 'https://img.icons8.com/color/512/facebook-new.png';

    if (channelRes.rows.length === 0) {
      const newChan = await pool.query(
        `INSERT INTO channels (id__channels_platforms, name, external_channel_id, avatar_url, is_active)
         VALUES (1, $1, $2, $3, true)
         RETURNING id`,
        [pageInfo.name, String(pageInfo.id), avatarUrl]
      );
      channelId = newChan.rows[0].id;
    } else {
      channelId = channelRes.rows[0].id;
      await pool.query(
        `UPDATE channels SET name = $1, avatar_url = $2, is_active = true WHERE id = $3`,
        [pageInfo.name, avatarUrl, channelId]
      );
    }

    console.log(`📡 Kênh Facebook ID #${channelId} đã sẵn sàng nhận và đồng bộ tin nhắn!`);
  } catch (e) {
    console.error('Lỗi khi kết nối Facebook Graph API:', e.message);
    return;
  }

  // Hàm kéo và đồng bộ tin nhắn mới nhất
  async function syncConversations() {
    try {
      const convsRes = await fetch(
        `https://graph.facebook.com/v19.0/me/conversations?fields=participants,updated_time,messages{id,message,created_time,from,to,attachments}&limit=15&access_token=${pageAccessToken}`
      );
      const convsData = await convsRes.json();

      if (convsData.data && convsData.data.length > 0) {
        for (const conv of convsData.data) {
          const customer = conv.participants?.data?.find(p => String(p.id) !== String(pageInfo.id));
          if (!customer) continue;

          // 1. Lưu Contact
          let contactRes = await pool.query(
            `SELECT id FROM contacts WHERE channel_id = $1 AND external_user_id = $2`,
            [channelId, String(customer.id)]
          );
          let contactId;
          if (contactRes.rows.length === 0) {
            const newContact = await pool.query(
              `INSERT INTO contacts (channel_id, external_user_id, name, avatar_url, metadata)
               VALUES ($1, $2, $3, $4, '{}')
               RETURNING id`,
              [channelId, String(customer.id), customer.name || `Khách FB #${customer.id}`, `https://api.dicebear.com/7.x/adventurer/svg?seed=${customer.id}`]
            );
            contactId = newContact.rows[0].id;
          } else {
            contactId = contactRes.rows[0].id;
          }

          // 2. Lưu Conversation
          let dbConvRes = await pool.query(
            `SELECT id FROM conversations WHERE channel_id = $1 AND contact_id = $2`,
            [channelId, contactId]
          );
          let dbConvId;
          let latestMsgText = 'Hội thoại Facebook';

          if (conv.messages?.data && conv.messages.data.length > 0) {
            latestMsgText = conv.messages.data[0].message || '[Hình ảnh/Tập tin]';
          }

          if (dbConvRes.rows.length === 0) {
            const newConv = await pool.query(
              `INSERT INTO conversations (channel_id, contact_id, id__conversations_statuses, last_message_preview, last_message_at, unread_count)
               VALUES ($1, $2, 1, $3, CURRENT_TIMESTAMP, 0)
               RETURNING id`,
              [channelId, contactId, latestMsgText]
            );
            dbConvId = newConv.rows[0].id;
          } else {
            dbConvId = dbConvRes.rows[0].id;
          }

          // 3. Lưu Messages
          if (conv.messages?.data) {
            for (const msg of conv.messages.data) {
              const isOutgoing = String(msg.from?.id) === String(pageInfo.id);
              const senderTypeId = isOutgoing ? 2 : 1;
              let textContent = msg.message || '';
              let mediaUrl = null;
              let messageTypeId = 1;

              if (msg.attachments?.data && msg.attachments.data.length > 0) {
                const att = msg.attachments.data[0];
                mediaUrl = att.image_data?.url || att.file_url || null;
                messageTypeId = att.image_data ? 2 : 4;
                if (!textContent) textContent = att.image_data ? '[Hình ảnh]' : '[Tập tin]';
              }

              if (!textContent && !mediaUrl) continue;

              // Check trùng tin nhắn
              const dup = await pool.query(
                `SELECT id FROM messages WHERE conversation_id = $1 AND external_message_id = $2`,
                [dbConvId, String(msg.id)]
              );
              if (dup.rows.length === 0) {
                await pool.query(
                  `INSERT INTO messages (conversation_id, id__messages_sender_types, id__messages_types, content, media_url, external_message_id, id__messages_statuses, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6, 3, $7)`,
                  [dbConvId, senderTypeId, messageTypeId, textContent, mediaUrl, String(msg.id), new Date(msg.created_time)]
                );
                console.log(`📩 Đã đồng bộ tin nhắn Facebook mới: "${textContent}" từ ${customer.name || customer.id}`);
              }
            }
          }
        }
      }
    } catch (syncErr) {
      // Ignore polling errors
    }
  }

  // Chạy đồng bộ lần đầu
  await syncConversations();

  console.log('\n🟢 Đang chạy dịch vụ đồng bộ tin nhắn Facebook tự động (Real-time polling & Webhook listener)...');
  console.log('👉 Mở trình duyệt vào http://localhost:3000/inbox để theo dõi tin nhắn.');

  // Vòng lặp định kỳ kiểm tra tin nhắn mới mỗi 3 giây
  setInterval(syncConversations, 3000);
}

main();
