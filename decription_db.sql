-- ====================================================================================================
-- TỆP: database.sql
-- DỰ ÁN: TERAX OMNICHANNEL CENTRAL INBOX (HỆ THỐNG QUẢN TRỊ TIN NHẮN ĐA KÊNH TẬP TRUNG)
-- TÁC GIẢ: Antigravity Coding Assistant (Pair Programming cùng User)
-- CƠ SỞ DỮ LIỆU: PostgreSQL (Schema: notification)
-- PHIÊN BẢN: 2.0 (Cập nhật đầy đủ Tables, Views, Functions, Triggers, Indexes & Giải thích kiến trúc)
-- ====================================================================================================

/*
======================================================================================================
MỤC LỤC TÀI LIỆU KIẾN TRÚC DATABASE
======================================================================================================
PHẦN 1: KHỞI TẠO SCHEMA & EXTENSION
PHẦN 2: CÁC BẢNG DANH MỤC / TỪ ĐIỂN (LOOKUP TABLES)
PHẦN 3: CÁC BẢNG NGHIỆP VỤ CỐT LÕI (CORE BUSINESS TABLES)
PHẦN 4: BẢNG TRUNG GIAN ĐỒNG BỘ ĐANG GÕ (OUTBOUND TYPING)
PHẦN 5: CHỈ MỤC TỐI ƯU HIỆU NĂNG TRUY VẤN (INDEXES)
PHẦN 6: HÀM (FUNCTIONS) & KÍCH HOẠT TỰ ĐỘNG (TRIGGERS) - GIẢI THÍCH CHI TIẾT
PHẦN 7: CÁC KHUNG NHÌN TỔNG HỢP (VIEWS) - GIẢI THÍCH TẠI SAO CẦN VIEW & LIÊN QUAN ĐẾN LUỒNG NÀO
PHẦN 8: BẢN ĐỒ ÁNH XẠ: QUAN HỆ GIỮA CÁC BẢNG & CÁC LUỒNG VẬN HÀNH ỨNG DỤNG
======================================================================================================
*/

-- ====================================================================================================
-- PHẦN 1: KHỞI TẠO SCHEMA & EXTENSION
-- ====================================================================================================

-- 1.1 Khởi tạo Schema riêng biệt 'notification'
-- TẠI SAO LÀM THẾ?
-- Việc dùng schema riêng (thay vì vứt chung vào 'public') giúp cô lập toàn bộ module chat/omnichannel,
-- dễ dàng backup/restore độc lập, phân quyền truy cập người dùng và không bị xung đột tên bảng với
-- các hệ sinh thái khác (như CRM, ERP, E-commerce, Kế toán).
CREATE SCHEMA IF NOT EXISTS notification;

-- Đặt search_path mặc định ưu tiên tìm trong schema notification
SET search_path TO notification, public;


-- ====================================================================================================
-- PHẦN 2: CÁC BẢNG DANH MỤC / TỪ ĐIỂN (LOOKUP TABLES)
-- ====================================================================================================
-- TẠI SAO LẠI THIẾT KẾ BẢNG CON THAY VÌ DÙNG KIỂU DỮ LIỆU ENUM CỦA POSTGRESQL?
-- 1. Tính linh hoạt mở rộng (Extensibility): Khi cần bổ sung thêm nền tảng mới (ví dụ: TikTok Shop,
--    Shopee, Lazada, LiveChat), chỉ cần một câu lệnh INSERT INTO đơn giản, KHÔNG CẦN ALTER TYPE (vốn gây khóa bảng).
-- 2. Đa ngôn ngữ (i18n): Dễ dàng JOIN lấy tên hiển thị tiếng Việt/tiếng Anh mà không phải hardcode trên code.
-- 3. Chuẩn hóa khóa ngoại: Đặt tên dạng `id__<bảng_cha>_<bảng_con>` giúp ORM và dev nhìn vào là biết ngay
--    khóa ngoại này tham chiếu đến bảng danh mục nào.

-- 2.1 Bảng con của users: Vai trò / Quyền hạn của nhân viên
CREATE TABLE IF NOT EXISTS notification.users_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO notification.users_roles (name) VALUES 
('admin'), 
('supervisor'), 
('agent')
ON CONFLICT (name) DO NOTHING;

-- 2.2 Bảng con của channels: Danh sách các nền tảng mạng xã hội kết nối
CREATE TABLE IF NOT EXISTS notification.channels_platforms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO notification.channels_platforms (name) VALUES 
('facebook'), 
('zalo'), 
('telegram'), 
('tiktok'), 
('whatsapp'),
('livechat')
ON CONFLICT (name) DO NOTHING;

-- 2.3 Bảng con của conversations: Trạng thái xử lý của cuộc hội thoại
CREATE TABLE IF NOT EXISTS notification.conversations_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO notification.conversations_statuses (name) VALUES 
('open'),       -- Cuộc trò chuyện đang mở, cần nhân viên tương tác
('pending'),    -- Đang chờ phản hồi (từ phía khách hoặc bộ phận kỹ thuật)
('resolved'),   -- Nhân viên đã giải quyết xong vấn đề của khách
('closed')      -- Đã đóng hoàn tất phiên chat
ON CONFLICT (name) DO NOTHING;

