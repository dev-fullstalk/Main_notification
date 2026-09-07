-- 1. Khởi tạo Schema
CREATE SCHEMA IF NOT EXISTS notification;
SET search_path TO notification;


-- =========================================================
-- KHỐI 1: CÁC BẢNG CON (ĐỊNH DẠNG: <bảng cha>_<bảng con>)
-- =========================================================

-- Bảng con của users: Vai trò / Quyền hạn
CREATE TABLE notification.users_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO notification.users_roles (name) VALUES 
('admin'), ('supervisor'), ('agent');

-- Bảng con của channels: Nền tảng kết nối
CREATE TABLE notification.channels_platforms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO notification.channels_platforms (name) VALUES 
('facebook'), ('zalo'), ('telegram'), ('tiktok'), ('livechat');

-- Bảng con của conversations: Trạng thái hội thoại
CREATE TABLE notification.conversations_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO notification.conversations_statuses (name) VALUES 
('open'), ('pending'), ('resolved'), ('closed');

-- Bảng con của messages: Loại người gửi
CREATE TABLE notification.messages_sender_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO notification.messages_sender_types (name) VALUES 
('customer'), ('agent'), ('bot'), ('system');

-- Bảng con của messages: Định dạng tin nhắn
CREATE TABLE notification.messages_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO notification.messages_types (name) VALUES 
('text'), ('image'), ('video'), ('file'), ('audio'), ('sticker');

-- Bảng con của messages: Trạng thái gửi tin
CREATE TABLE notification.messages_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO notification.messages_statuses (name) VALUES 
('pending'), ('sent'), ('delivered'), ('read'), ('failed');

-- =========================================================
-- KHỐI 2: CÁC BẢNG CHÍNH (KHÓA NGOẠI DẠNG: id__<bảng_cha>_<bảng_con>)
-- =========================================================

-- 1. Bảng Users (Nhân viên)
CREATE TABLE notification.users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    id__users_roles INT NOT NULL DEFAULT 3 REFERENCES notification.users_roles(id),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Channels (Kênh kết nối - Cột 1)
CREATE TABLE notification.channels (
    id BIGSERIAL PRIMARY KEY,
    id__channels_platforms INT NOT NULL REFERENCES notification.channels_platforms(id),
    name VARCHAR(255) NOT NULL,
    external_channel_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    avatar_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_channels_platform_external UNIQUE (id__channels_platforms, external_channel_id)
);

-- 3. Bảng Contacts (Khách hàng)
CREATE TABLE notification.contacts (
    id BIGSERIAL PRIMARY KEY,
    channel_id BIGINT NOT NULL REFERENCES notification.channels(id) ON DELETE CASCADE,
    external_user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_contacts_channel_external UNIQUE (channel_id, external_user_id)
);

-- 4. Bảng Conversations (Bong bóng chat / Hội thoại - Cột 2)
CREATE TABLE notification.conversations (
    id BIGSERIAL PRIMARY KEY,
    channel_id BIGINT NOT NULL REFERENCES notification.channels(id) ON DELETE CASCADE,
    contact_id BIGINT NOT NULL REFERENCES notification.contacts(id) ON DELETE CASCADE,
    assigned_user_id BIGINT REFERENCES notification.users(id) ON DELETE SET NULL,
    id__conversations_statuses INT NOT NULL DEFAULT 1 REFERENCES notification.conversations_statuses(id),
    last_message_preview TEXT,
    last_message_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    unread_count INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_typing BOOLEAN DEFAULT FALSE,
    typing_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_conversations_channel_contact UNIQUE (channel_id, contact_id)
);

-- 5. Bảng Messages (Từng tin nhắn & lưu Agent nào gửi - Cột 3)
CREATE TABLE notification.messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES notification.conversations(id) ON DELETE CASCADE,
    id__messages_sender_types INT NOT NULL REFERENCES notification.messages_sender_types(id),
    sender_user_id BIGINT REFERENCES notification.users(id) ON DELETE SET NULL,
    id__messages_types INT NOT NULL DEFAULT 1 REFERENCES notification.messages_types(id),
    content TEXT,
    media_url TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    external_message_id VARCHAR(255),
    id__messages_statuses INT NOT NULL DEFAULT 2 REFERENCES notification.messages_statuses(id),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng Outbound Typing (Lưu trạng thái agent đang gõ để đồng bộ ra ngoài)
CREATE TABLE notification.outbound_typing (
    channel_id BIGINT NOT NULL REFERENCES notification.channels(id) ON DELETE CASCADE,
    external_user_id VARCHAR(255) NOT NULL,
    is_typing BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_outbound_typing UNIQUE (channel_id, external_user_id)
);

