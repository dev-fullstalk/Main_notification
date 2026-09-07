import { realtimeEmitter, initRealtimeListener } from '@/lib/realtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/events - Server-Sent Events (SSE) Stream
export async function GET(request: Request) {
  // Đảm bảo listener kết nối PostgreSQL đã khởi tạo
  initRealtimeListener();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Gửi sự kiện ban đầu xác nhận đã kết nối thành công
      const initialPayload = JSON.stringify({ status: 'connected', time: new Date().toISOString() });
      controller.enqueue(encoder.encode(`event: connected\ndata: ${initialPayload}\n\n`));

      // 2. Hàm chuyển tiếp sự kiện từ EventEmitter xuống kết nối SSE
      const onChatEvent = (payload: any) => {
        try {
          const dataStr = `event: message\ndata: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(dataStr));
        } catch (err) {
          console.error('SSE enqueue error:', err);
        }
      };

      realtimeEmitter.on('chat_event', onChatEvent);

      // 3. Heartbeat ping mỗi 25 giây để giữ kết nối không bị timeout
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch (err) {
          clearInterval(heartbeatInterval);
        }
      }, 25000);

      // 4. Dọn dẹp tài nguyên khi client đóng tab hoặc mất mạng
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        realtimeEmitter.off('chat_event', onChatEvent);
        try {
          controller.close();
        } catch (_) {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Content-Encoding': 'none',
    },
  });
}
