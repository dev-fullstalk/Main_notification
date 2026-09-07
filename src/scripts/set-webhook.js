const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.ENV'), quiet: true });

const host = process.env.DB_HOST || '127.0.0.1';
const port = parseInt(process.env.DB_PORT || '5433');
const database = process.env.DB_NAME || 'terax_database';
const user = process.env.DB_USER || 'admin';
const password = process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'Cpi2026!';

const pool = new Pool({
  host,
  port,
  database,
  user,
  password,
  options: '-c search_path=notification',
});

async function main() {
  const urlArg = process.argv[2];
  if (!urlArg) {
    console.error('Lỗi: Vui lòng cung cấp URL webhook của bạn (ví dụ: https://abcd.ngrok-free.app)');
    console.log('Cách chạy: node src/scripts/set-webhook.js <webhook-url>');
    process.exit(1);
  }

  // Clean the URL
  let targetUrl = urlArg.trim();
  if (targetUrl.endsWith('/')) {
    targetUrl = targetUrl.slice(0, -1);
  }
  if (!targetUrl.endsWith('/api/webhook/telegram')) {
    targetUrl = `${targetUrl}/api/webhook/telegram`;
  }

  console.log('Đang lấy access_token từ cơ sở dữ liệu...');
  const client = await pool.connect();
  const res = await client.query('SELECT access_token, name FROM channels WHERE id__channels_platforms = 3 AND is_active = true LIMIT 1');
  client.release();
  await pool.end();

  if (res.rows.length === 0) {
    console.error('Lỗi: Không tìm thấy kênh Telegram hoạt động nào trong database!');
    process.exit(1);
  }

  const { access_token, name } = res.rows[0];
  console.log(`Đã tìm thấy Bot: "${name}"`);
  console.log(`Đang cấu hình Webhook URL tới: ${targetUrl}`);

  const telegramUrl = `https://api.telegram.org/bot${access_token}/setWebhook?url=${encodeURIComponent(targetUrl)}`;
  
  const response = await fetch(telegramUrl);
  const result = await response.json();

  if (result.ok) {
    console.log('Chúc mừng! Đã thiết lập Webhook Telegram thành công!');
    console.log('Chi tiết phản hồi từ Telegram:', result);
  } else {
    console.error('Lỗi thiết lập webhook:', result.description);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
