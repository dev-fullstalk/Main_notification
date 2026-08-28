import { conversationRepo } from '../repositories/conversation.repo';
import { messageRepo } from '../repositories/message.repo';
import { userRepo } from '../repositories/user.repo';
import { ConversationDTO, MessageDTO } from '../types/db.types';
import { query } from '../config/database';

export const chatService = {
  async getConversationsByChannel(channelId: string | null): Promise<ConversationDTO[]> {
    try {
      if (channelId && channelId !== 'all') {
        return await conversationRepo.getByChannelId(channelId);
      }
      return await conversationRepo.getAll();
    } catch (error: any) {
      console.error('Database query failed in chatService.getConversationsByChannel:', error.message);
      throw error;
    }
  },

  async getMessages(conversationId: string): Promise<MessageDTO[]> {
    try {
      return await messageRepo.getByConversationId(conversationId);
    } catch (error: any) {
      console.error('Database query failed in chatService.getMessages:', error.message);
      throw error;
    }
  },

  async sendMessage(
    conversationId: string,
    senderType: 'customer' | 'agent' | 'bot' | 'system',
    senderUserId: string | null,
    messageType: 'text' | 'image' | 'video' | 'file' | 'audio' | 'sticker',
    content: string | null,
    mediaUrl?: string | null
  ): Promise<any> {
    const senderTypeId = 
      senderType === 'customer' ? 1 : 
      senderType === 'agent' ? 2 : 
      senderType === 'bot' ? 3 : 4;
      
    const messageTypeId = 
      messageType === 'text' ? 1 : 
      messageType === 'image' ? 2 : 
      messageType === 'video' ? 3 : 
      messageType === 'file' ? 4 : 
      messageType === 'audio' ? 5 : 6;

    try {
      // Check channel type for this conversation to see if we should send it via Telegram API
      let externalMessageId: string | null = null;
      let statusId = 2; // Sent (Default)

      try {
        const convDetails = await query(`
          SELECT c.id__channels_platforms, c.access_token, cont.external_user_id
          FROM conversations conv
          JOIN channels c ON conv.channel_id = c.id
          JOIN contacts cont ON conv.contact_id = cont.id
          WHERE conv.id = $1
        `, [conversationId]);

        if (convDetails.rows.length > 0) {
          const { id__channels_platforms, access_token, external_user_id } = convDetails.rows[0];
          
          // Telegram is platform 3
          if (id__channels_platforms === 3 && access_token && external_user_id) {
            console.log(`Sending outbound Telegram message to chat ${external_user_id}`);
            const telegramUrl = `https://api.telegram.org/bot${access_token}/sendMessage`;
            const response = await fetch(telegramUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: external_user_id,
                text: content || ''
              })
            });
            const result = await response.json();
            if (result.ok) {
              externalMessageId = result.result?.message_id ? String(result.result.message_id) : null;
              statusId = 3; // Delivered
              console.log(`Telegram message sent successfully. Msg ID: ${externalMessageId}`);
            } else {
              console.error(`Telegram API error: ${result.description}`);
              statusId = 5; // Failed
            }
          }
        }
      } catch (dbErr: any) {
        console.warn('Failed to fetch conversation channel details or dispatch Telegram API message:', dbErr.message);
      }

      return await messageRepo.create(
        conversationId,
        senderTypeId,
        senderUserId,
        messageTypeId,
        content,
        mediaUrl,
        externalMessageId,
        statusId
      );
    } catch (error: any) {
      console.error('Database insert failed in chatService.sendMessage:', error.message);
      throw error;
    }
  }
};
