import { NextResponse } from 'next/server';
import { pool } from '../../../../config/database';

// Facebook Webhook Verification (GET)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'terax_secret_token';

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Facebook Webhook Verified successfully!');
      return new Response(challenge, { status: 200 });
    } else {
      console.warn('❌ Facebook Webhook verification token mismatch');
      return new Response('Forbidden', { status: 403 });
    }
  }
  return new Response('Missing parameters', { status: 400 });
}

// Receive incoming messages/events from Facebook Page (POST)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verify this is a page subscription event
    if (body.object === 'page') {
      const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';

      for (const entry of body.entry || []) {
        for (const webhookEvent of entry.messaging || []) {
          const isEcho = Boolean(webhookEvent.message?.is_echo);
          const pageId = isEcho ? String(webhookEvent.sender?.id) : String(webhookEvent.recipient?.id);
          const customerId = isEcho ? String(webhookEvent.recipient?.id) : String(webhookEvent.sender?.id);
          const messageObj = webhookEvent.message;

          if (!messageObj) continue;

          const msgId = messageObj.mid;
          let textContent = messageObj.text || '';
          let mediaUrl: string | null = null;
          let messageTypeId = 1; // 1: text

          // Check attachments
          if (messageObj.attachments && messageObj.attachments.length > 0) {
            const att = messageObj.attachments[0];
            mediaUrl = att.payload?.url || null;
            const attType = att.type; // image, video, audio, file

            if (attType === 'image') messageTypeId = 2;
            else if (attType === 'video') messageTypeId = 3;
            else if (attType === 'file') messageTypeId = 4;
            else if (attType === 'audio') messageTypeId = 5;
            else if (attType === 'sticker') messageTypeId = 6;

            if (!textContent) {
              textContent = attType === 'image' ? '[Hình ảnh]' : attType === 'video' ? '[Video]' : '[Tập tin/Hình ảnh]';
            }
          }

          // 1. Find or create Facebook Channel (Platform ID = 1)
          let channelRes = await pool.query(
            `SELECT id, name FROM notification.channels WHERE id__channels_platforms = 1 AND external_channel_id = $1 LIMIT 1`,
            [pageId]
          );
          let channelId: string;

          if (channelRes.rows.length === 0) {
            const newChan = await pool.query(
              `INSERT INTO notification.channels (id__channels_platforms, name, external_channel_id, avatar_url, is_active)
               VALUES (1, $1, $2, 'https://img.icons8.com/color/512/facebook-new.png', true)
               RETURNING id`,
              [`Fanpage Facebook (${pageId})`, pageId]
            );
            channelId = String(newChan.rows[0].id);
          } else {
            channelId = String(channelRes.rows[0].id);
          }

          // 2. Fetch or create Contact
          let contactRes = await pool.query(
            `SELECT id, name FROM notification.contacts WHERE channel_id = $1 AND external_user_id = $2`,
            [channelId, customerId]
          );
          let contactId: string;

          if (contactRes.rows.length === 0) {
            let customerName = `Khách Facebook #${customerId.slice(-4)}`;
            let customerAvatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${customerId}`;

            // Try to fetch customer name from Facebook Graph API if token is provided
            if (pageAccessToken) {
              try {
                const fbRes = await fetch(
                  `https://graph.facebook.com/v19.0/${customerId}?fields=first_name,last_name,profile_pic&access_token=${pageAccessToken}`
                );
                const fbData = await fbRes.json();
                if (fbData.first_name || fbData.last_name) {
                  customerName = `${fbData.last_name || ''} ${fbData.first_name || ''}`.trim();
                }
                if (fbData.profile_pic) {
                  customerAvatar = fbData.profile_pic;
                }
              } catch (e) {
                // Ignore API fetch failure, fallback to generated profile
              }
            }

            const newContact = await pool.query(
              `INSERT INTO notification.contacts (channel_id, external_user_id, name, avatar_url, metadata)
               VALUES ($1, $2, $3, $4, '{}')
               RETURNING id`,
              [channelId, customerId, customerName, customerAvatar]
            );
            contactId = String(newContact.rows[0].id);
          } else {
            contactId = String(contactRes.rows[0].id);
          }

          // 3. Find or create Conversation
          const previewText = mediaUrl ? (messageTypeId === 2 ? '[Hình ảnh]' : '[Tập tin]') : textContent;
          let convRes = await pool.query(
            `SELECT id FROM notification.conversations WHERE channel_id = $1 AND contact_id = $2`,
            [channelId, contactId]
          );
          let convId: string;

          if (convRes.rows.length === 0) {
            const newConv = await pool.query(
              `INSERT INTO notification.conversations (channel_id, contact_id, id__conversations_statuses, last_message_preview, last_message_at, unread_count)
               VALUES ($1, $2, 1, $3, CURRENT_TIMESTAMP, $4)
               RETURNING id`,
              [channelId, contactId, previewText, isEcho ? 0 : 1]
            );
            convId = String(newConv.rows[0].id);
          } else {
            convId = String(convRes.rows[0].id);
            await pool.query(
              `UPDATE notification.conversations 
               SET last_message_preview = $1, 
                   last_message_at = CURRENT_TIMESTAMP, 
                   unread_count = CASE WHEN $3 = true THEN unread_count ELSE unread_count + 1 END
               WHERE id = $2`,
              [previewText, convId, isEcho]
            );
          }

          // 4. Check duplicate message mid
          if (msgId) {
            const dup = await pool.query(
              `SELECT id FROM notification.messages WHERE conversation_id = $1 AND external_message_id = $2`,
              [convId, msgId]
            );
            if (dup.rows.length > 0) continue;
          }

          // 5. Insert Message
          const senderTypeId = isEcho ? 2 : 1; // 1: customer, 2: agent
          await pool.query(
            `INSERT INTO notification.messages (conversation_id, id__messages_sender_types, id__messages_types, content, media_url, external_message_id, id__messages_statuses)
             VALUES ($1, $2, $3, $4, $5, $6, 3)`,
            [convId, senderTypeId, messageTypeId, textContent, mediaUrl, msgId || null]
          );

          console.log(`📩 Đã đồng bộ tin nhắn Facebook từ: ${customerId} | Nội dung: "${textContent}"`);
        }
      }

      return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
    }
    
    return NextResponse.json({ error: 'Not a page event' }, { status: 404 });
  } catch (error: any) {
    console.error('Lỗi khi xử lý Facebook Webhook:', error?.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
