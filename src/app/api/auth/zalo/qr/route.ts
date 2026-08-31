import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { query } from '@/config/database';

let currentZaloQR: {
  image: string | null;
  code: string | null;
  status: 'idle' | 'generating' | 'scanned' | 'completed' | 'failed';
  user: any | null;
  error?: string | null;
} = {
  image: null,
  code: null,
  status: 'idle',
  user: null,
};

export async function GET() {
  const authDir = path.resolve(process.cwd(), 'zalo_auth');
  const credsPath = path.join(authDir, 'credentials.json');
  const isExistingAuth = fs.existsSync(credsPath);

  return NextResponse.json({
    success: true,
    data: {
      ...currentZaloQR,
      hasSavedSession: isExistingAuth,
    },
  });
}

export async function POST(request: Request) {
  try {
    const authDir = path.resolve(process.cwd(), 'zalo_auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    const { Zalo, LoginQRCallbackEventType } = await import('zca-js');

    const zalo = new Zalo({
      selfListen: false,
      checkUpdate: false,
    });

    currentZaloQR = {
      image: null,
      code: null,
      status: 'generating',
      user: null,
    };

    // Khởi chạy QR Login không chặn (async event-driven)
    zalo
      .loginQR(
        {
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        },
        async (event: any) => {
          if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
            currentZaloQR.image = event.data.image;
            currentZaloQR.code = event.data.code;
            currentZaloQR.status = 'idle';
          } else if (event.type === LoginQRCallbackEventType.QRCodeScanned) {
            currentZaloQR.status = 'scanned';
            if (event.data) {
              currentZaloQR.user = {
                name: event.data.display_name,
                avatar: event.data.avatar,
              };
            }
          } else if (event.type === LoginQRCallbackEventType.GotLoginInfo) {
            currentZaloQR.status = 'completed';
            // Lưu credentials
            const credsPath = path.join(authDir, 'credentials.json');
            fs.writeFileSync(credsPath, JSON.stringify(event.data, null, 2), 'utf-8');

            // Cập nhật Database
            try {
              let platRes = await query(`SELECT id FROM channels_platforms WHERE name = 'zalo'`);
              let platformId = platRes.rows.length > 0 ? platRes.rows[0].id : 2;

              const userName = currentZaloQR.user?.name || 'Zalo Sếp';
              const zaloUserId = event.data?.userId || event.data?.uid || `zalo-acc-${Date.now()}`;
              const userAvatar = currentZaloQR.user?.avatar || 'https://img.icons8.com/color/512/zalo.png';

              // Check if this specific Zalo user already exists
              let chanRes = await query(
                `SELECT id FROM channels WHERE id__channels_platforms = $1 AND external_channel_id = $2 LIMIT 1`,
                [platformId, String(zaloUserId)]
              );

              if (chanRes.rows.length === 0) {
                await query(`
                  INSERT INTO channels (id__channels_platforms, name, external_channel_id, avatar_url, is_active)
                  VALUES ($1, $2, $3, $4, true)
                `, [platformId, `Zalo: ${userName}`, String(zaloUserId), userAvatar]);
              } else {
                await query(`
                  UPDATE channels 
                  SET name = $1, avatar_url = $2, is_active = true, updated_at = NOW()
                  WHERE id = $3
                `, [`Zalo: ${userName}`, userAvatar, chanRes.rows[0].id]);
              }
            } catch (dbErr: any) {
              console.warn('DB Zalo channel update error:', dbErr.message);
            }
          }
        }
      )
      .catch((err: any) => {
        console.error('Zalo QR error:', err);
        currentZaloQR.status = 'failed';
        currentZaloQR.error = err.message || 'Lỗi tạo mã QR Zalo';
      });

    // Đợi 2.5s để QR được tạo từ server Zalo
    await new Promise((r) => setTimeout(r, 2500));

    return NextResponse.json({
      success: true,
      data: currentZaloQR,
    });
  } catch (error: any) {
    console.error('Zalo QR API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Không thể tạo mã QR Zalo' },
      { status: 500 }
    );
  }
}
