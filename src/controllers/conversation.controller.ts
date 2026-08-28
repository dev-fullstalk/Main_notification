import { NextResponse } from 'next/server';
import { chatService } from '../services/chat.service';

export const conversationController = {
  async getByChannelId(channelId: string) {
    try {
      const data = await chatService.getConversationsByChannel(channelId);
      return NextResponse.json({ success: true, data });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || 'Internal Server Error' },
        { status: 500 }
      );
    }
  }
};
