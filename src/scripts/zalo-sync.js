const { Zalo, LoginQRCallbackEventType } = require('zca-js');
const qrcode = require('qrcode-terminal');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.ENV'), quiet: true });

const authDir = path.resolve(__dirname, '../../zalo_auth');
const credsPath = path.join(authDir, 'credentials.json');
const uploadDir = path.resolve(__dirname, '../../public/uploads/zalo');

if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'terax_database',
  user: process.env.DB_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'postgres',
  options: '-c search_path=notification',
});

let apiInstance;
let channelId;
const groupNameCache = new Map();
const contactProfileCache = new Map();

async function getZaloContactProfile(peerId, isGroup = false, fallbackName = '') {
  if (!peerId || peerId === 'zalo-user') {
    return { name: fallbackName || `Zalo User ${peerId}`, avatar_url: null, phone: '', metadata: {} };
  }

  // Nếu trong cache đã có tên thật (không phải placeholder 'Zalo User ...')
  if (contactProfileCache.has(peerId)) {
    const cached = contactProfileCache.get(peerId);
    if (cached && cached.name && !cached.name.startsWith('Zalo User')) {
      return cached;
    }
  }

  let profile = {
    name: fallbackName || (isGroup ? `[Nhóm] Zalo ${peerId}` : `Zalo User ${peerId}`),
    avatar_url: null,
    phone: '',
    metadata: isGroup ? { is_group: true, group_id: peerId } : {},
  };

  if (!apiInstance) return profile;

  try {
    if (isGroup) {
      const gInfo = await apiInstance.getGroupInfo(peerId);
      if (gInfo && gInfo.gridInfoMap && gInfo.gridInfoMap[peerId]) {
        const grp = gInfo.gridInfoMap[peerId];
        const rawName = grp.name || `Nhóm Zalo ${peerId}`;
        const groupTitle = rawName.startsWith('[Nhóm]') ? rawName : `[Nhóm] ${rawName}`;
        profile = {
          name: groupTitle,
          avatar_url: grp.avt || null,
          phone: '',
          metadata: {
            is_group: true,
            group_id: peerId,
            total_members: grp.totalMember || 0,
            desc: grp.desc || '',
          },
        };
        groupNameCache.set(peerId, groupTitle);
      }
    } else {
      const uInfo = await apiInstance.getUserInfo(peerId);
      if (uInfo && uInfo.changed_profiles && uInfo.changed_profiles[peerId]) {
        const u = uInfo.changed_profiles[peerId];
        const realName = u.displayName || u.zaloName || fallbackName || `Zalo User ${peerId}`;
        profile = {
          name: realName,
          avatar_url: u.avatar || null,
          phone: u.phoneNumber || '',
          metadata: {
            username: u.username || '',
            gender: u.gender,
            cover: u.cover || null,
            status: u.status || '',
            zalo_name: u.zaloName || '',
            display_name: u.displayName || '',
          },
        };
      }
    }
    contactProfileCache.set(peerId, profile);
  } catch (err) {
    console.warn(`⚠️ [Zalo] Không lấy được profile của ${peerId}:`, err.message);
  }

  return profile;
}

async function getZaloGroupName(groupId) {
  if (groupNameCache.has(groupId)) return groupNameCache.get(groupId);
  const profile = await getZaloContactProfile(groupId, true);
  return profile.name;
}

