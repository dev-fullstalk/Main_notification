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
             s.name as status
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
             s.name as status
      FROM conversations conv
      JOIN contacts cont ON conv.contact_id = cont.id
      JOIN conversations_statuses s ON conv.id__conversations_statuses = s.id
      ORDER BY conv.last_message_at DESC
    `);
    return rows;
  }
};
