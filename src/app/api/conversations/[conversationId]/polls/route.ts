import { NextResponse } from 'next/server';
import { query } from '@/config/database';
import { messageRepo } from '@/repositories/message.repo';

interface RouteParams {
  params: Promise<{
    conversationId: string;
  }>;
}

// POST: Tạo bình chọn mới trong cuộc hội thoại nhóm
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { conversationId } = await params;
    const body = await request.json();
    const { question, options, allowMultiChoices, isAnonymous } = body;

    if (!question?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Câu hỏi bình chọn không được để trống' },
        { status: 400 }
      );
    }

    if (!Array.isArray(options) || options.filter((o: string) => o.trim()).length < 2) {
      return NextResponse.json(
        { success: false, error: 'Cần ít nhất 2 phương án bình chọn' },
        { status: 400 }
      );
    }

    const cleanOptions = options
      .map((opt: string) => opt.trim())
      .filter(Boolean)
      .map((opt: string, idx: number) => ({
        id: idx + 1,
        content: opt,
        votes: 0,
        voters: [] as string[],
      }));

    const pollId = `poll_${Date.now()}`;
    const pollPayload = {
      poll: {
        id: pollId,
        question: question.trim(),
        options: cleanOptions,
        totalVotes: 0,
        allowMultiChoices: Boolean(allowMultiChoices),
        isAnonymous: Boolean(isAnonymous),
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      is_pending_poll_sync: true,
    };

    const textPreview = `📊 Bình chọn: ${question.trim()}`;

    // 1. Lưu tin nhắn bình chọn vào database (sender_type = 2: agent, type = 1: text/poll)
    const newMessage = await messageRepo.create(
      conversationId,
      2, // Agent
      '1', // Current user
      1, // Type
      textPreview,
      null, // mediaUrl
      null, // externalMessageId
      2, // Sent
      pollPayload
    );

    // 2. Cập nhật preview của conversation
    await query(
      `UPDATE notification.conversations 
       SET last_message_preview = $1, last_message_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [textPreview, conversationId]
    );

    return NextResponse.json({
      success: true,
      data: newMessage,
      message: 'Đã tạo bình chọn thành công!',
    });
  } catch (error: any) {
    console.error('Lỗi tạo bình chọn:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