-- =========================================================
-- KHỐI 3: INDEX & TRIGGER
-- =========================================================

CREATE INDEX idx_conversations_channel_time ON notification.conversations (channel_id, last_message_at DESC);
CREATE INDEX idx_messages_conversation_time ON notification.messages (conversation_id, created_at ASC);
CREATE UNIQUE INDEX idx_messages_prevent_dup ON notification.messages (conversation_id, external_message_id)
WHERE external_message_id IS NOT NULL;

CREATE OR REPLACE FUNCTION notification.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at 
BEFORE UPDATE ON notification.users 
FOR EACH ROW EXECUTE FUNCTION notification.update_updated_at_column();

CREATE TRIGGER trg_channels_updated_at 
BEFORE UPDATE ON notification.channels 
FOR EACH ROW EXECUTE FUNCTION notification.update_updated_at_column();

CREATE TRIGGER trg_contacts_updated_at 
BEFORE UPDATE ON notification.contacts 
FOR EACH ROW EXECUTE FUNCTION notification.update_updated_at_column();

CREATE TRIGGER trg_conversations_updated_at 
BEFORE UPDATE ON notification.conversations 
FOR EACH ROW EXECUTE FUNCTION notification.update_updated_at_column();

-- =========================================================
-- KHỐI 4: REAL-TIME NOTIFICATION TRIGGERS (LISTEN / NOTIFY)
-- =========================================================

CREATE OR REPLACE FUNCTION notification.notify_chat_events()
RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
BEGIN
    IF (TG_TABLE_NAME = 'messages') THEN
        payload = json_build_object(
            'event', 'new_message',
            'data', json_build_object(
                'id', NEW.id,
                'conversation_id', NEW.conversation_id,
                'id__messages_sender_types', NEW.id__messages_sender_types,
                'sender_type', CASE WHEN NEW.id__messages_sender_types = 1 THEN 'customer' ELSE 'agent' END,
                'sender_user_id', NEW.sender_user_id,
                'id__messages_types', NEW.id__messages_types,
                'message_type', CASE 
                    WHEN NEW.id__messages_types = 2 THEN 'image'
                    WHEN NEW.id__messages_types = 3 THEN 'video'
                    WHEN NEW.id__messages_types = 4 THEN 'file'
                    WHEN NEW.id__messages_types = 5 THEN 'audio'
                    WHEN NEW.id__messages_types = 6 THEN 'sticker'
                    ELSE 'text'
                END,
                'content', NEW.content,
                'media_url', NEW.media_url,
                'external_message_id', NEW.external_message_id,
                'status', CASE WHEN NEW.id__messages_statuses = 3 THEN 'delivered' WHEN NEW.id__messages_statuses = 4 THEN 'read' ELSE 'sent' END,
                'created_at', NEW.created_at
            )
        );
        PERFORM pg_notify('chat_realtime', payload::text);
    ELSIF (TG_TABLE_NAME = 'conversations') THEN
        IF (
            OLD.last_message_preview IS DISTINCT FROM NEW.last_message_preview OR
            OLD.last_message_at IS DISTINCT FROM NEW.last_message_at OR
            OLD.unread_count IS DISTINCT FROM NEW.unread_count OR
            OLD.is_typing IS DISTINCT FROM NEW.is_typing
        ) THEN
            payload = json_build_object(
                'event', 'conversation_updated',
                'data', json_build_object(
                    'id', NEW.id,
                    'channel_id', NEW.channel_id,
                    'last_message_preview', NEW.last_message_preview,
                    'last_message_at', NEW.last_message_at,
                    'unread_count', NEW.unread_count,
                    'is_typing', CASE 
                        WHEN NEW.is_typing = true AND (NEW.typing_updated_at IS NULL OR NEW.typing_updated_at < CURRENT_TIMESTAMP - INTERVAL '6 seconds') THEN false
                        ELSE NEW.is_typing
                    END
                )
            );
            PERFORM pg_notify('chat_realtime', payload::text);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_messages_notify ON notification.messages;
CREATE TRIGGER trg_messages_notify
AFTER INSERT ON notification.messages
FOR EACH ROW EXECUTE FUNCTION notification.notify_chat_events();

DROP TRIGGER IF EXISTS trg_conversations_notify ON notification.conversations;
CREATE TRIGGER trg_conversations_notify
AFTER UPDATE ON notification.conversations
FOR EACH ROW EXECUTE FUNCTION notification.notify_chat_events();