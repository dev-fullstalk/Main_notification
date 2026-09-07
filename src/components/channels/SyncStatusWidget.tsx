'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Play, Square, Activity, CheckCircle2, AlertCircle } from 'lucide-react';

interface SyncStatus {
  isRunning: boolean;
  pid: number | null;
}

interface SyncData {
  telegram: SyncStatus;
  zalo: SyncStatus;
  whatsapp: SyncStatus;
  facebook: SyncStatus;
}

export default function SyncStatusWidget() {
  const [status, setStatus] = useState<SyncData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStatus = async (auto = false) => {
    try {
      const res = await fetch(`/api/sync${auto ? '?autoStart=true' : ''}`);
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchStatus(true);
    const interval = setInterval(() => fetchStatus(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (action: 'start' | 'stop' | 'restart', platform: 'telegram' | 'zalo' | 'whatsapp' | 'facebook' | 'all') => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, platform }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message);
        setStatus(data.status);
      } else {
        setMessage(`Lỗi: ${data.error}`);
      }
    } catch (err: any) {
      setMessage(`Lỗi kết nối: ${err.message}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const platforms: { key: 'zalo' | 'facebook' | 'telegram' | 'whatsapp'; label: string; icon: string }[] = [
    { key: 'zalo', label: 'Zalo Real-time', icon: 'https://img.icons8.com/color/512/zalo.png' },
    { key: 'facebook', label: 'Facebook Messenger', icon: 'https://img.icons8.com/color/512/facebook-new.png' },
    { key: 'telegram', label: 'Telegram MTProto', icon: 'https://img.icons8.com/color/512/telegram-app.png' },
    { key: 'whatsapp', label: 'WhatsApp Baileys', icon: 'https://img.icons8.com/color/512/whatsapp.png' },
  ];

  return (
    <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
          <h3 className="font-bold text-sm">Dịch vụ Đồng bộ & Nhận Tin nhắn Tự động (Auto-Sync Engine)</h3>
        </div>

        <button
          onClick={() => handleAction('restart', 'all')}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Khởi động lại tất cả trên Web
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Hệ thống tự động chạy ngầm và nhận tin nhắn trực tiếp về Web theo thời gian thực. Không cần gõ lệnh terminal.
      </p>

      {message && (
        <div className={`p-2.5 rounded-xl border text-xs animate-in fade-in flex items-center gap-2 ${
          message.startsWith('Lỗi') 
            ? 'bg-destructive/10 border-destructive/20 text-destructive' 
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        }`}>
          {message.startsWith('Lỗi') ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {platforms.map((p) => {
          const st = status ? status[p.key] : null;
          const running = Boolean(st?.isRunning);

          return (
            <div
              key={p.key}
              className="p-3.5 rounded-xl border border-border bg-background/50 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 truncate">
                <img src={p.icon} alt={p.label} className="w-6 h-6 object-contain shrink-0" />
                <div className="truncate">
                  <span className="text-xs font-semibold block truncate">{p.label}</span>
                  <span className={`text-[10px] flex items-center gap-1 font-medium ${
                    running ? 'text-emerald-500' : 'text-amber-500'
                  }`}>
                    {running ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Đang đồng bộ (PID: {st?.pid})
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        Chưa chạy
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {running ? (
                  <button
                    onClick={() => handleAction('restart', p.key)}
                    disabled={isLoading}
                    className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                    title={`Khởi động lại sync ${p.label}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction('start', p.key)}
                    disabled={isLoading}
                    className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
                    title={`Bật sync ${p.label}`}
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
