import { conversationRepo } from '../repositories/conversation.repo';
import { messageRepo } from '../repositories/message.repo';
import { userRepo } from '../repositories/user.repo';
import { ConversationDTO, MessageDTO } from '../types/db.types';

// Mock imports for fallback
import { mockConversations } from '../mocks/conversations.mock';
import { mockContacts } from '../mocks/contacts.mock';
import { mockMessages } from '../mocks/messages.mock';
import { mockUsers } from '../mocks/users.mock';

export const chatService = {
  async getConversationsByChannel(channelId: string | null): Promise<ConversationDTO[]> {
    try {
      if (channelId && channelId !== 'all') {
        return await conversationRepo.getByChannelId(channelId);
      }
      return await conversationRepo.getAll();
    } catch (error: any) {
      console.warn('Database query failed in chatService.getConversationsByChannel. Falling back to Mock Data. Details:', error.message);
      
      // Fallback
      return mockConversations
        .filter((c) => !channelId || channelId === 'all' || c.channelId === channelId)
        .map((c) => {
          const contact = mockContacts.find((ct) => ct.id === c.contactId);
          return {
            id: c.id,
            channel_id: c.channelId,
            contact_id: c.contactId,
            assigned_user_id: c.assignedUserId || null,
            id__conversations_statuses: c.status === 'open' ? 1 : c.status === 'pending' ? 2 : c.status === 'resolved' ? 3 : 4,
            last_message_preview: c.lastMessagePreview || null,
            last_message_at: c.lastMessageAt,
            unread_count: c.unreadCount,
            metadata: {},
            created_at: c.lastMessageAt,
            updated_at: c.lastMessageAt,
            contact_name: contact ? contact.name : 'Khách hàng',
            contact_avatar_url: contact ? contact.avatarUrl || null : null,
            contact_phone: contact ? contact.phone || null : null,
            contact_email: contact ? contact.email || null : null,
            status: c.status,
          };
        });
    }
  },

  async getMessages(conversationId: string): Promise<MessageDTO[]> {
    try {
      return await messageRepo.getByConversationId(conversationId);
    } catch (error: any) {
      console.warn('Database query failed in chatService.getMessages. Falling back to Mock Data. Details:', error.message);

      // Fallback
      return mockMessages
        .filter((m) => m.conversationId === conversationId)
        .map((m) => {
          const agent = m.senderUserId ? mockUsers.find((u) => u.id === m.senderUserId) : null;
          return {
            id: m.id,
            conversation_id: m.conversationId,
            id__messages_sender_types: m.senderType === 'customer' ? 1 : m.senderType === 'agent' ? 2 : m.senderType === 'bot' ? 3 : 4,
            sender_user_id: m.senderUserId || null,
            id__messages_types: m.messageType === 'text' ? 1 : m.messageType === 'image' ? 2 : m.messageType === 'video' ? 3 : m.messageType === 'file' ? 4 : m.messageType === 'audio' ? 5 : 6,
            content: m.content || null,
            media_url: m.mediaUrl || null,
            payload: {},
            external_message_id: m.externalMessageId || null,
            id__messages_statuses: m.status === 'pending' ? 1 : m.status === 'sent' ? 2 : m.status === 'delivered' ? 3 : m.status === 'read' ? 4 : 5,
            error_message: m.errorMessage || null,
            created_at: m.createdAt,
            sender_type: m.senderType,
            message_type: m.messageType,
            status: m.status,
            agent_name: agent ? agent.name : null,
            agent_avatar_url: agent ? agent.avatarUrl || null : null,
          };
        });
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
      return await messageRepo.create(
        conversationId,
        senderTypeId,
        senderUserId,
        messageTypeId,
        content,
        mediaUrl
      );
    } catch (error: any) {
      console.warn('Database insert failed in chatService.sendMessage. Emulating local message. Details:', error.message);

      // Fallback
      return {
        id: `m-fallback-${Date.now()}`,
        conversation_id: conversationId,
        id__messages_sender_types: senderTypeId,
        sender_user_id: senderUserId,
        id__messages_types: messageTypeId,
        content,
        media_url: mediaUrl || null,
        payload: {},
        id__messages_statuses: 2, // sent
        created_at: new Date().toISOString(),
      };
    }
  }
};
