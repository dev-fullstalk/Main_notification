'use client';

import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Link2 } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { PLATFORMS } from '../../lib/constants';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConnectModal({ isOpen, onClose }: ConnectModalProps) {
  const connectNewChannel = useChatStore((state) => state.connectNewChannel);
  const [platform, setPlatform] = useState<'facebook' | 'zalo' | 'telegram' | 'tiktok'>('facebook');
  const [channelName, setChannelName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Esc key binding for closing the modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim() || !externalId.trim()) return;

    setIsSubmitting(true);
    // Simulate API connecting latency
    setTimeout(() => {
      connectNewChannel(platform, channelName, externalId);
      setIsSubmitting(false);
      onClose();
      // Reset fields
      setChannelName('');
      setExternalId('');
      setToken('');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      {/* Backdrop overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div 
        className="relative w-full max-w-lg rounded-2xl bg-card text-card-foreground p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold font-sans">Kết nối Kênh mới</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Platform Selector */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Chọn Nền tảng</label>
            <div className="grid grid-cols-4 gap-2">
              {(['facebook', 'zalo', 'telegram', 'tiktok'] as const).map((plat) => {
                const config = PLATFORMS[plat];
                const isSelected = platform === plat;
                return (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setPlatform(plat)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' 
                        : 'border-border bg-card hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <img 
                      src={config.avatarUrl} 
                      alt={config.name}
                      className="w-8 h-8 mb-1 object-contain" 
                    />
                    <span className="text-[10px] font-medium leading-none">{config.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <label htmlFor="channel-name" className="block text-xs font-semibold text-muted-foreground mb-1">
                Tên hiển thị kênh
              </label>
              <input
                id="channel-name"
                type="text"
                required
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder={`Ví dụ: ${platform === 'facebook' ? 'Fanpage Giày Cao Cấp' : platform === 'zalo' ? 'Zalo CSKH' : platform === 'telegram' ? 'Bot Telegram Store' : 'TikTok Shop Giày Dép'}`}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="external-id" className="block text-xs font-semibold text-muted-foreground mb-1">
                {platform === 'facebook' ? 'Page ID' : platform === 'zalo' ? 'OA ID' : platform === 'telegram' ? 'Username Bot (hoặc Bot ID)' : 'Shop ID'}
              </label>
              <input
                id="external-id"
                type="text"
                required
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder="Ví dụ: 1049281039829"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="security-token" className="block text-xs font-semibold text-muted-foreground mb-1">
                {platform === 'telegram' ? 'Bot Token (HTTP API)' : 'Access Token / App Secret Key'}
              </label>
              <input
                id="security-token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Secure Hint */}
          <div className="flex items-start gap-2 p-3 bg-muted rounded-xl text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              Mã bảo mật của bạn sẽ được mã hóa chuẩn AES-256 trước khi lưu trữ. Terax cam kết không chia sẻ dữ liệu này với bên thứ ba.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center px-4 py-2 text-sm bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/95 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Đang kết nối...' : 'Xác nhận kết nối'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
