'use client';

import React, { useState } from 'react';
import Column1Channels from '../../components/inbox/Column1Channels';
import MetricCards from '../../components/dashboard/MetricCards';
import PerformanceChart from '../../components/dashboard/PerformanceChart';
import AgentLeaderboard from '../../components/dashboard/AgentLeaderboard';
import ChannelCard from '../../components/channels/ChannelCard';
import ConnectModal from '../../components/channels/ConnectModal';
import { useChatStore } from '../../store/useChatStore';
import { Plus, Link2, PanelLeftOpen } from 'lucide-react';

export default function DashboardPage() {
  const { channels, isSidebarOpen, toggleSidebar } = useChatStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Cột 1: Navigation Sidebar */}
      <Column1Channels />

      {/* Main Dashboard Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar bg-slate-50/40 dark:bg-slate-900/5 p-6 space-y-6">
        {/* Page Title Header */}
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
              <h1 className="text-xl font-bold tracking-tight">Hệ thống Quản lý và Phân tích hiệu suất</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Báo cáo tổng lượng tin nhắn, hiệu suất làm việc của đội ngũ trực chat và quản lý kết nối kênh.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: KPI Metrics Row */}
        <MetricCards />

        {/* Section 2: Charts and Productivity Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PerformanceChart />
          <AgentLeaderboard />
        </div>

        {/* Section 3: Channel Management settings panel */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-4.5 h-4.5 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Kênh kết nối đang đồng bộ</h3>
          </div>

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
