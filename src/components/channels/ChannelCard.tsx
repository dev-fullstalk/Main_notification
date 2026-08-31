'use client';

import React, { useState } from 'react';
import { LogOut, ShieldCheck, RefreshCw, AlertTriangle, Trash2, Edit3, Check, X } from 'lucide-react';
import { Channel } from '../../types/channel';
import { PLATFORMS } from '../../lib/constants';
import { useChatStore } from '../../store/useChatStore';

interface ChannelCardProps {
  channel: Channel;
}

export default function ChannelCard({ channel }: ChannelCardProps) {
  const { disconnectChannel, renameChannel, fetchConversations, activeChannelId } = useChatStore();
  const platformConfig = (PLATFORMS as any)[channel.platform] || PLATFORMS.livechat;
  const [isConfirming, setIsConfirming] = useState<'logout' | 'clear' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Rename states
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(channel.name);

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await disconnectChannel(channel.id);
    } finally {
      setIsLoading(false);
      setIsConfirming(null);
    }
  };

  const handleClearMessages = async () => {
    setIsLoading(true);
    try {
      await fetch(`/api/channels/${channel.id}/clear-messages`, { method: 'POST' });
      await fetchConversations(activeChannelId);
    } finally {
      setIsLoading(false);
      setIsConfirming(null);
    }
  };

  const handleSaveName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editedName.trim() || editedName.trim() === channel.name) {
      setIsEditingName(false);
      setEditedName(channel.name);
      return;
    }

    setIsLoading(true);
    try {
      await renameChannel(channel.id, editedName.trim());
      setIsEditingName(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
      <div className="flex gap-4">
        {/* Platform Logo */}
        <div className="w-12 h-12 rounded-xl bg-muted p-2 flex items-center justify-center border border-border shrink-0">
          <img 
            src={channel.avatarUrl || platformConfig.avatarUrl} 
            alt={channel.platform} 
            className="w-8 h-8 object-contain"
          />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  autoFocus
                  className="flex-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-primary bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="p-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-sm"
                  title="Lưu tên"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingName(false);
                    setEditedName(channel.name);
                  }}
                  className="p-1 rounded-lg border border-border hover:bg-muted text-muted-foreground cursor-pointer"
                  title="Hủy"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-1.5 max-w-full">
                <h4 className="font-semibold text-sm leading-snug truncate">{channel.name}</h4>
                <button
                  onClick={() => {
                    setEditedName(channel.name);
                    setIsEditingName(true);
                  }}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Đổi tên kênh"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium leading-none ${
              channel.isActive 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
                : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400'
            }`}>
              {channel.isActive ? 'Đang hoạt động' : 'Đã đăng xuất'}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-1 truncate">ID: {channel.externalChannelId}</p>
          <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Bảo mật AES
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
              Đồng bộ tự động
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Box or Action Footer */}
      {isConfirming === 'logout' && (
        <div className="p-3 bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl space-y-2 text-xs animate-in fade-in">
          <div className="flex items-center gap-1.5 text-red-700 dark:text-red-300 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Xác nhận đăng xuất & xóa tin nhắn của kênh này?</span>
          </div>
          <p className="text-[11px] text-red-600/80 dark:text-red-400/80">
            Hệ thống sẽ xóa phiên làm việc, xóa toàn bộ hội thoại/tin nhắn cũ của tài khoản này khỏi trang web.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setIsConfirming(null)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <LogOut className="w-3 h-3" />
                  Đồng ý đăng xuất
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {isConfirming === 'clear' && (
        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl space-y-2 text-xs animate-in fade-in">
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Xóa sạch tất cả tin nhắn cũ của kênh này?</span>
          </div>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
            Tài khoản vẫn giữ kết nối, nhưng toàn bộ lịch sử tin nhắn trong cơ sở dữ liệu sẽ được làm sạch.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setIsConfirming(null)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-medium cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleClearMessages}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                <>
                  <Trash2 className="w-3 h-3" />
                  Xác nhận xóa tin nhắn
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {!isConfirming && (
        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <span className="text-[11px] text-muted-foreground font-mono">
            Nền tảng: {platformConfig.name || channel.platform}
          </span>
          <div className="flex items-center gap-2">
            {/* Clear messages button */}
            <button
              onClick={() => setIsConfirming('clear')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all cursor-pointer"
              title="Xóa sạch lịch sử tin nhắn cũ của kênh này"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa tin nhắn cũ
            </button>

            {/* Logout button */}
            <button
              onClick={() => setIsConfirming('logout')}
              disabled={!channel.isActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                channel.isActive
                  ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/40'
                  : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              Đăng xuất kênh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
