import { NextResponse } from 'next/server';
import { query } from '@/config/database';

export async function GET(request: Request) {
  return NextResponse.json({ success: true, message: 'Telegram Webhook Endpoint is active' });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Incoming Telegram Webhook Event:', JSON.stringify(body, null, 2));

    const message = body.message || body.edited_message;
    if (!message || !message.chat || !message.chat.id) {
      // Return 200 to Telegram so it doesn't retry
      return NextResponse.json({ success: true, message: 'No valid message found' });
    }

    const chatId = String(message.chat.id);
    const firstName = message.from?.first_name || '';
    const lastName = message.from?.last_name || '';
    const contactName = [firstName, lastName].filter(Boolean).join(' ') || 'User Telegram';
    const username = message.from?.username || null;
    const messageId = String(message.message_id);

    // Determine message type and content
    let messageType: 'text' | 'image' | 'video' | 'file' | 'audio' | 'sticker' = 'text';
    let content: string | null = null;
    let mediaUrl: string | null = null;

    if (message.text) {
      messageType = 'text';
      content = message.text;
    } else if (message.photo) {
      messageType = 'image';
      content = message.caption || '[Hình ảnh]';
      const photoArray = message.photo;
      if (photoArray.length > 0) {
        mediaUrl = photoArray[photoArray.length - 1].file_id;
      }
    } else if (message.sticker) {
      messageType = 'sticker';
      content = message.sticker.emoji ? `[Sticker ${message.sticker.emoji}]` : '[Sticker]';
      mediaUrl = message.sticker.file_id;
    } else if (message.document) {
      messageType = 'file';
      content = message.caption || message.document.file_name || '[Tài liệu]';
      mediaUrl = message.document.file_id;
    } else if (message.video) {
      messageType = 'video';
      content = message.caption || '[Video]';
      mediaUrl = message.video.file_id;
    } else if (message.voice || message.audio) {
      messageType = 'audio';
      content = message.caption || '[Âm thanh]';
      mediaUrl = (message.voice || message.audio).file_id;
    } else {
      content = '[Tin nhắn không hỗ trợ]';
    }

    // Map string type to DB ID:
    // 1: text, 2: image, 3: video, 4: file, 5: audio, 6: sticker
    const typeIdMap = {
      text: 1,
      image: 2,
      video: 3,
      file: 4,
      audio: 5,
      sticker: 6
    };
    const messageTypeId = typeIdMap[messageType] || 1;

    // Find the active Telegram channel
    // 3 is Telegram (we corrected dylantranbot platform in database)
    const channelRes = await query(
      `SELECT * FROM channels WHERE id__channels_platforms = 3 AND is_active = true LIMIT 1`
    );

    if (channelRes.rows.length === 0) {
      console.warn('No active Telegram channel found in database');
      return NextResponse.json({ success: false, error: 'No active Telegram channel found' }, { status: 404 });
    }

    const channel = channelRes.rows[0];

    // Find or create Contact
    const contactRes = await query(
      `SELECT * FROM contacts WHERE channel_id = $1 AND external_user_id = $2`,
      [channel.id, chatId]
    );

    let contact;
    if (contactRes.rows.length === 0) {
      const insertContactRes = await query(
        `INSERT INTO contacts (channel_id, external_user_id, name, metadata) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [channel.id, chatId, contactName, JSON.stringify({ username })]
      );
      contact = insertContactRes.rows[0];
      console.log(`Created new Telegram contact: ${contactName} (ID: ${chatId})`);
    } else {
      contact = contactRes.rows[0];
      if (contactName && contact.name !== contactName) {
        await query(
          `UPDATE contacts SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [contactName, contact.id]
        );
        contact.name = contactName;
      }
    }

    // Find or create Conversation
    const conversationRes = await query(
      `SELECT * FROM conversations WHERE channel_id = $1 AND contact_id = $2`,
      [channel.id, contact.id]
    );

    let conversation;
    const lastPreview = content || `[${messageType.toUpperCase()}]`;

    if (conversationRes.rows.length === 0) {
      const insertConvRes = await query(
        `INSERT INTO conversations (channel_id, contact_id, id__conversations_statuses, last_message_preview, last_message_at, unread_count) 
         VALUES ($1, $2, 1, $3, CURRENT_TIMESTAMP, 1) 
         RETURNING *`,
        [channel.id, contact.id, lastPreview]
      );
      conversation = insertConvRes.rows[0];
      console.log(`Created new Conversation for contact ${contactName}`);
    } else {
      conversation = conversationRes.rows[0];
      const updateConvRes = await query(
        `UPDATE conversations 
         SET last_message_preview = $1, 
             last_message_at = CURRENT_TIMESTAMP, 
             unread_count = unread_count + 1 
         WHERE id = $2 
         RETURNING *`,
        [lastPreview, conversation.id]
      );
      conversation = updateConvRes.rows[0];
    }

    // Insert Message
    const dupRes = await query(
      `SELECT id FROM messages WHERE conversation_id = $1 AND external_message_id = $2`,
      [conversation.id, messageId]
    );

    if (dupRes.rows.length === 0) {
      await query(
        `INSERT INTO messages (conversation_id, id__messages_sender_types, sender_user_id, id__messages_types, content, media_url, external_message_id, id__messages_statuses) 
         VALUES ($1, 1, null, $2, $3, $4, $5, 3) 
         RETURNING *`,
        [conversation.id, messageTypeId, content, mediaUrl, messageId]
      );
      console.log(`Saved incoming Telegram message: "${content}" from ${contactName}`);
    } else {
      console.log(`Duplicate Telegram message detected (ID: ${messageId}), skipping insert.`);
    }

    return NextResponse.json({ success: true, message: 'Update processed successfully' });
  } catch (error: any) {
    console.error('Error processing Telegram webhook update:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
