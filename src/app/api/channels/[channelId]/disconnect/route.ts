import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { query } from '@/config/database';

interface RouteParams {
  params: Promise<{
    channelId: string;
  }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { channelId } = await params;

    // 1. Fetch channel platform from DB
    let platform = '';
    try {
      const chRes = await query(`
        SELECT c.*, p.name as platform
        FROM channels c
        JOIN channels_platforms p ON c.id__channels_platforms = p.id
        WHERE c.id = $1
      `, [channelId]);

      if (chRes.rows.length > 0) {
        platform = chRes.rows[0].platform;
      }
    } catch (dbErr: any) {
      console.warn('DB lookup failed in disconnect:', dbErr.message);
    }

    // 2. Clear platform-specific session/auth files
    if (platform === 'telegram' || channelId === '3') {
      const envPath = path.resolve(process.cwd(), '.ENV');
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf-8');
        content = content.replace(/TELEGRAM_USER_SESSION=.*/, 'TELEGRAM_USER_SESSION=');
        fs.writeFileSync(envPath, content, 'utf-8');
      }

      const envLocalPath = path.resolve(process.cwd(), '.env.local');
      if (fs.existsSync(envLocalPath)) {
        let localContent = fs.readFileSync(envLocalPath, 'utf-8');
        localContent = localContent.replace(/TELEGRAM_USER_SESSION=.*/, 'TELEGRAM_USER_SESSION=');
        fs.writeFileSync(envLocalPath, localContent, 'utf-8');
      }
    } else if (platform === 'whatsapp' || channelId === '5') {
      const waAuthDir = path.resolve(process.cwd(), 'whatsapp_auth');
      if (fs.existsSync(waAuthDir)) {
        fs.rmSync(waAuthDir, { recursive: true, force: true });
      }
    } else if (platform === 'zalo' || channelId === '2') {
      const zaloAuthDir = path.resolve(process.cwd(), 'zalo_auth');
      const credsPath = path.join(zaloAuthDir, 'credentials.json');
      if (fs.existsSync(credsPath)) {
        fs.unlinkSync(credsPath);
      }
    }

    // Dừng tiến trình sync ngầm nếu đang chạy
    try {
      const { stopSync } = await import('@/lib/sync-manager');
      if (platform === 'telegram' || channelId === '3') stopSync('telegram');
      if (platform === 'zalo' || channelId === '2') stopSync('zalo');
      if (platform === 'whatsapp' || channelId === '5') stopSync('whatsapp');
    } catch (_) {}

    // 3. Xóa sạch tin nhắn, cuộc hội thoại và liên hệ của kênh này khỏi Database
    try {
      await query(`
        DELETE FROM messages 
        WHERE conversation_id IN (
          SELECT id FROM conversations WHERE channel_id = $1
        )
      `, [channelId]);

      await query(`
        DELETE FROM conversations 
        WHERE channel_id = $1
      `, [channelId]);

      await query(`
        DELETE FROM contacts 
        WHERE channel_id = $1
      `, [channelId]);

      await query(`UPDATE channels SET is_active = false, updated_at = NOW() WHERE id = $1`, [channelId]);
      console.log(`✅ Đã xóa toàn bộ tin nhắn và ngắt kết nối cho kênh ID ${channelId}`);
    } catch (dbErr: any) {
      console.warn('DB channel cleanup error:', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Đã đăng xuất và ngắt kết nối kênh ${platform || channelId} thành công!`,
    });
  } catch (error: any) {
    console.error('Channel disconnect error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Không thể đăng xuất kênh' },
      { status: 500 }
    );
  }
}
