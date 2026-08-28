'use client';

import React from 'react';
import { ToggleLeft, ToggleRight, Trash2, ShieldCheck, RefreshCw } from 'lucide-react';
import { Channel } from '../../types/channel';
import { PLATFORMS } from '../../lib/constants';
import { useChatStore } from '../../store/useChatStore';

interface ChannelCardProps {
  channel: Channel;
}

export default function ChannelCard({ channel }: ChannelCardProps) {
  const disconnectChannel = useChatStore((state) => state.disconnectChannel);
  const platformConfig = PLATFORMS[channel.platform];

  return (
    <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all flex items-start justify-between">
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
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm leading-snug">{channel.name}</h4>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium leading-none ${
              channel.isActive 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
                : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400'
            }`}>
              {channel.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">ID: {channel.externalChannelId}</p>
          <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Đã mã hóa
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
              Đồng bộ lúc: Vừa xong
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => disconnectChannel(channel.id)}
          disabled={!channel.isActive}
          className={`p-2 rounded-lg hover:bg-muted transition-colors ${
            channel.isActive ? 'text-muted-foreground hover:text-red-500' : 'text-neutral-300 dark:text-neutral-800 cursor-not-allowed'
          }`}
          title="Tạm dừng kết nối"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
