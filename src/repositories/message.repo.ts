import { query } from '../config/database';
import { MessageDTO } from '../types/db.types';

export const messageRepo = {
  async getByConversationId(conversationId: string | number): Promise<MessageDTO[]> {
    const { rows } = await query(`
      SELECT m.*, 
             st.name as sender_type,
             mt.name as message_type,
             ms.name as status,
             u.name as agent_name, 
             u.avatar_url as agent_avatar_url
      FROM messages m
      JOIN messages_sender_types st ON m.id__messages_sender_types = st.id
      JOIN messages_types mt ON m.id__messages_types = mt.id
      JOIN messages_statuses ms ON m.id__messages_statuses = ms.id
      LEFT JOIN users u ON m.sender_user_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `, [conversationId]);
    return rows;
  },

  async create(
    conversationId: string | number,
    id__messages_sender_types: number,
    senderUserId: string | number | null,
    id__messages_types: number,
    content: string | null,
    mediaUrl?: string | null,
    externalMessageId?: string | null,
    statusId: number = 2
  ): Promise<any> {
    // Insert new message
    const { rows } = await query(`
      INSERT INTO messages (
        conversation_id, 
        id__messages_sender_types, 
        sender_user_id, 
        id__messages_types, 
        content, 
        media_url, 
        external_message_id,
        id__messages_statuses
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      conversationId,
      id__messages_sender_types,
      senderUserId || null,
      id__messages_types,
      content || null,
      mediaUrl || null,
      externalMessageId || null,
      statusId
    ]);

    // Format last message preview string based on type
    let lastPreview = content || '';
    if (id__messages_types === 2) lastPreview = '[Hình ảnh]';
    else if (id__messages_types === 4) lastPreview = '[Tài liệu]';
    else if (id__messages_types === 3) lastPreview = '[Video]';
    else if (id__messages_types === 5) lastPreview = '[Âm thanh]';
    else if (id__messages_types === 6) lastPreview = '[Sticker]';

    // Update conversation properties
    await query(`
      UPDATE conversations
      SET last_message_preview = $1, last_message_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [lastPreview, conversationId]);

    return rows[0];
  }
};