-- 2.4 Bảng con của messages: Phân loại người gửi tin nhắn
CREATE TABLE IF NOT EXISTS notification.messages_sender_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO notification.messages_sender_types (name) VALUES 
('customer'),   -- Khách hàng gửi vào từ mạng xã hội
('agent'),      -- Nhân viên trực chat phản hồi từ Web App
('bot'),        -- Chatbot tự động trả lời (AI / Rule-based)
('system')      -- Tin nhắn hệ thống (ví dụ: "Cuộc gọi nhỡ", "Nhân viên A đã nhận khách")
ON CONFLICT (name) DO NOTHING;

-- 2.5 Bảng con của messages: Định dạng nội dung tin nhắn
CREATE TABLE IF NOT EXISTS notification.messages_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO notification.messages_types (name) VALUES 
('text'),       -- Tin nhắn văn bản thuần túy
('image'),      -- Hình ảnh (JPEG, PNG, GIF, WebP)
('video'),      -- Video (MP4)
('file'),       -- Tài liệu đính kèm (PDF, DOCX, XLSX, ZIP)
('audio'),      -- Tin nhắn thoại (Voice note)
('sticker')     -- Nhãn dán biểu cảm
ON CONFLICT (name) DO NOTHING;

-- 2.6 Bảng con của messages: Trạng thái gửi nhận tin nhắn
CREATE TABLE IF NOT EXISTS notification.messages_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);
INSERT INTO notification.messages_statuses (name) VALUES 
('pending'),    -- Tin nhắn đang chờ gửi đi
('sent'),       -- Đã gửi đi thành công từ hệ thống
('delivered'),  -- Khách hàng đã nhận được tin nhắn trên máy họ
('read'),       -- Khách hàng hoặc nhân viên đã mở xem tin nhắn
('failed')      -- Gửi thất bại (do mất mạng, token hết hạn, bị chặn)
ON CONFLICT (name) DO NOTHING;


-- ====================================================================================================
-- PHẦN 3: CÁC BẢNG NGHIỆP VỤ CỐT LÕI (CORE BUSINESS TABLES)
-- ====================================================================================================

-- ----------------------------------------------------------------------------------------------------
-- 3.1 BẢNG: notification.users (Tài khoản nhân viên trực chat)
-- LIÊN QUAN ĐẾN LUỒNG:
-- - Luồng xác thực & đăng nhập hệ thống.
-- - Luồng phân công công việc (Assign conversation): Gán khách cho ai chăm sóc.
-- - Luồng lưu vết người trả lời tin nhắn (Audit log): Khách nhận tin nhắn do nhân viên nào gõ.
-- - Luồng đo lường KPI / Leaderboard: Thống kê số chat đã xử lý, thời gian phản hồi trung bình.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification.users (
    id BIGSERIAL PRIMARY KEY,                                     -- ID định danh duy nhất nhân viên
    name VARCHAR(255) NOT NULL,                                   -- Họ tên nhân viên hiển thị trên giao diện
    email VARCHAR(255) UNIQUE NOT NULL,                           -- Email dùng để đăng nhập hệ thống
    password_hash VARCHAR(255) NOT NULL,                          -- Mật khẩu đã được băm an toàn (bcrypt/argon2)
    id__users_roles INT NOT NULL DEFAULT 3                        -- Vai trò nhân viên (Khóa ngoại)
        REFERENCES notification.users_roles(id),
    avatar_url TEXT,                                              -- Link ảnh đại diện nhân viên
    is_active BOOLEAN DEFAULT TRUE,                               -- Trạng thái: TRUE (hoạt động), FALSE (bị khóa)
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,             -- Thời điểm tạo tài khoản
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP              -- Thời điểm cập nhật thông tin gần nhất
);

-- ----------------------------------------------------------------------------------------------------
-- 3.2 BẢNG: notification.channels (Kênh kết nối & Tài khoản mạng xã hội)
-- LIÊN QUAN ĐẾN LUỒNG:
-- - Luồng Quản lý Kênh ở Cột 1 (Sidebar Channels): Hiển thị danh sách Fanpage, số Zalo, Bot Telegram...
-- - Luồng Kết nối kênh mới (`ConnectModal`): Quét QR, nhập mã Token.
-- - Luồng Xác thực gửi tin ra ngoài: Chứa `access_token` và `external_channel_id` để Background Worker
--   gọi API Meta Graph, Zalo OpenAPI, GramJS, Baileys.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification.channels (
    id BIGSERIAL PRIMARY KEY,                                     -- ID nội bộ của kênh trong hệ thống
    id__channels_platforms INT NOT NULL                           -- Nền tảng (1: FB, 2: Zalo, 3: Tele, 5: WA...)
        REFERENCES notification.channels_platforms(id),
    name VARCHAR(255) NOT NULL,                                   -- Tên hiển thị (ví dụ: "Fanpage Giày Terax", "Zalo 0901...")
    external_channel_id VARCHAR(255) NOT NULL,                    -- ID thật trên mạng xã hội (Page ID FB, Phone WA, OA ID...)
    access_token TEXT,                                            -- Token chứng thực để gửi/nhận tin
    refresh_token TEXT,                                           -- Token làm mới khi access token hết hạn
    token_expires_at TIMESTAMPTZ,                                 -- Thời điểm hết hạn token
    avatar_url TEXT,                                              -- Logo/Ảnh đại diện của Kênh
    metadata JSONB DEFAULT '{}'::jsonb,                           -- Dữ liệu mở rộng tùy biến theo từng nền tảng
    is_active BOOLEAN DEFAULT TRUE,                               -- Trạng thái: TRUE (Đang Online), FALSE (Ngắt kết nối)
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- Ràng buộc: Một nền tảng không được trùng external_channel_id (tránh kết nối 1 Page FB 2 lần)
    CONSTRAINT uq_channels_platform_external UNIQUE (id__channels_platforms, external_channel_id)
);

