import { NextResponse } from 'next/server';
import { query } from '@/config/database';
import os from 'os';
import QRCode from 'qrcode';

let currentFacebookSession: {
  sessionId: string;
  status: 'idle' | 'waiting_scan' | 'scanned' | 'completed' | 'failed';
  authUrl: string;
  qrImage: string;
  page: {
    id: string;
    name: string;
    avatarUrl?: string;
  } | null;
  error?: string | null;
} = {
  sessionId: '',
  status: 'idle',
  authUrl: '',
  qrImage: '',
  page: null,
};

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.') || iface.address.startsWith('172.')) {
          return iface.address;
        }
      }
    }
  }
  return 'localhost';
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: currentFacebookSession,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'generate';

    if (action === 'generate') {
      const sessionId = `fb-sess-${Date.now()}`;
      const localIp = getLocalIpAddress();
      const pageId = body.pageId || process.env.FACEBOOK_PAGE_ID || '1294794130375995';
      const pageName = body.pageName || 'Fanpage Giày Nam Terax Official';
      const encodedName = encodeURIComponent(pageName);
      
      // Đường dẫn mở trang phê duyệt trên điện thoại khi quét mã QR
      const authUrl = `http://${localIp}:3000/auth/facebook?session=${sessionId}&pageId=${pageId}&pageName=${encodedName}`;
      
      // Tạo mã QR Base64 trực tiếp trên máy chủ cục bộ (Không phụ thuộc mạng ngoài)
      const qrImage = await QRCode.toDataURL(authUrl, {
        width: 360,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });

      currentFacebookSession = {
        sessionId,
        status: 'waiting_scan',
        authUrl,
        qrImage,
        page: null,
      };

      return NextResponse.json({
        success: true,
        data: currentFacebookSession,
      });
    }

    if (action === 'scanned') {
      currentFacebookSession.status = 'scanned';
      return NextResponse.json({
        success: true,
        data: currentFacebookSession,
      });
    }

    if (action === 'simulate_approve' || action === 'confirm') {
      // Phê duyệt thành công Fanpage từ điện thoại
      const pageName = body.pageName || 'Fanpage Giày Nam Terax Official';
      const pageId = body.pageId || process.env.FACEBOOK_PAGE_ID || '1294794130375995';
      const avatarUrl = 'https://img.icons8.com/color/512/facebook-new.png';

      currentFacebookSession.status = 'completed';
      currentFacebookSession.page = {
        id: pageId,
        name: pageName,
        avatarUrl,
      };

      // Cập nhật vào Cơ sở dữ liệu nếu có kết nối DB
      try {
        let platRes = await query(`SELECT id FROM channels_platforms WHERE name = 'facebook'`);
        let platformId = platRes.rows.length > 0 ? platRes.rows[0].id : 1;

        let chanRes = await query(
          `SELECT id FROM channels WHERE id__channels_platforms = $1 AND external_channel_id = $2 LIMIT 1`,
          [platformId, pageId]
        );

        if (chanRes.rows.length === 0) {
          await query(`
            INSERT INTO channels (id__channels_platforms, name, external_channel_id, avatar_url, is_active)
            VALUES ($1, $2, $3, $4, true)
          `, [platformId, pageName, pageId, avatarUrl]);
        } else {
          await query(`
            UPDATE channels 
            SET name = $1, avatar_url = $2, is_active = true, updated_at = NOW()
            WHERE id = $3
          `, [pageName, avatarUrl, chanRes.rows[0].id]);
        }
      } catch (dbErr: any) {
        console.warn('DB Facebook channel update error:', dbErr.message);
      }

      return NextResponse.json({
        success: true,
        data: currentFacebookSession,
      });
    }

    return NextResponse.json({ success: false, error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Facebook QR API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Không thể tạo mã QR Facebook' },
      { status: 500 }
    );
  }
}
