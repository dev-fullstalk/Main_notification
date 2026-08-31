import { NextResponse } from 'next/server';
import { query } from '@/config/database';

interface RouteParams {
  params: Promise<{
    channelId: string;
  }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { channelId } = await params;

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

    console.log(`✅ Đã dọn dẹp sạch toàn bộ lịch sử tin nhắn của kênh ID ${channelId}`);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa toàn bộ tin nhắn của kênh thành công!',
    });
  } catch (error: any) {
    console.error('Clear messages error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Không thể xóa tin nhắn' },
      { status: 500 }
    );
  }
}