-- ----------------------------------------------------------------------------------------------------
-- 3.3 BẢNG: notification.contacts (Hồ sơ khách hàng đa kênh)
-- LIÊN QUAN ĐẾN LUỒNG:
-- - Luồng Hứng tin nhắn Inbound: Khi có người lạ nhắn tin tới, worker tìm kiếm theo `external_user_id`.
--   Nếu chưa có thì tự động tạo khách hàng mới tại đây.
-- - Luồng Hiển thị thông tin CRM (Cột 4 - CustomerInfoPanel): Họ tên, avatar, số điện thoại, email, ghi chú.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification.contacts (
    id BIGSERIAL PRIMARY KEY,                                     -- ID nội bộ của khách hàng
    channel_id BIGINT NOT NULL                                    -- Khách hàng này chat qua Kênh nào
        REFERENCES notification.channels(id) ON DELETE CASCADE,
    external_user_id VARCHAR(255) NOT NULL,                       -- ID người dùng trên MXH (PSID Facebook, SĐT Zalo/WA...)
    name VARCHAR(255),                                            -- Tên khách hàng (lấy từ profile MXH hoặc nhân viên sửa)
    avatar_url TEXT,                                              -- Ảnh đại diện khách hàng
    phone VARCHAR(20),                                            -- Số điện thoại liên hệ
    email VARCHAR(255),                                           -- Địa chỉ email
    metadata JSONB DEFAULT '{}'::jsonb,                           -- Thông tin CRM mở rộng (Địa chỉ, Tags, Sở thích...)
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- Ràng buộc: Trên cùng 1 kênh, 1 khách hàng chỉ có duy nhất 1 hồ sơ
    CONSTRAINT uq_contacts_channel_external UNIQUE (channel_id, external_user_id)
);

-- ----------------------------------------------------------------------------------------------------
-- 3.4 BẢNG: notification.conversations (Cuộc hội thoại trung tâm - Bong bóng chat)
-- LIÊN QUAN ĐẾN LUỒNG:
-- - Luồng Hiển thị danh sách hội thoại ở Cột 2 (Column2ConvList):
--   + Sắp xếp theo `last_message_at DESC` (hội thoại mới nhất nhảy lên đầu).
--   + Hiển thị tin nhắn xem trước bằng `last_message_preview`.
--   + Hiển thị huy hiệu số tin chưa đọc bằng `unread_count`.
--   + Lọc theo tab trạng thái bằng `id__conversations_statuses`.
-- - Luồng Trạng thái gõ phím: `is_typing` và `typing_updated_at` nhấp nháy chữ "Đang gõ...".
-- - Luồng Phân công: `assigned_user_id` chỉ định nhân viên nào đang chịu trách nhiệm giải quyết.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification.conversations (
    id BIGSERIAL PRIMARY KEY,                                     -- Mã cuộc hội thoại
    channel_id BIGINT NOT NULL                                    -- Hội thoại thuộc Kênh nào
        REFERENCES notification.channels(id) ON DELETE CASCADE,
    contact_id BIGINT NOT NULL                                    -- Hội thoại với Khách hàng nào
        REFERENCES notification.contacts(id) ON DELETE CASCADE,
    assigned_user_id BIGINT                                       -- Nhân viên nào phụ trách (NULL = chưa phân công)
        REFERENCES notification.users(id) ON DELETE SET NULL,
    id__conversations_statuses INT NOT NULL DEFAULT 1             -- Trạng thái: 1(open), 2(pending), 3(resolved), 4(closed)
        REFERENCES notification.conversations_statuses(id),
    last_message_preview TEXT,                                    -- Đoạn text tin nhắn cuối cùng để hiện ở Cột 2
    last_message_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,        -- Thời điểm tin nhắn cuối (dùng để sắp xếp)
    unread_count INT DEFAULT 0,                                   -- Số tin nhắn chưa đọc (nhân viên chưa mở ra xem)
    metadata JSONB DEFAULT '{}'::jsonb,                           -- Dữ liệu mở rộng (Tags, ghi chú phiên chat...)
    is_typing BOOLEAN DEFAULT FALSE,                              -- Cờ đánh dấu khách có đang gõ bàn phím không
    typing_updated_at TIMESTAMPTZ,                                -- Thời điểm gần nhất nhận được sự kiện đang gõ
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    -- Ràng buộc: Một kênh và một khách hàng chỉ có duy nhất một phiên hội thoại xuyên suốt
    CONSTRAINT uq_conversations_channel_contact UNIQUE (channel_id, contact_id)
);

