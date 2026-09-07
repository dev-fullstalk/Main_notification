import { NextResponse } from 'next/server';
import { mockMessages } from '../../../mocks/messages.mock';

// GET: Fetch messages by conversation ID
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json(
      { success: false, error: 'Missing conversationId parameter' },
      { status: 400 }
    );
  }

  const filteredMessages = mockMessages.filter(
    (m) => m.conversationId === conversationId
  );

  return NextResponse.json({
    success: true,
    data: filteredMessages,
  });
}

// POST: Send/dispatch an outbound message
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, content, messageType, mediaUrl } = body;

    if (!conversationId || (!content && !mediaUrl)) {
      return NextResponse.json(
        { success: false, error: 'Missing required message parameters' },
        { status: 400 }
      );
    }

    const outboundMessage = {
      id: `m-api-${Date.now()}`,
      conversationId,
      senderType: 'agent',
      senderUserId: '1', // Bùi Việt Hùng
      messageType: messageType || 'text',
      content,
      mediaUrl,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Message dispatched successfully',
      data: outboundMessage,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
