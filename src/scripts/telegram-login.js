const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.ENV'), quiet: true });

const apiId = 38802670;
const apiHash = '245dbf5bc61c0590b473fb31747bb198';
const stringSession = new StringSession(process.env.TELEGRAM_USER_SESSION || '');

async function main() {
  console.log('====================================================');
  console.log('🤖 BẮT ĐẦU ĐĂNG NHẬP TELEGRAM TÀI KHOẢN CÁ NHÂN 🤖');
  console.log('====================================================');

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text('📱 Nhập số điện thoại Telegram của bạn (Ví dụ: +84912345678): '),
    password: async () => await input.password('🔒 Nhập mật khẩu 2FA (nếu có, nếu không thì nhấn Enter): '),
    phoneCode: async () => await input.text('🔑 Nhập mã xác nhận OTP Telegram vừa gửi về ứng dụng của bạn: '),
    onError: (err) => console.error('Lỗi đăng nhập:', err),
  });

  console.log('\n🎉 ĐĂNG NHẬP THÀNH CÔNG TÀI KHOẢN TELEGRAM!');
  const sessionString = client.session.save();

  // Update .ENV
  const envPath = path.resolve(__dirname, '../../.ENV');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  
  if (envContent.includes('TELEGRAM_USER_SESSION=')) {
    envContent = envContent.replace(/TELEGRAM_USER_SESSION=.*/, `TELEGRAM_USER_SESSION=${sessionString}`);
  } else {
    envContent += `\nTELEGRAM_API_ID=${apiId}\nTELEGRAM_API_HASH=${apiHash}\nTELEGRAM_USER_SESSION=${sessionString}\n`;
  }
  
  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log('💾 Đã lưu chuỗi phiên đăng nhập (Session) vào file .ENV thành công.');
  console.log('👉 Từ nay bạn sẽ không cần phải nhập lại OTP nữa!');

  const me = await client.getMe();
  console.log(`👤 Tên tài khoản: ${me.firstName} ${me.lastName || ''} (@${me.username || 'không có username'})`);
  console.log(`🆔 Telegram User ID: ${me.id}`);

  await client.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
