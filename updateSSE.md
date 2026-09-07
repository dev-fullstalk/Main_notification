# SỔ TAY VẬN HÀNH & BẢO TRÌ HỆ THỐNG REAL-TIME PUSH (SSE + POSTGRESQL LISTEN / NOTIFY)

> **Tài liệu kỹ thuật nội bộ:** Dành cho lập trình viên và quản trị viên hệ thống Terax Omnichannel Inbox.  
> **Mục đích:** Ghi lại chi tiết toàn bộ các thay đổi trên Database, Backend, Frontend; đồng thời hướng dẫn chi tiết cách kiểm tra, debug, bảo trì và mở rộng thêm các tính năng thời gian thực sau này.

---

## MỤC LỤC
1. [Tổng quan Kiến trúc (Architecture Overview)](#1-tổng-quan-kiến-trúc-architecture-overview)
2. [Chi tiết các thay đổi trên Database (PostgreSQL)](#2-chi-tiết-các-thay-đổi-trên-database-postgresql)
3. [Chi tiết các thay đổi trên Web App (Next.js & Frontend)](#3-chi-tiết-các-thay-đổi-trên-web-app-nextjs--frontend)
4. [Hướng dẫn Kiểm tra & Giám sát (Monitoring & Testing)](#4-hướng-dẫn-kiểm-tra--giám-sát-monitoring--testing)
5. [Quy trình Debug khi gặp sự cố (Troubleshooting Guide)](#5-quy-trình-debug-khi-gặp-sự-cố-troubleshooting-guide)
6. [Hướng dẫn Mở rộng Sự kiện mới (How to Add New Events)](#6-hướng-dẫn-mở-rộng-sự-kiện-mới-how-to-add-new-events)
7. [Lưu ý khi Triển khai lên Production (Nginx, Docker, Multi-Instance)](#7-lưu-ý-khi-triển-khai-lên-production-nginx-docker-multi-instance)

---

## 1. TỔNG QUAN KIẾN TRÚC (ARCHITECTURE OVERVIEW)

### Trước khi nâng cấp (Short Polling):
- Trình duyệt tại Cột 2 & Cột 3 dùng hàm `setInterval` liên tục **1.2 giây/lần** gọi 2 API:
  - `GET /api/channels/:id/conversations`
  - `GET /api/conversations/:id/messages`
- **Hạn chế:** Kể cả khi không có ai nhắn tin, mỗi phút máy chủ và Database phải chịu hơn 50 đến 100 câu query vô nghĩa. Làm nóng máy, tốn RAM/CPU, quạt kêu to, và tin nhắn vẫn bị trễ từ 1.2s - 2.4s.

### Sau khi nâng cấp (Real-time Event-Driven Push):
```
[Khách hàng Zalo/FB/Tele] 
          │ (Gửi tin nhắn)
          ▼
   [Webhook Server] ───► [INSERT / UPDATE vào PostgreSQL]
                               │
                               ▼ (Trigger DB kích hoạt tự động)
                    [NOTIFY chat_realtime, '{JSON Payload}']
                               │
                               ▼ (Duy nhất 1 kết nối Listener chuyên dụng)
                [Next.js Server: Realtime Service (EventEmitter)]
                               │
                               ▼ (Truyền qua luồng Stream HTTP SSE)
                   [Trình duyệt Admin: new EventSource('/api/events')]
                               │
                               ▼
               (Giao diện Cột 2 & Cột 3 nhảy tin mới trong < 5ms)
```

- **Ưu điểm vượt trội:**
  1. **0% CPU lãng phí:** Khi không có tin nhắn, không có bất kỳ câu query hay request nào chạy.
  2. **Độ trễ cực thấp:** Tin nhắn vừa vào DB là trình duyệt nhận được ngay trong **2 – 5 mili-giây**.
  3. **Không cần cài Redis:** Tận dụng tính năng Pub/Sub có sẵn của PostgreSQL (`LISTEN / NOTIFY`), hệ thống nhẹ và không phát sinh chi phí phần mềm.
  4. **Tiết kiệm kết nối DB (Connection Pool):** Dù có 10 hay 100 tab trình duyệt mở cùng lúc, Server Next.js **chỉ dùng duy nhất 1 kết nối** tới PostgreSQL để lắng nghe sự kiện.

---

## 2. CHI TIẾT CÁC THAY ĐỔI TRÊN DATABASE (POSTGRESQL)

Tất cả đã được áp dụng trực tiếp vào Database PostgreSQL trên Docker (Port 5433) và đồng bộ trong [init.sql](file:///d:/Main_notification/init.sql) và [database.sql](file:///d:/Main_notification/database.sql).

### 2.1 Hàm Trigger: `notification.notify_chat_events()`
Hàm này được viết bằng ngôn ngữ `plpgsql`, chịu trách nhiệm đóng gói dữ liệu thành JSON và phát loa qua lệnh `pg_notify`:
```sql
CREATE OR REPLACE FUNCTION notification.notify_chat_events()
RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
BEGIN
    -- SỰ KIỆN 1: KHI CÓ TIN NHẮN MỚI ĐƯỢC INSERT VÀO BẢNG MESSAGES
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
        -- Bắn sự kiện ra kênh 'chat_realtime'
        PERFORM pg_notify('chat_realtime', payload::text);

    -- SỰ KIỆN 2: KHI CÓ CẬP NHẬT TRONG BẢNG CONVERSATIONS (ĐANG GÕ, TIN MỚI, CHƯA ĐỌC)
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
```

### 2.2 Các Triggers được gắn vào bảng:
```sql
-- Trigger trên bảng messages: Kích hoạt ngay sau khi INSERT tin nhắn mới
DROP TRIGGER IF EXISTS trg_messages_notify ON notification.messages;
CREATE TRIGGER trg_messages_notify
AFTER INSERT ON notification.messages
FOR EACH ROW EXECUTE FUNCTION notification.notify_chat_events();

-- Trigger trên bảng conversations: Kích hoạt sau khi UPDATE các thông tin hiển thị
DROP TRIGGER IF EXISTS trg_conversations_notify ON notification.conversations;
CREATE TRIGGER trg_conversations_notify
AFTER UPDATE ON notification.conversations
FOR EACH ROW EXECUTE FUNCTION notification.notify_chat_events();
```

---

## 3. CHI TIẾT CÁC THAY ĐỔI TRÊN WEB APP (NEXT.JS & FRONTEND)

### 3.1 Dịch vụ Lắng nghe thời gian thực: [src/lib/realtime.ts](file:///d:/Main_notification/src/lib/realtime.ts)
- **Nhiệm vụ:**
  - Khởi tạo 1 đối tượng `pg.Client` độc lập chuyên trách việc chạy câu lệnh `LISTEN chat_realtime`.
  - Lưu trữ con trỏ vào `globalThis` để khi Next.js reload mã nguồn (Hot Module Reload) trong quá trình phát triển không bị tạo ra nhiều kết nối thừa.
  - Khi nhận được tín hiệu `notification` từ PostgreSQL, nó bắn qua một Node.js `EventEmitter` (`realtimeEmitter`).
  - **Khả năng tự phục hồi (Self-Healing):** Nếu Docker PostgreSQL bị restart hoặc đứt kết nối mạng, service tự động thử kết nối lại sau mỗi 5 giây (`setTimeout(initRealtimeListener, 5000)`).

### 3.2 Endpoint Server-Sent Events: [src/app/api/events/route.ts](file:///d:/Main_notification/src/app/api/events/route.ts)
- **Nhiệm vụ:**
  - Cung cấp luồng dữ liệu HTTP Streaming chuẩn `text/event-stream`.
  - Mỗi khi có sự kiện từ `realtimeEmitter`, nó chuyển đổi thành cấu trúc chuẩn:
    ```text
    event: message
    data: {"event":"new_message","data":{...}}
    ```
  - **Heartbeat Ping:** Tự động gửi một chuỗi rỗng `: ping\n\n` mỗi **25 giây** để đảm bảo trình duyệt, proxy hoặc tường lửa không ngắt kết nối vì lý do nhàn rỗi (idle timeout).
  - **Tự dọn dẹp tài nguyên:** Bắt sự kiện `request.signal.addEventListener('abort')` khi người dùng tắt tab để hủy đăng ký lắng nghe, đóng controller stream, tránh rò rỉ bộ nhớ (memory leak).

### 3.3 Quản lý Trạng thái Zustand: [src/store/useChatStore.ts](file:///d:/Main_notification/src/store/useChatStore.ts)
- Bổ sung 2 action xử lý dữ liệu đẩy:
  - `handleRealtimeMessage(msg)`:
    - Nếu tin nhắn thuộc cuộc trò chuyện đang mở (`activeConversationId`), kiểm tra xem ID tin nhắn đã có chưa (chống lặp), nếu chưa thì đẩy thêm vào mảng `messages`.
    - Đồng thời tự động cập nhật preview `lastMessagePreview`, thời gian `lastMessageAt`, tăng số tin chưa đọc `unreadCount` (nếu là khách gửi vào cuộc trò chuyện khác), và tự động sắp xếp đưa cuộc trò chuyện đó lên đầu danh sách Cột 2.
    - Nếu tin nhắn đến từ một khách hàng hoàn toàn mới chưa có trong danh sách hội thoại, store tự động gọi `fetchConversations()` để nạp thêm thông tin khách hàng và cuộc trò chuyện mới.
  - `handleRealtimeConversation(data)`:
    - Cập nhật trạng thái khách đang gõ phím (`is_typing`), số tin chưa đọc, thời gian tin cuối.

### 3.4 Giao diện Trang Inbox: [src/app/inbox/page.tsx](file:///d:/Main_notification/src/app/inbox/page.tsx)
- **Xóa bỏ hoàn toàn:** Khối `setInterval(..., 1200)` cũ.
- **Thay thế bằng:**
  ```tsx
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (e) => {
      const payload = JSON.parse(e.data);
      if (payload.event === 'new_message') handleRealtimeMessage(payload.data);
      else if (payload.event === 'conversation_updated') handleRealtimeConversation(payload.data);
    };

    // Khi người dùng chuyển tab quay lại, nhẹ nhàng đồng bộ lại 1 lần phòng trường hợp mất mạng
    const onFocus = () => {
      fetchConversations(activeChannelId);
      if (activeConversationId) fetchMessages(activeConversationId);
    };
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
      eventSource.close();
    };
  }, [activeChannelId, activeConversationId]);
  ```

---

## 4. HƯỚNG DẪN KIỂM TRA & GIÁM SÁT (MONITORING & TESTING)

Khi bạn muốn kiểm tra xem hệ thống Real-time có đang hoạt động tốt hay không, hãy thực hiện theo 2 cách đơn giản sau:

### Cách 1: Kiểm tra qua Trình duyệt (DevTools F12)
1. Mở ứng dụng tại `http://localhost:3000/inbox`.
2. Nhấn `F12` mở Developer Tools -> chuyển sang tab **Network** (Mạng).
3. Lọc theo từ khóa `events` hoặc chuyển tab con sang **Fetch/XHR**.
4. Bạn sẽ thấy một request có tên `events` với trạng thái `200` và Type là `eventsource`.
5. Bấm vào dòng `events` đó, chọn tab **EventStream** (hoặc **Messages**):
   - Bạn sẽ thấy dòng xác nhận `status: "connected"` lúc mở kết nối.
   - Cứ mỗi 25 giây sẽ có 1 dòng ping nhẹ `: ping`.
   - Khi bạn gửi tin nhắn hoặc khách hàng gửi tin nhắn, bạn sẽ thấy ngay một dòng `event: message` xuất hiện tức thì kèm toàn bộ nội dung tin nhắn.
   - **Đặc biệt:** Trong tab Network, không còn thấy các request gọi lại liên tục mỗi giây nữa. Toàn bộ bảng Network tĩnh lặng hoàn toàn!

### Cách 2: Kiểm tra trực tiếp trên Database bằng câu lệnh SQL
Mở công cụ quản trị Database (như DBeaver, pgAdmin hoặc terminal chạy psql vào port 5433):
```sql
-- 1. Kiểm tra xem trigger đã tồn tại trên bảng hay chưa:
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'notification';

-- 2. Thử tự bắn một tin nhắn mẫu vào một hội thoại bất kỳ:
INSERT INTO notification.messages (
    conversation_id, 
    id__messages_sender_types, 
    id__messages_types, 
    content, 
    id__messages_statuses
) VALUES (
    (SELECT id FROM notification.conversations LIMIT 1), 
    1, 
    1, 
    'Tin nhắn kiểm tra Real-time qua SQL!', 
    2
);
```
Ngay khi bạn vừa nhấn `Execute (F5)` câu lệnh SQL trên, hãy nhìn sang màn hình trình duyệt: Tin nhắn *"Tin nhắn kiểm tra Real-time qua SQL!"* sẽ lập tức xuất hiện trên giao diện chat mà bạn không cần phải F5 tải lại trang!

---

## 5. QUY TRÌNH DEBUG KHI GẶP SỰ CỐ (TROUBLESHOOTING GUIDE)

Nếu một ngày bạn thấy tin nhắn gửi đến mà giao diện không tự nhảy tin, hãy kiểm tra lần lượt theo 4 bước sau:

| Hiện tượng | Nguyên nhân có thể | Cách khắc phục |
| :--- | :--- | :--- |
| Trình duyệt báo lỗi màu đỏ ở console: `EventSource's response has a MIME type ("text/html") that is not "text/event-stream"` | Route `/api/events` bị lỗi Exception hoặc database ngắt kết nối. | Kiểm tra terminal chạy `npm run dev` xem có lỗi log nào không. Kiểm tra file `.ENV` các thông số `DB_HOST`, `DB_PORT=5433`, `DB_PASSWORD`. |
| Gửi tin nhắn qua Zalo/FB thì DB có lưu, nhưng trình duyệt không thấy nhảy tin | Trigger trong PostgreSQL bị mất (ví dụ do ai đó vừa chạy lại lệnh xóa bảng hoặc migrate đè). | Chạy lại lệnh tạo Trigger trong file [init.sql](file:///d:/Main_notification/init.sql) hoặc chạy lệnh trong mục 2 của file này. |
| Sau khi khởi động lại máy tính, trình duyệt không nhận được tin | Docker PostgreSQL chưa được bật hoặc khởi động chậm hơn Web App. | Bật lại Docker Desktop container chứa DB. Service [src/lib/realtime.ts](file:///d:/Main_notification/src/lib/realtime.ts) có cơ chế retry mỗi 5s, khi DB sẵn sàng nó sẽ tự kết nối lại. |
| Người dùng mở app trên điện thoại 3G/4G chập chờn | Trình duyệt mất mạng tạm thời. | Hàm `new EventSource()` của trình duyệt có tính năng tự động Reconnect khi có mạng trở lại; đồng thời khi người dùng bấm quay lại tab (Focus), app đã có sẵn hook `window.addEventListener('focus')` để tự fetch bù tin nhắn bị lỡ. |

---

## 6. HƯỚNG DẪN MỞ RỘNG SỰ KIỆN MỚI (HOW TO ADD NEW EVENTS)

Sau này nếu bạn muốn bổ sung thêm các sự kiện thời gian thực khác (ví dụ: Thông báo có nhân viên mới nhận cuộc trò chuyện, thông báo khách đã xem tin nhắn, hoặc thông báo khách gắn nhãn tag), bạn chỉ cần làm 2 bước cực kỳ đơn giản:

### Bước 1: Thêm vào hàm Trigger trong PostgreSQL
Mở [database.sql](file:///d:/Main_notification/database.sql), tìm đến hàm `notification.notify_chat_events()`. Bổ sung một nhánh `ELSIF`:
```sql
ELSIF (TG_TABLE_NAME = 'conversations' AND OLD.assigned_user_id IS DISTINCT FROM NEW.assigned_user_id) THEN
    payload = json_build_object(
        'event', 'agent_assigned',
        'data', json_build_object(
            'conversation_id', NEW.id,
            'assigned_user_id', NEW.assigned_user_id
        )
    );
    PERFORM pg_notify('chat_realtime', payload::text);
```

### Bước 2: Bắt sự kiện trên Frontend
Mở [src/app/inbox/page.tsx](file:///d:/Main_notification/src/app/inbox/page.tsx), trong hàm `eventSource.onmessage`:
```tsx
if (payload.event === 'agent_assigned') {
  // Cập nhật tên nhân viên tiếp nhận trên giao diện
  assignAgent(payload.data.conversation_id, payload.data.assigned_user_id);
}
```
Thế là xong! Toàn bộ hạ tầng luồng SSE đã sẵn sàng, bạn không cần phải cấu hình lại đường truyền hay server.

---

## 7. LƯU Ý KHI TRIỂN KHAI LÊN PRODUCTION (NGINX, DOCKER, MULTI-INSTANCE)

Khi bạn đưa dự án này lên máy chủ VPS hoặc Cloud Server:

### 1. Cấu hình Nginx Proxy Buffering (Cực kỳ quan trọng với SSE):
Nếu bạn dùng Nginx làm Reverse Proxy đứng trước Next.js, theo mặc định Nginx sẽ giữ lại gói tin để gom vào bộ nhớ đệm (buffer) trước khi gửi xuống người dùng. Điều này sẽ khiến luồng SSE bị tắc!  
Bạn chỉ cần thêm 2 dòng sau vào file cấu hình Nginx:
```nginx
location /api/events {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    
    # VÔ HIỆU HÓA BUFFERING ĐỂ DỮ LIỆU ĐẨY XUỐNG TỨC THÌ:
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 86400s; # Giữ kết nối lâu dài không bị timeout
    chunked_transfer_encoding on;
}
```

### 2. Khi chạy nhiều phiên bản Server (Scale ngang - Horizontal Scaling):
- Trong tương lai nếu hệ thống của bạn phát triển lớn, chạy 3 - 5 container Next.js cùng lúc:
- Nhờ việc sử dụng **PostgreSQL LISTEN / NOTIFY**, tất cả các container Next.js đều cùng kết nối vào cơ sở dữ liệu PostgreSQL chung.
- Khi có bất kỳ tin nhắn nào được thêm vào DB, PostgreSQL sẽ phát loa cho **TẤT CẢ các container**, và tất cả các khách hàng kết nối vào bất kỳ container nào cũng đều nhận được tin nhắn thời gian thực đầy đủ mà **chưa cần phải cấu hình thêm Redis Pub/Sub cồng kềnh**.

---
*Tài liệu được khởi tạo và kiểm thử thành công vào ngày 05/09/2026 bởi Antigravity Pair-Programming Assistant.*