async function initChannel(zaloUid, zaloName) {
  // Lấy id platform zalo (thường là 2)
  let platRes = await pool.query(`SELECT id FROM channels_platforms WHERE name = 'zalo'`);
  let platformId = platRes.rows.length > 0 ? platRes.rows[0].id : 2;

  const currentZaloId = String(zaloUid || 'zalo-main');

  // Tìm channel có đúng UID này hoặc channel Zalo đang active
  let chanRes = await pool.query(
    `SELECT id, external_channel_id FROM channels WHERE id__channels_platforms = $1 AND (external_channel_id = $2 OR is_active = true) ORDER BY is_active DESC, updated_at DESC LIMIT 1`,
    [platformId, currentZaloId]
  );

  if (chanRes.rows.length === 0) {
    const newChan = await pool.query(`
      INSERT INTO channels (id__channels_platforms, name, external_channel_id, avatar_url, is_active)
      VALUES ($1, $2, $3, 'https://img.icons8.com/color/512/zalo.png', true)
      RETURNING id
    `, [platformId, zaloName ? `Zalo: ${zaloName}` : 'Zalo Cá Nhân', currentZaloId]);
    channelId = newChan.rows[0].id;
  } else {
    channelId = chanRes.rows[0].id;
    await pool.query(
      `UPDATE channels SET name = $1, external_channel_id = $2, is_active = true, updated_at = NOW() WHERE id = $3`,
      [zaloName ? `Zalo: ${zaloName}` : 'Zalo Cá Nhân', currentZaloId, channelId]
    );
  }
  console.log(`✅ Đã liên kết Zalo Channel ID trong DB: ${channelId} (UID: ${currentZaloId})`);
}