-- ----------------------------------------------------------------------------------------------------
-- 3.5 BẢNG: notification.messages (Chi tiết từng tin nhắn - Message Feed)
-- LIÊN QUAN ĐẾN LUỒNG:
-- - Luồng Hiển thị Cột 3 (Column3ChatArea): Cuộn xem toàn bộ lịch sử tin nhắn của cuộc trò chuyện.
-- - Luồng Inbound: Lưu tin nhắn khách gửi đến (sender_type = 1).
-- - Luồng Outbound: Lưu tin nhắn nhân viên trả lời (sender_type = 2, sender_user_id = ID nhân viên).
-- - Luồng Đa phương tiện: Lưu đường link ảnh, video, file đính kèm (`media_url`, `id__messages_types`).
-- - Luồng Chống trùng lặp (Deduplication): `external_message_id` đảm bảo 1 tin nhắn không bị lưu 2 lần.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification.messages (
    id BIGSERIAL PRIMARY KEY,                                     -- Mã tin nhắn duy nhất
    conversation_id BIGINT NOT NULL                               -- Tin nhắn này thuộc cuộc hội thoại nào
        REFERENCES notification.conversations(id) ON DELETE CASCADE,
    id__messages_sender_types INT NOT NULL                        -- Ai gửi: 1 (Khách), 2 (Nhân viên), 3 (Bot), 4 (Hệ thống)
        REFERENCES notification.messages_sender_types(id),
    sender_user_id BIGINT                                         -- Nếu nhân viên gửi thì lưu ID của nhân viên đó (NULL nếu là khách)
        REFERENCES notification.users(id) ON DELETE SET NULL,
    id__messages_types INT NOT NULL DEFAULT 1                     -- Định dạng: 1 (text), 2 (image), 3 (video), 4 (file)...
        REFERENCES notification.messages_types(id),
    content TEXT,                                                 -- Nội dung văn bản của tin nhắn
    media_url TEXT,                                               -- Đường link URL file ảnh/video/tài liệu đính kèm
    payload JSONB DEFAULT '{}'::jsonb,                            -- Dữ liệu kỹ thuật nguyên bản từ webhook (nếu cần đối soát)
    external_message_id VARCHAR(255),                             -- ID tin nhắn từ server Telegram/WhatsApp/Meta/Zalo
    id__messages_statuses INT NOT NULL DEFAULT 2                  -- Trạng thái: 1(pending), 2(sent), 3(delivered), 4(read)
        REFERENCES notification.messages_statuses(id),
    error_message TEXT,                                           -- Ghi nhận lỗi nếu gửi thất bại ra mạng xã hội
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP              -- Thời điểm gửi tin nhắn
);


-- ====================================================================================================
-- PHẦN 4: BẢNG TRUNG GIAN ĐỒNG BỘ ĐANG GÕ (OUTBOUND TYPING)
-- ====================================================================================================
-- LIÊN QUAN ĐẾN LUỒNG:
-- - Khi Nhân viên gõ phím trên Web App (Cột 3), Frontend gửi request POST /api/typing.
-- - Bản ghi được INSERT/UPDATE vào bảng này.
-- - Các Background Sync Worker (Telegram/WhatsApp/Zalo) định kỳ quét bảng này: nếu có `is_typing = true`
--   trong vòng 5 giây gần nhất, worker sẽ gọi lệnh phát tín hiệu gõ phím sang ứng dụng di động của khách!
CREATE TABLE IF NOT EXISTS notification.outbound_typing (
    channel_id BIGINT NOT NULL                                    -- Đang gõ trên Kênh nào
        REFERENCES notification.channels(id) ON DELETE CASCADE,
    external_user_id VARCHAR(255) NOT NULL,                       -- Đang gõ gửi cho Khách hàng nào
    is_typing BOOLEAN DEFAULT FALSE,                              -- TRUE (đang gõ), FALSE (dừng gõ)
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,             -- Thời điểm gõ phím gần nhất
    CONSTRAINT uq_outbound_typing UNIQUE (channel_id, external_user_id)
);


-- ====================================================================================================
-- PHẦN 5: CHỈ MỤC TỐI ƯU HIỆU NĂNG TRUY VẤN (INDEXES)
-- ====================================================================================================
-- TẠI SAO PHẢI CÓ CÁC INDEX NÀY?
-- Trong hệ thống Chat, số lượng tin nhắn tăng lên rất nhanh (hàng trăm ngàn đến hàng triệu dòng).
-- Nếu không có index, mỗi khi mở Cột 2 hoặc Cột 3, PostgreSQL sẽ phải quét toàn bộ bảng (Seq Scan)
-- dẫn đến chậm, đơ lag và gây sập CPU database!

-- 5.1 Tối ưu Cột 2: Lấy danh sách hội thoại theo kênh và sắp xếp theo thời gian tin nhắn cuối cùng
CREATE INDEX IF NOT EXISTS idx_conversations_channel_time 
ON notification.conversations (channel_id, last_message_at DESC);

