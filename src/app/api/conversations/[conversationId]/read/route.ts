import { NextResponse } from 'next/server';
import { conversationRepo } from '@/repositories/conversation.repo';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    if (conversationId) {
      await conversationRepo.markAsRead(conversationId);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