async function saveZaloMessage(
  peerId,
  peerName,
  textContent,
  msgId,
  isOutgoing,
  mediaUrl = null,
  messageTypeId = 1,
  isGroup = false,
  senderName = null,
  payload = {}
) {
  try {
    if (!textContent && !mediaUrl) return;

    // Lấy thông tin thật từ Zalo API (Tên thật, Avatar thật, Số điện thoại, v.v.)
    const profile = await getZaloContactProfile(peerId, isGroup, peerName);
    const finalName = profile.name || peerName || (isGroup ? `[Nhóm] Zalo ${peerId}` : `Zalo User ${peerId}`);
    const finalAvatar = profile.avatar_url || null;
    const finalPhone = profile.phone || '';
    const finalMeta = {
      ...(profile.metadata || {}),
      ...(isGroup ? { is_group: true, group_id: peerId } : {})
    };

    // 1. Lưu Contact (nếu là nhóm thì lưu external_user_id là groupId)
    let contactRes = await pool.query(
      `SELECT id, name, avatar_url, phone, metadata FROM contacts WHERE channel_id = $1 AND external_user_id = $2`,
      [channelId, peerId]
    );
    let contactId;
    if (contactRes.rows.length === 0) {
      const newContact = await pool.query(
        `INSERT INTO contacts (channel_id, external_user_id, name, avatar_url, phone, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [channelId, peerId, finalName, finalAvatar, finalPhone, JSON.stringify(finalMeta)]
      );
      contactId = newContact.rows[0].id;
    } else {
      contactId = contactRes.rows[0].id;
      const existing = contactRes.rows[0];
      const isPlaceholder = !existing.name || existing.name.startsWith('Zalo User') || existing.name === 'Khách hàng';
      const shouldUpdateName = Boolean((finalName && !finalName.startsWith('Zalo User')) && (isPlaceholder || isGroup));
      const shouldUpdateAvatar = Boolean(finalAvatar && (!existing.avatar_url || finalAvatar !== existing.avatar_url));
      const shouldUpdatePhone = Boolean(finalPhone && (!existing.phone || finalPhone !== existing.phone));

      if (shouldUpdateName || shouldUpdateAvatar || shouldUpdatePhone) {
        await pool.query(
          `UPDATE contacts 
           SET name = CASE WHEN $1 = true THEN $2 ELSE name END,
               avatar_url = COALESCE($3, avatar_url),
               phone = CASE WHEN $4 = true THEN $5 ELSE phone END,
               metadata = COALESCE(metadata, '{}'::jsonb) || $6::jsonb,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $7`,
          [
            shouldUpdateName,
            finalName,
            finalAvatar,
            shouldUpdatePhone,
            finalPhone,
            JSON.stringify(finalMeta),
            contactId
          ]
        );
      }
    }

    // 2. Lưu Conversation
    const lastPreview = mediaUrl ? (messageTypeId === 2 ? '[Hình ảnh]' : '[Tài liệu]') : textContent;
    let convRes = await pool.query(
      `SELECT id, metadata FROM conversations WHERE channel_id = $1 AND contact_id = $2`,
      [channelId, contactId]
    );
    let convId;
    if (convRes.rows.length === 0) {
      const newConv = await pool.query(
        `INSERT INTO conversations (channel_id, contact_id, id__conversations_statuses, last_message_preview, last_message_at, unread_count, metadata)
         VALUES ($1, $2, 1, $3, CURRENT_TIMESTAMP, $4, $5)
         RETURNING id`,
        [channelId, contactId, lastPreview, isOutgoing ? 0 : 1, JSON.stringify(isGroup ? { is_group: true } : {})]
      );
      convId = newConv.rows[0].id;
    } else {
      convId = convRes.rows[0].id;
      const existingMeta = convRes.rows[0].metadata || {};
      const updatedMeta = { ...existingMeta, ...(isGroup ? { is_group: true } : {}) };
      await pool.query(
        `UPDATE conversations 
         SET last_message_preview = $1, 
             last_message_at = CURRENT_TIMESTAMP, 
             unread_count = CASE WHEN $3 = true THEN unread_count ELSE unread_count + 1 END,
             is_typing = false,
             updated_at = CURRENT_TIMESTAMP,
             metadata = $4
         WHERE id = $2`,
        [lastPreview, convId, isOutgoing, JSON.stringify(updatedMeta)]
      );
    }

    // 3. Kiểm tra trùng Message
    if (msgId) {
      const dup = await pool.query(
        `SELECT id FROM messages WHERE conversation_id = $1 AND external_message_id = $2`,
        [convId, msgId]
      );
      if (dup.rows.length > 0) return;
    }

    const senderTypeId = isOutgoing ? 2 : 1;
    const finalPayload = {
      ...(payload || {}),
      ...(senderName ? { sender_name: senderName } : {}),
    };

    await pool.query(
      `INSERT INTO messages (conversation_id, id__messages_sender_types, id__messages_types, content, media_url, external_message_id, id__messages_statuses, payload)
       VALUES ($1, $2, $3, $4, $5, $6, 3, $7)`,
      [convId, senderTypeId, messageTypeId, textContent, mediaUrl, msgId || null, JSON.stringify(finalPayload)]
    );
  } catch (err) {
    console.error('Lỗi lưu tin nhắn Zalo:', err.message);
  }
}

async function startZalo() {
  console.log('🚀 Khởi tạo kết nối Zalo Cá Nhân...');
  const zalo = new Zalo({ selfListen: true, logging: false });

  // Kiểm tra xem đã có session credentials đã lưu trước đó chưa
  if (fs.existsSync(credsPath)) {
    try {
      console.log('🔑 Tìm thấy phiên đăng nhập cũ, đang kết nối lại...');
      const rawCreds = fs.readFileSync(credsPath, 'utf8');
      const credentials = JSON.parse(rawCreds);
      apiInstance = await zalo.login(credentials);
      console.log('✅ Đăng nhập Zalo thành công từ phiên lưu sẵn!');
    } catch (e) {
      console.warn('⚠️ Phiên đăng nhập Zalo cũ đã hết hạn hoặc không hợp lệ. Sẽ tạo mã QR mới...');
      fs.unlinkSync(credsPath);
      apiInstance = null;
    }
  }

  // Nếu chưa có phiên đăng nhập, không tự động bật mã QR làm gián đoạn người dùng
  if (!apiInstance) {
    console.log('ℹ️ Chưa có phiên đăng nhập Zalo lưu sẵn. Vui lòng vào giao diện Web và bấm "Ấn để tạo mã QR" khi muốn liên kết.');
    return;
  }

  // Khởi tạo channel trong DB
  const ownId = apiInstance.getOwnId ? apiInstance.getOwnId() : 'zalo-user';
  let displayName = 'Zalo Account';
  try {
    const accInfo = await apiInstance.fetchAccountInfo();
    if (accInfo && accInfo.data && accInfo.data.name) {
      displayName = accInfo.data.name;
    }
  } catch (e) {}

  await initChannel(ownId, displayName);
  console.log(`👤 Tài khoản Zalo: ${displayName} (ID: ${ownId})`);

  // --- 1. LẮNG NGHE TIN NHẮN MỚI THỜI GIAN THỰC (KHỞI ĐỘNG NGAY LẬP TỨC) ---
  apiInstance.listener.on('message', async (msg) => {
    try {
      if (!msg) return;

      const chCheck = await pool.query(`SELECT is_active, external_channel_id FROM channels WHERE id = $1`, [channelId]);
      if (chCheck.rows.length === 0) return;
      if (!chCheck.rows[0].is_active) {
        await pool.query(`UPDATE channels SET is_active = true WHERE id = $1`, [channelId]);
      }

      const isSelf = Boolean(msg.isSelf);
      const data = msg.data || {};
      const isGroup = msg.type === 1 || Boolean(data.groupId);
      const peerId = String(data.groupId || msg.threadId);

      // Lấy thông tin thật (Tên, Avatar, v.v.) của người đối thoại hoặc nhóm
      const contactProfile = await getZaloContactProfile(peerId, isGroup, data.dName);
      const peerName = contactProfile.name || (isGroup ? `[Nhóm] Zalo ${peerId}` : (data.dName || `Zalo User ${peerId}`));
      let senderName = isSelf ? 'Bạn' : (data.dName || contactProfile.name || 'Thành viên');

      let textContent = '';
      let mediaUrl = null;
      let msgTypeId = 1;

      if (typeof data.content === 'string') {
        textContent = data.content;
      } else if (data.content && typeof data.content === 'object') {
        if (data.content.title) {
          textContent = data.content.title;
        } else if (data.content.href || data.content.thumb) {
          mediaUrl = data.content.href || data.content.thumb;
          textContent = '[Hình ảnh/Liên kết]';
          msgTypeId = 2;
        } else {
          textContent = JSON.stringify(data.content);
        }
      }

      if (!isSelf) {
        console.log(`[Zalo] 📥 ${senderName} (${peerName}): ${(textContent || '').slice(0, 60)}`);
      }

      await saveZaloMessage(
        peerId,
        peerName,
        textContent,
        String(data.msgId || Date.now()),
        isSelf,
        mediaUrl,
        msgTypeId,
        isGroup,
        isGroup ? senderName : null,
        { sender_name: senderName, sender_id: String(data.uidFrom || '') }
      );
    } catch (err) {
      console.error('Lỗi nhận tin nhắn Zalo live:', err.message);
    }
  });

  // --- 1.1 LẮNG NGHE THU HỒI / XÓA TIN NHẮN ZALO ---
  apiInstance.listener.on('undo', async (undo) => {
    try {
      if (!undo || !undo.data) return;
      const msgId = String(undo.data.msgId || undo.data.content?.globalMsgId || undo.data.content?.cliMsgId || '');
      if (msgId) {
        console.log(`🗑️ [Zalo] Thu hồi / xóa tin nhắn: ID ${msgId}`);
        await pool.query(`DELETE FROM messages WHERE external_message_id = $1`, [msgId]);
      }
    } catch (err) {
      console.error('Lỗi xử lý thu hồi tin Zalo:', err.message);
    }
  });

  const typingTimeouts = new Map();

  // --- 1.2 LẮNG NGHE KHÁCH ĐANG SOẠN TIN TRÊN ZALO ---
  apiInstance.listener.on('typing', async (typing) => {
    try {
      if (!typing) return;
      const peerId = String(typing.threadId || typing.uid || '');
      if (peerId) {
        await pool.query(`
          UPDATE conversations 
          SET is_typing = true, typing_updated_at = CURRENT_TIMESTAMP 
          WHERE channel_id = $1 AND contact_id = (SELECT id FROM contacts WHERE channel_id = $1 AND external_user_id = $2 LIMIT 1)
        `, [channelId, peerId]);

        // Tự động hủy trạng thái đang gõ sau 6 giây nếu người dùng dừng gõ
        if (typingTimeouts.has(peerId)) {
          clearTimeout(typingTimeouts.get(peerId));
        }
        typingTimeouts.set(peerId, setTimeout(async () => {
          try {
            await pool.query(`
              UPDATE conversations 
              SET is_typing = false 
              WHERE channel_id = $1 AND contact_id = (SELECT id FROM contacts WHERE channel_id = $1 AND external_user_id = $2 LIMIT 1) AND is_typing = true
            `, [channelId, peerId]);
          } catch (err) {}
          typingTimeouts.delete(peerId);
        }, 6000));
      }
    } catch (e) {}
  });

  apiInstance.listener.start({ retryOnClose: true });
  console.log('📡 Đã kích hoạt lắng nghe tin nhắn Zalo 2 chiều thời gian thực (Cá nhân & Nhóm)!');

  // --- 0. NẠP TÊN CÁC NHÓM ĐÃ CÓ TRONG DB VÀO CACHE BỘ NHỚ ---
  (async () => {
    try {
      // Nạp các liên hệ và nhóm đã có trong DB vào bộ nhớ đệm cache
      const dbContacts = await pool.query(
        `SELECT external_user_id, name, avatar_url, phone, metadata FROM contacts WHERE channel_id = $1`,
        [channelId]
      );
      for (const row of dbContacts.rows) {
        const isGrp = Boolean(row.metadata?.is_group || (row.name && row.name.startsWith('[Nhóm]')));
        if (isGrp) {
          groupNameCache.set(row.external_user_id, row.name);
        }
        if (row.name && !row.name.startsWith('Zalo User')) {
          contactProfileCache.set(row.external_user_id, {
            name: row.name,
            avatar_url: row.avatar_url || null,
            phone: row.phone || '',
            metadata: row.metadata || {},
          });
        }
      }
      if (dbContacts.rows.length > 0) {
        console.log(`📋 [Zalo] Đã nạp ${dbContacts.rows.length} liên hệ từ danh bạ vào bộ nhớ đệm.`);
      }
    } catch (err) {
      // Bỏ qua lỗi
    }
  })();

  // --- 2. TỰ ĐỘNG GỬI TIN NHẮN, TỆP TIN VÀ BÌNH CHỌN TỪ WEB APP SANG ZALO ---
  setInterval(async () => {
    try {
      const unsent = await pool.query(`
        SELECT m.id, m.conversation_id, m.content, m.media_url, m.id__messages_types, m.payload,
               cont.external_user_id, cont.name as contact_name, cont.metadata as contact_metadata
        FROM messages m
        JOIN conversations conv ON m.conversation_id = conv.id
        JOIN contacts cont ON conv.contact_id = cont.id
        WHERE conv.channel_id = $1 
          AND m.id__messages_sender_types = 2 
          AND (m.external_message_id IS NULL OR m.external_message_id = '')
        ORDER BY m.created_at ASC
        LIMIT 5
      `, [channelId]);

      for (const row of unsent.rows) {
        if (!row.external_user_id) continue;

        const isGroup = Boolean(
          (row.contact_metadata && (row.contact_metadata.is_group || row.contact_metadata.group_id)) ||
          (row.contact_name && row.contact_name.startsWith('[Nhóm]'))
        );
        const threadType = isGroup ? 1 : 0; // 1 = Group, 0 = User

        // 1. Kiểm tra nếu là Bình chọn (Poll) cần tạo trên nhóm Zalo
        if (row.payload && row.payload.poll && row.payload.is_pending_poll_sync && isGroup) {
          console.log(`📊 Đang tạo bình chọn trên nhóm Zalo (${row.external_user_id}): "${row.payload.poll.question}"`);
          try {
            const pollDetail = await apiInstance.createPoll({
              question: row.payload.poll.question,
              options: row.payload.poll.options.map((o) => o.content),
              allowMultiChoices: Boolean(row.payload.poll.allowMultiChoices),
              isAnonymous: Boolean(row.payload.poll.isAnonymous),
            }, row.external_user_id);

            const sentPollId = String(pollDetail?.poll_id || Date.now());
            const updatedPayload = {
              ...row.payload,
              is_pending_poll_sync: false,
              poll: {
                ...row.payload.poll,
                poll_id: sentPollId,
              },
            };

            await pool.query(`
              UPDATE messages 
              SET external_message_id = $1, id__messages_statuses = 3, payload = $2 
              WHERE id = $3
            `, [`zalo_poll_${sentPollId}`, JSON.stringify(updatedPayload), row.id]);
            console.log(`✅ Tạo bình chọn thành công trên nhóm Zalo! Poll ID: ${sentPollId}`);
            continue;
          } catch (pollErr) {
            console.error('❌ Lỗi tạo bình chọn qua Zalo createPoll API:', pollErr.message);
            await pool.query(`UPDATE messages SET external_message_id = $1, id__messages_statuses = 3 WHERE id = $2`, [`poll_local_${Date.now()}`, row.id]);
            continue;
          }
        }

        // 2. Kiểm tra nếu có tệp/hình ảnh đính kèm thực tế
        let attachmentPaths = [];
        if (row.media_url) {
          const relativeClean = row.media_url.replace(/^\//, '');
          const localDiskPath = path.resolve(__dirname, '../../public', relativeClean);
          if (fs.existsSync(localDiskPath)) {
            attachmentPaths.push(localDiskPath);
          }
        }

        try {
          let sendResult;
          if (attachmentPaths.length > 0) {
            // Gửi có đính kèm file thực tế (zca-js uploadAttachment tự động)
            sendResult = await apiInstance.sendMessage(
              {
                msg: row.content && !row.content.startsWith('[') ? row.content : '',
                attachments: attachmentPaths,
              },
              row.external_user_id,
              threadType
            );
          } else {
            // Gửi tin nhắn text thuần
            const sendPayload = typeof row.content === 'string' ? { msg: row.content } : row.content;
            sendResult = await apiInstance.sendMessage(
              sendPayload,
              row.external_user_id,
              threadType
            );
          }

          const sentMsgId = sendResult && sendResult.message ? String(sendResult.message.msgId) : `zalo_sent_${Date.now()}`;

          await pool.query(`
            UPDATE messages 
            SET external_message_id = $1, id__messages_statuses = 3 
            WHERE id = $2
          `, [sentMsgId, row.id]);
          console.log(`[Zalo] 📤 Đã gửi tới ${row.contact_name || row.external_user_id}: "${(row.content || '[Tệp đính kèm]').slice(0, 50)}"`);
        } catch (sendErr) {
          console.error(`❌ [Zalo] Lỗi gửi tin tới ${row.external_user_id}:`, sendErr.message);
          // Thử lại dạng text fallback nếu có
          try {
            if (row.content) {
              await apiInstance.sendMessage(row.content, row.external_user_id, threadType);
              await pool.query(`UPDATE messages SET external_message_id = $1, id__messages_statuses = 3 WHERE id = $2`, [`zalo_${Date.now()}`, row.id]);
              console.log(`✅ Gửi tin nhắn fallback thành công qua Zalo!`);
            } else {
              await pool.query(`UPDATE messages SET external_message_id = 'ERR' WHERE id = $1`, [row.id]);
            }
          } catch (fallbackErr) {
            await pool.query(`UPDATE messages SET external_message_id = 'ERR' WHERE id = $1`, [row.id]);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }, 1000);
}

startZalo().catch((err) => {
  console.error('❌ Lỗi khởi động Zalo Sync:', err);
});