-- 5.2 Tối ưu Cột 3: Lấy toàn bộ lịch sử tin nhắn của 1 cuộc trò chuyện theo thứ tự thời gian tăng dần
CREATE INDEX IF NOT EXISTS idx_messages_conversation_time 
ON notification.messages (conversation_id, created_at ASC);

-- 5.3 Chỉ mục Chống trùng lặp tin nhắn (Unique Partial Index):
-- Đảm bảo với 1 cuộc hội thoại, không bao giờ có 2 tin nhắn có cùng external_message_id
-- (Chỉ áp dụng với các tin có external_message_id IS NOT NULL, tin nhân viên gõ lúc chưa gửi thì vẫn NULL được).
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_prevent_dup 
ON notification.messages (conversation_id, external_message_id)
WHERE external_message_id IS NOT NULL;


-- ====================================================================================================
-- PHẦN 6: HÀM (FUNCTIONS) & KÍCH HOẠT TỰ ĐỘNG (TRIGGERS) - GIẢI THÍCH CHI TIẾT
-- ====================================================================================================

-- ----------------------------------------------------------------------------------------------------
-- 6.1 HÀM: update_updated_at_column()
-- TẠI SAO PHẢI LÀM HÀM NÀY?
-- Trong mô hình cơ sở dữ liệu hiện đại, trường `updated_at` đóng vai trò tối quan trọng để:
-- 1. Biết chính xác bản ghi thay đổi lần cuối lúc nào (Audit trail).
-- 2. Phục vụ cơ chế đồng bộ (Synchronization) & Polling: Backend hoặc ứng dụng client có thể truy vấn:
--    "Lấy những bản ghi có updated_at > <thời điểm trước đó>" để lấy đúng dữ liệu vừa thay đổi.
-- Thay vì bắt buộc lập trình viên ở mọi tầng code (NodeJS, API, Worker, SQL) phải tự viết
-- `SET updated_at = CURRENT_TIMESTAMP`, hàm Trigger này sẽ TỰ ĐỘNG làm việc đó ở mức Database engine,
-- không bao giờ lo bị quên!
-- ----------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notification.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------------------------------
-- 6.2 CÁC TRIGGER 'BEFORE UPDATE':
-- TẠI SAO LẠI DÙNG 'BEFORE UPDATE' MÀ KHÔNG PHẢI 'AFTER UPDATE'?
-- - BEFORE UPDATE: Được kích hoạt ngay TRƯỚC KHI bản ghi được ghi xuống đĩa. Lúc này PostgreSQL cho phép
--   can thiệp trực tiếp vào biến `NEW` (gán `NEW.updated_at = CURRENT_TIMESTAMP`) trong cùng 1 chu kỳ I/O,
--   không phát sinh câu lệnh UPDATE thứ hai, cực kỳ nhẹ và tối ưu hiệu năng.
-- - Nếu dùng AFTER UPDATE: Bản ghi đã ghi xong, muốn sửa lại `updated_at` thì phải chạy thêm một lệnh UPDATE
--   nữa, dẫn đến vòng lặp vô tận (infinite loop trigger) hoặc tốn gấp đôi tài nguyên ghi đĩa!
-- ----------------------------------------------------------------------------------------------------

-- Trigger tự động cập nhật thời gian cho bảng users
DROP TRIGGER IF EXISTS trg_users_updated_at ON notification.users;
CREATE TRIGGER trg_users_updated_at 
BEFORE UPDATE ON notification.users 
FOR EACH ROW EXECUTE FUNCTION notification.update_updated_at_column();

-- Trigger tự động cập nhật thời gian cho bảng channels
DROP TRIGGER IF EXISTS trg_channels_updated_at ON notification.channels;
CREATE TRIGGER trg_channels_updated_at 
BEFORE UPDATE ON notification.channels 
FOR EACH ROW EXECUTE FUNCTION notification.update_updated_at_column();

-- Trigger tự động cập nhật thời gian cho bảng contacts
DROP TRIGGER IF EXISTS trg_contacts_updated_at ON notification.contacts;
CREATE TRIGGER trg_contacts_updated_at 
BEFORE UPDATE ON notification.contacts 
FOR EACH ROW EXECUTE FUNCTION notification.update_updated_at_column();

-- Trigger tự động cập nhật thời gian cho bảng conversations
DROP TRIGGER IF EXISTS trg_conversations_updated_at ON notification.conversations;
CREATE TRIGGER trg_conversations_updated_at 
BEFORE UPDATE ON notification.conversations 
FOR EACH ROW EXECUTE FUNCTION notification.update_updated_at_column();

