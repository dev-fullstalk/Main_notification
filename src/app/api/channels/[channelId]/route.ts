import { NextResponse } from 'next/server';
import { query } from '@/config/database';

interface RouteParams {
  params: Promise<{
    channelId: string;
  }>;
}

// PATCH /api/channels/:channelId - Update channel name or properties
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { channelId } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Tên kênh không được để trống' },
        { status: 400 }
      );
    }

    const res = await query(
      `UPDATE channels SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [name.trim(), channelId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy kênh' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật tên kênh thành công!',
      data: res.rows[0],
    });
  } catch (error: any) {
    console.error('Update channel error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Lỗi cập nhật kênh' },
      { status: 500 }
    );
  }
}
