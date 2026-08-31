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
          FROM notification.conversations conv
          JOIN notification.channels c ON conv.channel_id = c.id
          JOIN notification.contacts cont ON conv.contact_id = cont.id
          WHERE conv.id = $1
        `, [conversationId]);

        if (convDetails.rows.length > 0) {
          const { id__channels_platforms, access_token, external_user_id } = convDetails.rows[0];
          
          // 1. Facebook Messenger is platform 1
          const fbToken = access_token || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
          if (id__channels_platforms === 1 && fbToken && external_user_id) {
            console.log(`🚀 Đang gửi tin nhắn Facebook Messenger tới: ${external_user_id}`);
            const fbUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${fbToken}`;
            
            let fbBody: any = {
              recipient: { id: external_user_id },
              messaging_type: 'RESPONSE',
            };

            if (mediaUrl) {
              const attType = messageType === 'image' ? 'image' : messageType === 'video' ? 'video' : messageType === 'audio' ? 'audio' : 'file';
              fbBody.message = {
                attachment: {
                  type: attType,
                  payload: { url: mediaUrl, is_reusable: true }
                }
              };
            } else {
              fbBody.message = { text: content || '' };
            }

            const response = await fetch(fbUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fbBody)
            });
            const result = await response.json();
            if (result.message_id) {
              externalMessageId = String(result.message_id);
              statusId = 3; // Delivered
              console.log(`✅ Tin nhắn Facebook đã gửi thành công tới khách hàng! Msg ID: ${externalMessageId}`);
            } else {
              console.error(`❌ Lỗi gửi tin nhắn qua Facebook Graph API:`, result.error);
              statusId = 5; // Failed
            }
          }

          // 2. Telegram is platform 3 (Support both Bot and Personal Account Session)
          if (id__channels_platforms === 3 && external_user_id) {
            console.log(`🚀 Đang gửi tin nhắn Telegram tới đối tác ID: ${external_user_id}`);
            
            // Trường hợp 1: Có Bot Token
            if (access_token) {
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
                console.log(`✅ Telegram Bot đã gửi tin nhắn thành công. Msg ID: ${externalMessageId}`);
              } else {
                console.error(`❌ Lỗi Telegram Bot API: ${result.description}`);
                statusId = 5; // Failed
              }
            } 
            // Trường hợp 2: Tài khoản Telegram Cá nhân (MTProto Session)
            else {
              const teleSession = process.env.TELEGRAM_USER_SESSION || '';
              if (teleSession) {
                try {
                  const { TelegramClient } = await import('telegram');
                  const { StringSession } = await import('telegram/sessions');
                  const apiId = Number(process.env.TELEGRAM_API_ID) || 38802670;
                  const apiHash = process.env.TELEGRAM_API_HASH || '245dbf5bc61c0590b473fb31747bb198';

                  const client = new TelegramClient(new StringSession(teleSession), apiId, apiHash, {
                    connectionRetries: 3,
                  });
                  await client.connect();

                  // Chuẩn bị entity gửi (BigInt ID nếu là số)
                  let peer: any = external_user_id;
                  if (/^-?\d+$/.test(external_user_id)) {
                    peer = BigInt(external_user_id);
                  }

                  const sentMsg = await client.sendMessage(peer, {
                    message: content || '',
                  });

                  externalMessageId = String(sentMsg.id);
                  statusId = 3; // Delivered
                  console.log(`✅ Đã gửi tin nhắn thành công qua Telegram Cá Nhân của Sếp! Msg ID: ${externalMessageId}`);
                  await client.disconnect();
                } catch (mtErr: any) {
                  console.error('❌ Lỗi gửi tin nhắn qua Telegram Cá nhân:', mtErr.message);
                  statusId = 5; // Failed
                }
              } else {
                console.warn('⚠️ Chưa cấu hình TELEGRAM_USER_SESSION trong .ENV');
              }
            }
          }
        }
      } catch (dbErr: any) {
        console.warn('Failed to fetch conversation channel details or dispatch API message:', dbErr.message);
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
