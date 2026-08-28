'use client';

import React, { useState } from 'react';
import Column1Channels from '../../../components/inbox/Column1Channels';
import ChannelCard from '../../../components/channels/ChannelCard';
import ConnectModal from '../../../components/channels/ConnectModal';
import { useChatStore } from '../../../store/useChatStore';
import { Plus, Settings } from 'lucide-react';

export default function SettingsChannelsPage() {
  const channels = useChatStore((state) => state.channels);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Cột 1: Navigation Sidebar */}
      <Column1Channels />

      {/* Main Settings Panel */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar bg-slate-50/40 dark:bg-slate-900/5 p-6 space-y-6">
        {/* Title Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">Cấu hình Nền tảng và Kênh</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Quản lý các tài khoản mạng xã hội, Zalo OA và các luồng nhận tin nhắn webhook.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/95 transition-all shadow-md shadow-primary/20 scale-100 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Kết nối Kênh mới
          </button>
        </div>

        {/* Channels grid list */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channels.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>
        </div>
      </main>

      {/* Connect Channel Modal */}
      <ConnectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
