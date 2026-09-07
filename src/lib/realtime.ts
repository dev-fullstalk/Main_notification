import { Client } from 'pg';
import { EventEmitter } from 'events';
import dotenv from 'dotenv';
import path from 'path';

// Đảm bảo nạp đúng .ENV
dotenv.config({ path: path.resolve(process.cwd(), '.ENV'), quiet: true });

declare global {
  var __realtimeEmitter: EventEmitter | undefined;
  var __realtimeClient: Client | undefined;
  var __realtimeConnecting: boolean | undefined;
}

// Khởi tạo EventEmitter singleton dùng chung cho toàn bộ ứng dụng
export const realtimeEmitter: EventEmitter =
  globalThis.__realtimeEmitter || new EventEmitter();
realtimeEmitter.setMaxListeners(1000);
globalThis.__realtimeEmitter = realtimeEmitter;

export function initRealtimeListener() {
  // Nếu đã kết nối hoặc đang trong quá trình kết nối thì không tạo thêm
  if (globalThis.__realtimeClient || globalThis.__realtimeConnecting) {
    return;
  }

  globalThis.__realtimeConnecting = true;

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '5433');
  const database = process.env.DB_NAME || 'terax_database';
  const user = process.env.DB_USER || 'admin';
  const password = process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'Cpi2026!';

  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    options: '-c search_path=notification',
  });

  client.connect((err: any) => {
    globalThis.__realtimeConnecting = false;
    if (err) {
      console.warn('⚠️ Realtime PostgreSQL Client connection error, retrying in 5s:', err.message);
      globalThis.__realtimeClient = undefined;
      setTimeout(initRealtimeListener, 5000);
      return;
    }

    console.log('⚡ [Realtime Service] Connected to PostgreSQL! Listening to [chat_realtime] channel...');
    globalThis.__realtimeClient = client;

    client.query('LISTEN chat_realtime', (listenErr: any) => {
      if (listenErr) {
        console.error('❌ Failed to execute LISTEN chat_realtime:', listenErr);
      }
    });


    // Lắng nghe tín hiệu NOTIFY từ trigger trong database
    client.on('notification', (msg: any) => {
      if (msg.channel === 'chat_realtime' && msg.payload) {
        try {
          const parsed = JSON.parse(msg.payload);
          realtimeEmitter.emit('chat_event', parsed);
        } catch (e) {
          console.error('Error parsing notification payload:', e);
        }
      }
    });

    client.on('error', (err: any) => {
      console.warn('⚠️ Realtime PostgreSQL Client error, reconnecting in 5s...', err.message);
      globalThis.__realtimeClient = undefined;
      setTimeout(initRealtimeListener, 5000);
    });


    client.on('end', () => {
      console.warn('⚠️ Realtime PostgreSQL Client connection ended, reconnecting in 5s...');
      globalThis.__realtimeClient = undefined;
      setTimeout(initRealtimeListener, 5000);
    });
  });
}
