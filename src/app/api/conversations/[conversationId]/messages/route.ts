import { messageController } from '@/controllers/message.controller';

interface RouteParams {
  params: Promise<{
    conversationId: string;
  }>;
}

// GET /api/conversations/:conversationId/messages
export async function GET(request: Request, { params }: RouteParams) {
  const { conversationId } = await params;
  return messageController.getByConversationId(conversationId);
}

// POST /api/conversations/:conversationId/messages
export async function POST(request: Request, { params }: RouteParams) {
  const { conversationId } = await params;
  return messageController.create(conversationId, request);
}
