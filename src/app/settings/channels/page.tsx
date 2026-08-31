'use client';

import React, { useState } from 'react';
import Column1Channels from '../../../components/inbox/Column1Channels';
import ChannelCard from '../../../components/channels/ChannelCard';
import ConnectModal from '../../../components/channels/ConnectModal';
import SyncStatusWidget from '../../../components/channels/SyncStatusWidget';
import { useChatStore } from '../../../store/useChatStore';
import { PLATFORMS } from '../../../lib/constants';
import { Plus, Settings, PanelLeftOpen, Layers } from 'lucide-react';

export default function SettingsChannelsPage() {
  const { channels, isSidebarOpen, toggleSidebar } = useChatStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'telegram' | 'whatsapp' | 'zalo' | 'facebook' | undefined>(undefined);

  const platformKeys: ('zalo' | 'telegram' | 'facebook' | 'whatsapp')[] = ['zalo', 'telegram', 'facebook', 'whatsapp'];

  const openConnectForPlatform = (plat?: 'telegram' | 'whatsapp' | 'zalo' | 'facebook') => {
    setSelectedPlatform(plat);
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Cột 1: Navigation Sidebar */}
      <Column1Channels />

      {/* Main Settings Panel */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar bg-slate-50/40 dark:bg-slate-900/5 p-6 space-y-6">
        {/* Title Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-sm shrink-0 cursor-pointer"
                title="Mở thanh kênh (Ctrl+B)"
              >
                <PanelLeftOpen className="w-5 h-5 text-primary" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold tracking-tight">Cấu hình Nền tảng và Nhóm Kênh</h1>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Quản lý các nhóm tài khoản Zalo, Telegram, Facebook Fanpage, WhatsApp chạy song song mà không bị ghi đè.
              </p>
            </div>
          </div>
        </div>

        {/* Sync Engine Controller Widget */}
        <SyncStatusWidget />

        {/* Channels grouped by platform */}
        <div className="space-y-6">
          {platformKeys.map((plat) => {
            const config = PLATFORMS[plat] || PLATFORMS.livechat;
            const platChannels = channels.filter((c) => c.platform === plat);

            return (
              <div key={plat} className="space-y-3 bg-card p-5 rounded-2xl border border-border shadow-xs">
                {/* Platform Group Section Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-muted p-1 flex items-center justify-center border border-border shrink-0 bg-white">
                      <img
                        src={config.avatarUrl}
                        alt={config.name}
                        className="w-6 h-6 object-contain"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-foreground">
                          Nhóm {config.name}
                        </h2>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-muted text-muted-foreground rounded-full font-medium">
                          {platChannels.length} tài khoản
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {plat === 'zalo' 
                          ? 'Tất cả tài khoản Zalo cá nhân & OA đang đồng bộ tin nhắn.' 
                          : `Các tài khoản và kênh thuộc nền tảng ${config.name}.`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => openConnectForPlatform(plat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm acc {config.name}</span>
                  </button>
                </div>

                {/* Account Cards Grid */}
                {platChannels.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {platChannels.map((channel) => (
                      <ChannelCard key={channel.id} channel={channel} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Connect Channel Modal */}
      <ConnectModal
        isOpen={isModalOpen}
        initialPlatform={selectedPlatform}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPlatform(undefined);
        }}
      />
    </div>
  );
}
