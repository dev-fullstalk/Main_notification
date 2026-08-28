import { NextResponse } from 'next/server';
import { chatService } from '../services/chat.service';

export const messageController = {
  async getByConversationId(conversationId: string) {
    try {
      const data = await chatService.getMessages(conversationId);
      return NextResponse.json({ success: true, data });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || 'Internal Server Error' },
        { status: 500 }
      );
    }
  },

  async create(conversationId: string, req: Request) {
    try {
      const body = await req.json();
      const { content, media_url, id__messages_types, sender_user_id } = body;

      // Map lookup ID parameters back to descriptive types
      const typeMap: Record<number, 'text' | 'image' | 'video' | 'file' | 'audio' | 'sticker'> = {
        1: 'text',
        2: 'image',
        3: 'video',
        4: 'file',
        5: 'audio',
        6: 'sticker'
      };

      const messageType = typeMap[id__messages_types] || 'text';

      const data = await chatService.sendMessage(
        conversationId,
        'agent',
        sender_user_id || '1',
        messageType,
        content,
        media_url
      );

      return NextResponse.json({
        success: true,
        data,
        message: 'Message created and appended successfully',
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || 'Internal Server Error' },
        { status: 500 }
      );
    }
  }
};
