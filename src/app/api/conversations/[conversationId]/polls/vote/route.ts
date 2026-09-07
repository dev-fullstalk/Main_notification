import { NextResponse } from 'next/server';
import { query } from '@/config/database';

interface RouteParams {
  params: Promise<{
    conversationId: string;
  }>;
}

// POST: Bỏ phiếu cho một phương án trong bình chọn
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { conversationId } = await params;
    const body = await request.json();
    const { messageId, optionId, userId = '1', userName = 'Bạn' } = body;

    if (!messageId || optionId === undefined) {
      return NextResponse.json(
        { success: false, error: 'Thiếu messageId hoặc optionId' },
        { status: 400 }
      );
    }

    // 1. Tìm tin nhắn bình chọn
    const msgRes = await query(
      `SELECT id, payload FROM notification.messages WHERE id = $1 AND conversation_id = $2`,
      [messageId, conversationId]
    );

    if (msgRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy bình chọn' },
        { status: 404 }
      );
    }

    const currentPayload = msgRes.rows[0].payload || {};
    const poll = currentPayload.poll;

    if (!poll || !Array.isArray(poll.options)) {
      return NextResponse.json(
        { success: false, error: 'Tin nhắn không chứa dữ liệu bình chọn hợp lệ' },
        { status: 400 }
      );
    }

    const allowMulti = Boolean(poll.allowMultiChoices);
    const currentUserId = String(userId);

    // 2. Cập nhật lượt bình chọn
    poll.options = poll.options.map((opt: any) => {
      const isTarget = opt.id === Number(optionId);
      const voters: string[] = Array.isArray(opt.voters) ? opt.voters : [];
      const hasVoted = voters.includes(currentUserId);

      if (isTarget) {
        if (hasVoted) {
          // Bỏ chọn (Unvote)
          const newVoters = voters.filter((u: string) => u !== currentUserId);
          return {
            ...opt,
            voters: newVoters,
            votes: Math.max(0, newVoters.length),
          };
        } else {
          // Chọn thêm
          const newVoters = [...voters, currentUserId];
          return {
            ...opt,
            voters: newVoters,
            votes: newVoters.length,
          };
        }
      } else if (!allowMulti && !hasVoted) {
        return opt;
      } else if (!allowMulti && hasVoted) {
        // Nếu không cho chọn nhiều, xóa vote ở các option khác
        const newVoters = voters.filter((u: string) => u !== currentUserId);
        return {
          ...opt,
          voters: newVoters,
          votes: Math.max(0, newVoters.length),
        };
      }
      return opt;
    });

    // 3. Tính lại tổng số lượt vote
    poll.totalVotes = poll.options.reduce((acc: number, curr: any) => acc + (curr.votes || 0), 0);

    const updatedPayload = {
      ...currentPayload,
      poll,
    };

    await query(
      `UPDATE notification.messages SET payload = $1 WHERE id = $2`,
      [JSON.stringify(updatedPayload), messageId]
    );

    return NextResponse.json({
      success: true,
      data: {
        messageId,
        poll,
      },
    });
  } catch (error: any) {
    console.error('Lỗi bỏ phiếu bình chọn:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
