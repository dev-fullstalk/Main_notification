import { query } from '../config/database';
import { ConversationDTO } from '../types/db.types';

export const conversationRepo = {
  async getByChannelId(channelId: string | number): Promise<ConversationDTO[]> {
    const { rows } = await query(`
      SELECT conv.*, 
             cont.name as contact_name, 
             cont.avatar_url as contact_avatar_url, 
             cont.phone as contact_phone, 
             cont.email as contact_email,
             cont.external_user_id as contact_external_user_id,
             cont.metadata as contact_metadata,
             s.name as status,
             (conv.is_typing = true AND conv.typing_updated_at > CURRENT_TIMESTAMP - INTERVAL '6 seconds') as is_typing
      FROM conversations conv
      JOIN contacts cont ON conv.contact_id = cont.id
      JOIN conversations_statuses s ON conv.id__conversations_statuses = s.id
      WHERE conv.channel_id = $1
      ORDER BY conv.last_message_at DESC
    `, [channelId]);
    return rows;
  },

  async getAll(): Promise<ConversationDTO[]> {
    const { rows } = await query(`
      SELECT conv.*, 
             cont.name as contact_name, 
             cont.avatar_url as contact_avatar_url, 
             cont.phone as contact_phone, 
             cont.email as contact_email,
             cont.external_user_id as contact_external_user_id,
             cont.metadata as contact_metadata,
             s.name as status,
             (conv.is_typing = true AND conv.typing_updated_at > CURRENT_TIMESTAMP - INTERVAL '6 seconds') as is_typing
      FROM conversations conv
      JOIN contacts cont ON conv.contact_id = cont.id
      JOIN conversations_statuses s ON conv.id__conversations_statuses = s.id
      ORDER BY conv.last_message_at DESC
    `);
    return rows;
  },

  async markAsRead(conversationId: string | number): Promise<void> {
    await query(`
      UPDATE conversations
      SET unread_count = 0
      WHERE id = $1
    `, [conversationId]);
  }
};