-- ----------------------------------------------------------------------------------------------------
-- 6.3 HÀM & TRIGGER PHÁT SỰ KIỆN THỜI GIAN THỰC (REAL-TIME PUSH QUA LISTEN / NOTIFY)
-- TẠI SAO PHẢI LÀM HÀM NÀY?
-- 1. Loại bỏ hoàn toàn cơ chế Polling (liên tục gõ cửa database mỗi 1.2s gây tốn CPU & ngốn tài nguyên).
-- 2. Ngay khi có tin nhắn mới (INSERT messages) hoặc cập nhật hội thoại (UPDATE conversations như đang gõ,
--    tin nhắn mới, số tin chưa đọc), PostgreSQL tự động phát tín hiệu NOTIFY 'chat_realtime' kèm chuỗi JSON.
-- 3. Server Node.js (Next.js) chỉ cần mở duy nhất 1 kết nối LISTEN 'chat_realtime' và đẩy (PUSH) tức thì
--    xuống trình duyệt qua Server-Sent Events (SSE) với độ trễ dưới 20 mili-giây.
-- ----------------------------------------------------------------------------------------------------
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
                    'is_typing', NEW.is_typing
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



-- ====================================================================================================
-- PHẦN 7: CÁC KHUNG NHÌN TỔNG HỢP (VIEWS) - GIẢI THÍCH TẠI SAO CẦN VIEW & LIÊN QUAN ĐẾN LUỒNG NÀO
-- ====================================================================================================

-- ----------------------------------------------------------------------------------------------------
-- 7.1 VIEW: notification.v_conversations_detail
-- TẠI SAO LẠI CẦN VIEW NÀY?
-- Để hiển thị danh sách hội thoại ở Cột 2 (Column2ConvList), giao diện cần đồng thời:
-- - Thông tin hội thoại: ID, trạng thái, tin nhắn cuối, thời gian, số tin chưa đọc.
-- - Thông tin khách hàng: Tên khách, Avatar khách, Số điện thoại, Email, External ID (từ bảng `contacts`).
-- - Thông tin kênh: Tên kênh, Logo kênh, Tên nền tảng FB/Zalo/Tele/WA (từ bảng `channels` & `channels_platforms`).
-- - Thông tin nhân viên phụ trách: Tên nhân viên tiếp nhận (từ bảng `users`).
-- - Trạng thái gõ phím tính toán động: Đang gõ hay không trong vòng 6 giây gần nhất.
--
-- NẾU KHÔNG CÓ VIEW: Mỗi lần gọi API, lập trình viên phải viết một câu lệnh SQL JOIN 6 bảng dài ngoằng,
-- rất dễ sai sót cú pháp hoặc thiếu cột.
-- VỚI VIEW NÀY: Trong code backend chỉ cần viết đúng 1 dòng cực kỳ ngắn gọn và sạch sẽ:
-- `SELECT * FROM v_conversations_detail WHERE channel_id = $1 ORDER BY last_message_at DESC;`
--
-- LIÊN QUAN ĐẾN LUỒNG:
-- - Luồng Cột 2 (Danh sách hội thoại): Phục vụ hiển thị, tìm kiếm khách hàng, lọc theo tab.
-- ----------------------------------------------------------------------------------------------------
CREATE OR REPLACE VIEW notification.v_conversations_detail AS
SELECT 
    conv.id,
    conv.channel_id,
    c.name AS channel_name,
    cp.name AS platform,
    c.avatar_url AS channel_avatar_url,
    conv.contact_id,
    cont.name AS contact_name,
    cont.avatar_url AS contact_avatar_url,
    cont.phone AS contact_phone,
    cont.email AS contact_email,
    cont.external_user_id AS contact_external_user_id,
    conv.assigned_user_id,
    u.name AS assigned_user_name,
    conv.id__conversations_statuses,
    cs.name AS status,
    conv.last_message_preview,
    conv.last_message_at,
    conv.unread_count,
    -- Trạng thái đang gõ được tính tự động: Nếu cờ is_typing = true và sự kiện gõ diễn ra trong vòng 6 giây gần nhất
    (conv.is_typing = true AND conv.typing_updated_at > CURRENT_TIMESTAMP - INTERVAL '6 seconds') AS is_typing,
    conv.created_at,
    conv.updated_at
FROM notification.conversations conv
JOIN notification.channels c ON conv.channel_id = c.id
JOIN notification.channels_platforms cp ON c.id__channels_platforms = cp.id
JOIN notification.contacts cont ON conv.contact_id = cont.id
JOIN notification.conversations_statuses cs ON conv.id__conversations_statuses = cs.id
LEFT JOIN notification.users u ON conv.assigned_user_id = u.id;

-- ----------------------------------------------------------------------------------------------------
-- 7.2 VIEW: notification.v_messages_detail
-- TẠI SAO LẠI CẦN VIEW NÀY?
-- Khi mở một cuộc hội thoại ở Cột 3 (Column3ChatArea), giao diện cần hiển thị toàn bộ lịch sử chat kèm:
-- - Tên người gửi: "Khách hàng" hay "Nhân viên" (`sender_type`).
-- - Định dạng tin nhắn: "văn bản", "ảnh", "tài liệu" (`message_type`).
-- - Trạng thái tin: "đã gửi", "đã xem", "lỗi" (`status`).
-- - Thông tin nhân viên cụ thể đã bấm gửi: Tên nhân viên, Avatar nhân viên (từ bảng `users`).
--
-- VIEW này đóng gói toàn bộ các phép JOIN cần thiết, giúp API `/api/conversations/:id/messages`
-- chạy với tốc độ cao nhất và trả về dữ liệu phẳng chuẩn RESTful JSON cho frontend.
--
-- LIÊN QUAN ĐẾN LUỒNG:
-- - Luồng Cột 3 (Khung chat chi tiết & dòng thời gian trao đổi).
-- ----------------------------------------------------------------------------------------------------
CREATE OR REPLACE VIEW notification.v_messages_detail AS
SELECT 
    m.id,
    m.conversation_id,
    m.id__messages_sender_types,
    st.name AS sender_type,
    m.sender_user_id,
    u.name AS agent_name,
    u.avatar_url AS agent_avatar_url,
    m.id__messages_types,
    mt.name AS message_type,
    m.content,
    m.media_url,
    m.payload,
    m.external_message_id,
    m.id__messages_statuses,
    ms.name AS status,
    m.error_message,
    m.created_at
