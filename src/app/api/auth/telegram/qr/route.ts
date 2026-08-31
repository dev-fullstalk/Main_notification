import { NextResponse } from 'next/server';
import { TelegramClient, sessions } from 'telegram';
import QRCode from 'qrcode';
import { query } from '@/config/database';

let activeTeleClient: TelegramClient | null = null;
let currentTeleQR: {
  image: string | null;
  status: 'idle' | 'generating' | 'waiting' | 'completed' | 'failed';
  user: any | null;
  error?: string | null;
} = {
  image: null,
  status: 'idle',
  user: null,
};

export async function GET() {
  return NextResponse.json({
    success: true,
    data: currentTeleQR,
  });
}

export async function POST(request: Request) {
  try {
    const apiId = Number(process.env.TELEGRAM_API_ID) || 38802670;
    const apiHash = process.env.TELEGRAM_API_HASH || '245dbf5bc61c0590b473fb31747bb198';

    if (activeTeleClient) {
      try {
        await activeTeleClient.disconnect();
      } catch (_) {}
      activeTeleClient = null;
    }

    currentTeleQR = {
      image: null,
      status: 'generating',
      user: null,
    };

    const client = new TelegramClient(new sessions.StringSession(''), apiId, apiHash, {
      connectionRetries: 5,
    });

    activeTeleClient = client;
    await client.connect();

    // Start QR sign in flow asynchronously
    client
      .signInUserWithQrCode(
        { apiId, apiHash },
        {
          qrCode: async (code) => {
            try {
              // Convert token to base64url format for tg://login
              const tokenB64 = Buffer.from(code.token).toString('base64url');
              const loginUrl = `tg://login?token=${tokenB64}`;
              const qrImage = await QRCode.toDataURL(loginUrl, {
                width: 250,
                margin: 2,
                color: {
                  dark: '#0088cc',
                  light: '#ffffff',
                },
              });

              currentTeleQR.image = qrImage;
              currentTeleQR.status = 'waiting';
            } catch (err: any) {
              console.error('Telegram QR conversion error:', err);
            }
          },
          onError: (err) => {
            console.error('Telegram QR login error:', err);
            currentTeleQR.status = 'failed';
            currentTeleQR.error = err.message || 'Lỗi đăng nhập Telegram bằng QR';
          },
        }
      )
      .then(async (user: any) => {
        if (user) {
          const sessionString = client.session.save() as unknown as string;
          const firstName = user.firstName || 'Telegram';
          const lastName = user.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim();
          const username = user.username || '';
          const teleId = String(user.id || Date.now());

          currentTeleQR.status = 'completed';
          currentTeleQR.user = {
            id: teleId,
            name: fullName,
            username,
          };

          // Save session & update DB
          try {
            let platRes = await query(`SELECT id FROM channels_platforms WHERE name = 'telegram'`);
            let platformId = platRes.rows.length > 0 ? platRes.rows[0].id : 1;

            let chanRes = await query(
              `SELECT id FROM channels WHERE id__channels_platforms = $1 AND external_channel_id = $2 LIMIT 1`,
              [platformId, teleId]
            );

            if (chanRes.rows.length === 0) {
              await query(
                `INSERT INTO channels (id__channels_platforms, name, external_channel_id, avatar_url, is_active)
                 VALUES ($1, $2, $3, $4, true)`,
                [
                  platformId,
                  `Telegram: ${fullName}${username ? ` (@${username})` : ''}`,
                  teleId,
                  'https://img.icons8.com/color/512/telegram-app.png',
                ]
              );
            } else {
              await query(
                `UPDATE channels 
                 SET name = $1, is_active = true, updated_at = NOW() 
                 WHERE id = $2`,
                [`Telegram: ${fullName}${username ? ` (@${username})` : ''}`, chanRes.rows[0].id]
              );
            }
          } catch (dbErr: any) {
            console.warn('DB update Telegram channel error:', dbErr.message);
          }
        }
      })
      .catch((err: any) => {
        console.error('Telegram signInWithQrCode error:', err);
        currentTeleQR.status = 'failed';
        currentTeleQR.error = err.message || 'Lỗi kết nối QR';
      });

    // Wait 2.5s for initial QR generation
    await new Promise((r) => setTimeout(r, 2500));

    return NextResponse.json({
      success: true,
      data: currentTeleQR,
    });
  } catch (error: any) {
    console.error('Telegram QR API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Không thể tạo mã QR Telegram' },
      { status: 500 }
    );
  }
}
