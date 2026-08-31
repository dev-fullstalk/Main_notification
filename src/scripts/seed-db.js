const { Client, Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function seed() {
  console.log('--- 1. Checking & creating database terax_database ---');
  const rootClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });
  await rootClient.connect();

  const checkDb = await rootClient.query("SELECT 1 FROM pg_database WHERE datname = 'terax_database'");
  if (checkDb.rows.length === 0) {
    console.log("Database 'terax_database' does not exist. Creating...");
    await rootClient.query('CREATE DATABASE terax_database');
    console.log("Database 'terax_database' created successfully.");
  } else {
    console.log("Database 'terax_database' already exists.");
  }
  await rootClient.end();

  // Create .ENV file
  const envContent = `DB_HOST=127.0.0.1\nDB_PORT=5432\nDB_NAME=terax_database\nDB_USER=postgres\nDB_PASSWORD=postgres\n`;
  fs.writeFileSync(path.resolve(__dirname, '../../.ENV'), envContent, 'utf-8');
  console.log('--- 2. Created .ENV with active PostgreSQL credentials ---');

  // Connect to terax_database
  const dbPool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'terax_database'
  });

  const client = await dbPool.connect();

  console.log('--- 3. Running init.sql ---');
  await client.query('DROP SCHEMA IF EXISTS notification CASCADE;');
  const initSqlPath = path.resolve(__dirname, '../../init.sql');
  const initSql = fs.readFileSync(initSqlPath, 'utf-8');
  await client.query(initSql);
  console.log('init.sql executed successfully.');

  console.log('--- 4. Seeding sample users, channels, contacts, conversations, and messages ---');
  
  // 1. Users
  await client.query(`
    INSERT INTO notification.users (id, name, email, password_hash, id__users_roles, avatar_url, is_active)
    VALUES 
      (1, 'Bùi Việt Hùng', 'hung.bv@terax.vn', 'hash123', 1, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', true),
      (2, 'Nguyễn Thị Lan', 'lan.nt@terax.vn', 'hash123', 3, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', true),
      (3, 'Trần Minh Đức', 'duc.tm@terax.vn', 'hash123', 3, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', true)
    ON CONFLICT (email) DO NOTHING;
  `);

  // 2. Channels
  await client.query(`
    INSERT INTO notification.channels (id, id__channels_platforms, name, external_channel_id, access_token, avatar_url, is_active)
    VALUES 
      (1, 1, 'Fanpage Giày Nam Terax', 'fb-page-123', 'mock_fb_token', 'https://img.icons8.com/color/512/facebook-new.png', true),
      (2, 2, 'Zalo CSKH Terax Official', 'zalo-oa-456', 'mock_zalo_token', 'https://img.icons8.com/color/512/zalo.png', true),
      (3, 3, 'Telegram CSKH Terax', 'tele-bot-789', 'mock_tele_token', 'https://img.icons8.com/color/512/telegram-app.png', true),
      (4, 4, 'TikTok Shop Terax Fashion', 'tiktok-shop-999', 'mock_tiktok_token', 'https://img.icons8.com/color/512/tiktok.png', true)
    ON CONFLICT (id__channels_platforms, external_channel_id) DO NOTHING;
  `);

  // Reset sequence for channels
  await client.query(`SELECT setval('notification.channels_id_seq', (SELECT MAX(id) FROM notification.channels));`);

  // 3. Contacts
  await client.query(`
    INSERT INTO notification.contacts (id, channel_id, external_user_id, name, avatar_url, phone, email)
    VALUES 
      (101, 1, 'fb_u_101', 'Nguyễn Văn Hải', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', '0912345678', 'hai.nv@gmail.com'),
      (102, 1, 'fb_u_102', 'Trần Thị Thu Trang', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', '0987654321', 'trang.tt@gmail.com'),
      (103, 2, 'zalo_u_103', 'Lê Hoàng Nam', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150', '0901234567', 'nam.lh@gmail.com'),
      (104, 2, 'zalo_u_104', 'Phạm Minh Tuyết', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', '0934567890', 'tuyet.pm@gmail.com'),
      (105, 3, 'tele_u_105', 'Alex Nguyễn', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', '0977112233', 'alex.nguyen@t.me'),
      (106, 3, 'tele_u_106', 'Đặng Tuấn Anh', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', '0966554433', 'tuananh.dang@t.me'),
      (107, 4, 'tiktok_u_107', 'Mỹ Linh', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', '0944332211', 'mylinh.tt@gmail.com'),
      (108, 4, 'tiktok_u_108', 'Hoàng Quốc Việt', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', '0922334455', 'viet.hq@gmail.com')
    ON CONFLICT (channel_id, external_user_id) DO NOTHING;
  `);

  await client.query(`SELECT setval('notification.contacts_id_seq', (SELECT MAX(id) FROM notification.contacts));`);

  // 4. Conversations
  await client.query(`
    INSERT INTO notification.conversations (id, channel_id, contact_id, assigned_user_id, id__conversations_statuses, last_message_preview, last_message_at, unread_count)
    VALUES 
      (201, 1, 101, 1, 1, 'Shop còn size 42 màu đen của mẫu Sneaker Pro không ạ?', CURRENT_TIMESTAMP, 2),
      (202, 1, 102, 2, 2, 'Mình đã gửi ảnh bill chuyển khoản rồi nhé, kiểm tra giúp mình.', CURRENT_TIMESTAMP, 0),
      (203, 2, 103, 1, 1, 'Giao cho mình giờ hành chính ở 123 Nguyễn Trãi nhé.', CURRENT_TIMESTAMP, 1),
      (204, 2, 104, NULL, 1, 'Tư vấn giúp em size giày cho nữ cao 1m60 nặng 50kg mang vừa size bao nhiêu ạ?', CURRENT_TIMESTAMP, 3),
      (205, 3, 105, 1, 3, 'Cảm ơn shop nhiều, giày đi rất êm và vừa chân nhé!', CURRENT_TIMESTAMP, 0),
      (206, 3, 106, 3, 1, 'Mã giảm giá cho khách hàng mới sử dụng thế nào vậy admin?', CURRENT_TIMESTAMP, 1),
      (207, 4, 107, NULL, 1, 'Cho em hỏi mẫu này bao giờ thì về thêm hàng ạ?', CURRENT_TIMESTAMP, 1),
      (208, 4, 108, 2, 4, 'Đã nhận được hàng, sản phẩm ok.', CURRENT_TIMESTAMP, 0)
    ON CONFLICT (channel_id, contact_id) DO NOTHING;
  `);

  await client.query(`SELECT setval('notification.conversations_id_seq', (SELECT MAX(id) FROM notification.conversations));`);

  // 5. Messages
  await client.query(`
    INSERT INTO notification.messages (conversation_id, id__messages_sender_types, sender_user_id, id__messages_types, content, media_url, id__messages_statuses, created_at)
    VALUES 
      -- Conv 206 (Telegram - Đặng Tuấn Anh)
      (206, 1, NULL, 1, 'Xin chào admin! Em là khách hàng mới tham gia nhóm.', NULL, 3, CURRENT_TIMESTAMP - interval '10 minutes'),
      (206, 2, 3, 1, 'Chào Tuấn Anh nhé! Chào mừng bạn đến với kênh hỗ trợ khách hàng của Terax.', NULL, 3, CURRENT_TIMESTAMP - interval '8 minutes'),
      (206, 1, NULL, 1, 'Mã giảm giá cho khách hàng mới sử dụng thế nào vậy admin?', NULL, 3, CURRENT_TIMESTAMP - interval '2 minutes'),

      -- Conv 205 (Telegram - Alex Nguyễn)
      (205, 1, NULL, 1, 'Shop ơi đơn hàng #TRX-9982 của mình đã tới bưu cục chưa?', NULL, 3, CURRENT_TIMESTAMP - interval '2 hours'),
      (205, 2, 1, 1, 'Dạ chào anh Alex! Đơn hàng của anh đang trên đường giao, shipper sẽ liên hệ trước khi đến khoảng 15p ạ.', NULL, 3, CURRENT_TIMESTAMP - interval '1 hour'),
      (205, 1, NULL, 1, 'Cảm ơn shop nhiều, giày đi rất êm và vừa chân nhé!', NULL, 3, CURRENT_TIMESTAMP - interval '30 minutes'),

      -- Conv 201 (Facebook - Nguyễn Văn Hải)
      (201, 1, NULL, 1, 'Chào shop, mình quan tâm đến mẫu Sneaker Pro bên bạn.', NULL, 3, CURRENT_TIMESTAMP - interval '20 minutes'),
      (201, 2, 2, 1, 'Chào anh Hải ạ! Mẫu Sneaker Pro bên em đang là mẫu bán chạy nhất đấy ạ.', NULL, 3, CURRENT_TIMESTAMP - interval '15 minutes'),
      (201, 1, NULL, 1, 'Shop còn size 42 màu đen của mẫu Sneaker Pro không ạ?', NULL, 3, CURRENT_TIMESTAMP - interval '5 minutes')
    ON CONFLICT DO NOTHING;
  `);

  client.release();
  await dbPool.end();

  console.log('✅ SEED DATABASE HOÀN TẤT THÀNH CÔNG 100%!');
}

seed().catch(err => {
  console.error('❌ Lỗi khi seed DB:', err);
  process.exit(1);
});