FROM notification.messages m
JOIN notification.messages_sender_types st ON m.id__messages_sender_types = st.id
JOIN notification.messages_types mt ON m.id__messages_types = mt.id
JOIN notification.messages_statuses ms ON m.id__messages_statuses = ms.id
LEFT JOIN notification.users u ON m.sender_user_id = u.id;

-- ----------------------------------------------------------------------------------------------------
-- 7.3 VIEW: notification.v_channels_summary
-- TẠI SAO LẠI CẦN VIEW NÀY?
-- Ở Cột 1 (Column1Channels), mỗi kênh hoặc nền tảng cần hiển thị số huy hiệu (Badge):
-- - Kênh này đang có bao nhiêu cuộc trò chuyện?
-- - Tổng số tin nhắn chưa đọc của kênh này là bao nhiêu?
-- - Kênh này có tin nhắn mới nhất vào lúc nào?
--
-- VIEW này gom nhóm (GROUP BY) và tính toán sẵn số liệu tổng hợp, giảm thiểu việc frontend phải
-- tải hàng ngàn bản ghi về rồi tự tính toán bằng Javascript, giúp giảm tải băng thông mạng và RAM máy khách!
--
-- LIÊN QUAN ĐẾN LUỒNG:
-- - Luồng Cột 1 (Quản lý Kênh & Bộ lọc Accordion theo nền tảng).
-- - Luồng Dashboard báo cáo tổng quan.
-- ----------------------------------------------------------------------------------------------------
CREATE OR REPLACE VIEW notification.v_channels_summary AS
SELECT 
    c.id,
    c.name,
    cp.name AS platform,
    c.external_channel_id,
    c.avatar_url,
    c.is_active,
    COUNT(conv.id) AS total_conversations,
    COALESCE(SUM(conv.unread_count), 0) AS total_unread,
    MAX(conv.last_message_at) AS latest_activity_at
FROM notification.channels c
JOIN notification.channels_platforms cp ON c.id__channels_platforms = cp.id
LEFT JOIN notification.conversations conv ON c.id = conv.channel_id
GROUP BY c.id, cp.name;


