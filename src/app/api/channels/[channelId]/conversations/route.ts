import { conversationController } from '@/controllers/conversation.controller';

interface RouteParams {
  params: Promise<{
    channelId: string;
  }>;
}

// GET /api/channels/:channelId/conversations
export async function GET(request: Request, { params }: RouteParams) {
  const { channelId } = await params;
  return conversationController.getByChannelId(channelId);
}
