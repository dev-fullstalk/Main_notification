'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare, LayoutDashboard, Plus, Sun, Moon, Link2, Settings } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { PLATFORMS } from '../../lib/constants';
import ConnectModal from '../channels/ConnectModal';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Column1Channels() {
  const pathname = usePathname();
  const { channels, conversations, activeChannelId, setActiveChannelId, currentUser } = useChatStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Dark Mode detection & setting
  useEffect(() => {
    const savedTheme = localStorage.getItem('color-scheme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('color-scheme', nextTheme);
    
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  };

  // Helper to calculate total unread messages per channel
  const getUnreadCount = (channelId: string | null) => {
    return conversations
      .filter((c) => {
        if (channelId && c.channelId !== channelId) return false;
        return c.status !== 'closed'; // only count open/pending
      })
      .reduce((sum, c) => sum + c.unreadCount, 0);
  };

  const totalUnreadAll = getUnreadCount(null);

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/20">
            TX
          </div>
          <span className="font-bold text-sm tracking-wider uppercase bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
            Terax Omnichannel
          </span>
        </div>
      </div>

      {/* Main Navigation Views */}
      <div className="p-3 space-y-1">
        <Link
          href="/inbox"
          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            pathname === '/inbox'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span>Hộp thư chính</span>
          </div>
          {totalUnreadAll > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              pathname === '/inbox' ? 'bg-white text-primary' : 'bg-red-500 text-white'
            }`}>
              {totalUnreadAll}
            </span>
          )}
        </Link>

        <Link
          href="/dashboard"
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            pathname === '/dashboard'
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Báo cáo Tổng quan</span>
        </Link>

        <Link
          href="/settings/channels"
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            pathname.startsWith('/settings')
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Cấu hình kênh</span>
        </Link>
      </div>

      {/* Channel Filters Title */}
      <div className="px-4 py-2 flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground tracking-wider border-t border-border mt-2">
        <span>Nền tảng liên kết</span>
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-1 rounded hover:bg-muted text-primary hover:scale-105 transition-all"
          title="Kết nối kênh mới"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Channels List (Only render if in inbox) */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
        {/* All Platforms */}
        <button
          onClick={() => setActiveChannelId(null)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
            activeChannelId === null
              ? 'bg-muted text-foreground font-semibold ring-1 ring-border'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-foreground flex items-center justify-center font-bold text-[10px]">
              ALL
            </div>
            <span>Tất cả nền tảng</span>
          </div>
          {totalUnreadAll > 0 && (
            <span className="bg-red-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full">
              {totalUnreadAll}
            </span>
          )}
        </button>

        {/* Individual Channels */}
        {channels.filter(c => c.isActive).map((chan) => {
          const config = PLATFORMS[chan.platform] || PLATFORMS.livechat;
          const unread = getUnreadCount(chan.id);
          const isSelected = activeChannelId === chan.id;

          return (
            <button
              key={chan.id}
              onClick={() => setActiveChannelId(chan.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                isSelected
                  ? 'bg-muted text-foreground font-semibold ring-1 ring-border'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <img
                  src={chan.avatarUrl || config.avatarUrl}
                  alt={chan.name}
                  className="w-6 h-6 rounded-lg object-contain shrink-0 bg-white"
                />
                <span className="truncate text-left">{chan.name}</span>
              </div>
              {unread > 0 && (
                <span className="bg-red-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full shrink-0">
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-border bg-muted/40 flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="w-9 h-9 rounded-full border border-border bg-white shadow-sm shrink-0"
          />
          <div className="truncate">
            <h5 className="text-xs font-semibold leading-tight text-foreground truncate">{currentUser.name}</h5>
            <span className="text-[10px] text-muted-foreground font-medium capitalize">{currentUser.role} trực chat</span>
          </div>
        </div>

        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-card text-muted-foreground hover:text-foreground border border-border shadow-sm transition-all hover:scale-105 active:scale-95"
          aria-label="Đổi giao diện"
        >
          {theme === 'light' ? (
            <Moon className="w-3.5 h-3.5" />
          ) : (
            <Sun className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Connect Channel Modal */}
      <ConnectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </aside>
  );
}
