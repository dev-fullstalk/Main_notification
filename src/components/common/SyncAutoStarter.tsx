'use client';
 
import { useEffect } from 'react';

export default function SyncAutoStarter() {
  useEffect(() => {
    // Tự động kích hoạt đồng bộ tin nhắn chạy ngầm khi người dùng mở Web App
    fetch('/api/sync?autoStart=true').catch(() => {});
  }, []);

  return null;
}
