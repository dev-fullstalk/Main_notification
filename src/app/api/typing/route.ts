import { NextResponse } from 'next/server';
import { query } from '@/config/database';

// POST /api/typing -> agent typing status
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, isTyping } = body;

    if (!conversationId) {
      return NextResponse.json({ success: false, error: 'Missing conversationId' }, { status: 400 });
    }

    // Lấy channel_id và external_user_id từ conversationId
    const res = await query(`
      SELECT conv.channel_id, cont.external_user_id
      FROM conversations conv
      JOIN contacts cont ON conv.contact_id = cont.id
      WHERE conv.id = $1
      LIMIT 1
    `, [conversationId]);

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    const { channel_id, external_user_id } = res.rows[0];

    await query(`
      INSERT INTO outbound_typing (channel_id, external_user_id, is_typing, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (channel_id, external_user_id)
      DO UPDATE SET is_typing = $3, updated_at = CURRENT_TIMESTAMP
    `, [channel_id, external_user_id, Boolean(isTyping)]);

    return NextResponse.json({ success: true, isTyping: Boolean(isTyping) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