-- ====================================================================================================
-- PHẦN 8: BẢN ĐỒ ÁNH XẠ: QUAN HỆ GIỮA CÁC BẢNG & CÁC LUỒNG VẬN HÀNH ỨNG DỤNG
-- ====================================================================================================
/*
+----------------------------------------------------------------------------------------------------+
| TỔNG HỢP MỐI QUAN HỆ GIỮA CÁC BẢNG (RELATIONSHIPS MATRIX)                                          |
+----------------------------------------------------------------------------------------------------+
1. channels_platforms (1)  ----< (N) channels
   - Một nền tảng (ví dụ: Zalo) có thể kết nối nhiều tài khoản khác nhau (nhiều số điện thoại/OA).
   - Khóa ngoại: channels.id__channels_platforms REFERENCES channels_platforms(id).

2. channels (1)            ----< (N) contacts
   - Một kênh sở hữu danh sách khách hàng riêng biệt từng nhắn vào kênh đó.
   - Khóa ngoại: contacts.channel_id REFERENCES channels(id) ON DELETE CASCADE.
   - Xóa kênh sẽ tự động xóa sạch các contact thuộc kênh đó để tránh rác database.

3. channels (1)            ----< (N) conversations
   - Một kênh chứa nhiều cuộc hội thoại của các khách hàng khác nhau.
   - Khóa ngoại: conversations.channel_id REFERENCES channels(id) ON DELETE CASCADE.

4. contacts (1)            ----< (N) conversations
   - Một khách hàng tham gia vào cuộc hội thoại tương ứng với kênh họ đang chat.
   - Khóa ngoại: conversations.contact_id REFERENCES contacts(id) ON DELETE CASCADE.
   - Kết hợp ràng buộc UNIQUE(channel_id, contact_id): Đảm bảo 1 khách trên 1 kênh chỉ có 1 hội thoại duy nhất.

5. users_roles (1)         ----< (N) users
   - Phân quyền nhân viên (Admin, Supervisor, Agent).
   - Khóa ngoại: users.id__users_roles REFERENCES users_roles(id).

6. users (1)               ----< (N) conversations (Phụ trách)
   - Một nhân viên có thể được giao phân công chăm sóc nhiều khách hàng khác nhau.
   - Khóa ngoại: conversations.assigned_user_id REFERENCES users(id) ON DELETE SET NULL.
   - TẠI SAO LÀM ON DELETE SET NULL? Khi một nhân viên nghỉ việc hoặc bị xóa tài khoản,
     các cuộc trò chuyện họ từng phụ trách KHÔNG ĐƯỢC PHÉP BỊ XÓA MẤT, mà chỉ chuyển về trạng thái
     chưa phân công (NULL) để nhân viên khác vào tiếp quản!

7. users (1)               ----< (N) messages (Người gửi)
   - Một nhân viên có thể là tác giả gửi nhiều tin nhắn trả lời khách hàng.
   - Khóa ngoại: messages.sender_user_id REFERENCES users(id) ON DELETE SET NULL.
   - Nếu nhân viên bị xóa tài khoản, lịch sử câu chat của họ vẫn được lưu lại nguyên vẹn trong hệ thống.

8. conversations (1)       ----< (N) messages
   - Một cuộc trò chuyện chứa hàng ngàn tin nhắn trao đổi qua lại theo thời gian.
   - Khóa ngoại: messages.conversation_id REFERENCES conversations(id) ON DELETE CASCADE.
   - Nếu xóa cuộc hội thoại thì toàn bộ tin nhắn bên trong cũng sẽ được giải phóng sạch sẽ.

9. channels (1)            ----< (N) outbound_typing
   - Quản lý trạng thái nhân viên đang gõ phím theo từng kênh và từng khách hàng.
   - Khóa ngoại: outbound_typing.channel_id REFERENCES channels(id) ON DELETE CASCADE.

+----------------------------------------------------------------------------------------------------+
| ÁNH XẠ CÁC BẢNG VÀO TỪNG LUỒNG THỰC TẾ (WORKFLOW MAPPING)                                         |
+----------------------------------------------------------------------------------------------------+

LUỒNG 1: KHÁCH HÀNG NHẮN TIN VÀO (INBOUND WEBHOOK & SOCKET WORKER)
- Bước 1: Khách nhắn tin trên FB/Zalo/Tele/WA.
- Bước 2: Webhook hoặc Sync Worker tiếp nhận payload.
- Bước 3: Tra cứu bảng `contacts`: Nếu chưa có thì INSERT khách mới (lưu tên, avatar, external_user_id).
- Bước 4: Tra cứu bảng `conversations`: Nếu chưa có phiên chat thì INSERT cuộc hội thoại mới.
- Bước 5: Cập nhật bảng `conversations`:
          `SET last_message_preview = <nội dung>, last_message_at = NOW(), unread_count = unread_count + 1`.
- Bước 6: INSERT vào bảng `messages` (id__messages_sender_types = 1 [customer], status = 2 [sent]).

LUỒNG 2: HIỂN THỊ DỮ LIỆU LÊN 3 CỘT GIAO DIỆN WEB APP
- Cột 1 (Kênh): Query từ bảng `channels` hoặc View `v_channels_summary` để biết kênh nào đang online,
  bao nhiêu tin chưa đọc.
- Cột 2 (Danh sách hội thoại): Query từ View `v_conversations_detail` (đã JOIN sẵn đầy đủ tên khách,
  ảnh khách, tên kênh, trạng thái đang gõ, sắp xếp tin mới nhất lên đầu).
- Cột 3 (Khung chat chi tiết): Query từ View `v_messages_detail` lấy lịch sử chat theo `conversation_id`,
  phân biệt rõ ràng tin nhắn của Khách (bên trái) và tin nhắn của Nhân viên (bên phải kèm avatar nhân viên).
- Cột 4 (Thông tin CRM): Đọc trực tiếp từ bảng `contacts` để hiển thị SĐT, email, ghi chú nội bộ.

LUỒNG 3: NHÂN VIÊN TRẢ LỜI TIN NHẮN (OUTBOUND MESSAGE)
- Bước 1: Nhân viên gõ văn bản ở Cột 3 và nhấn Gửi.
- Bước 2: Web App gọi API POST `/api/conversations/:id/messages`.
- Bước 3: INSERT vào bảng `messages` (id__messages_sender_types = 2 [agent], sender_user_id = ID nhân viên).
- Bước 4: UPDATE bảng `conversations` (last_message_preview = <nội dung>, unread_count = 0).
- Bước 5: Background Sync Worker đọc tin nhắn mới này và gọi API của Telegram/Meta/WhatsApp/Zalo
          đẩy ra điện thoại của khách hàng, sau đó cập nhật `external_message_id`.

LUỒNG 4: HIỂN THỊ TRẠNG THÁI ĐANG GÕ (TYPING INDICATOR 2 CHIỀU)
- Chiều Khách -> Web: Khách gõ trên điện thoại -> Worker cập nhật `conversations.is_typing = true` và
  `conversations.typing_updated_at = NOW()`. View `v_conversations_detail` tự động tính toán trả về
  `is_typing = true` cho Frontend hiển thị chữ "... đang gõ".
- Chiều Web -> Khách: Nhân viên gõ phím ở Cột 3 -> Gọi API POST `/api/typing` ghi vào bảng `outbound_typing`.
  Worker đọc bảng `outbound_typing` và phát tín hiệu đang soạn tin sang cho khách.
====================================================================================================
*/
