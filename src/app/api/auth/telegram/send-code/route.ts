import { TelegramClient, sessions } from 'telegram';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập số điện thoại hợp lệ (Ví dụ: +84912345678)' },
        { status: 400 }
      );
    }

    const apiId = Number(process.env.TELEGRAM_API_ID) || 38802670;
    const apiHash = process.env.TELEGRAM_API_HASH || '245dbf5bc61c0590b473fb31747bb198';

    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');

    const client = new TelegramClient(new sessions.StringSession(''), apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.connect();

    const sendCodeResult = await client.sendCode(
      { apiId, apiHash },
      cleanPhone
    );

    const tempSession = client.session.save();
    await client.disconnect();

    return NextResponse.json({
      success: true,
      message: 'Mã xác nhận OTP đã được gửi đến Telegram của bạn.',
      phoneCodeHash: sendCodeResult.phoneCodeHash,
      isCodeViaApp: sendCodeResult.isCodeViaApp,
      tempSession: tempSession as unknown as string,
    });
  } catch (error: any) {
    console.error('Telegram sendCode error:', error);
    const errorMessage = error?.errorMessage || error?.message || 'Không thể gửi mã OTP. Vui lòng kiểm tra lại số điện thoại.';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
