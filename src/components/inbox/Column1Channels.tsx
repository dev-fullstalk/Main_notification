'use client';

import React, { useEffect, useState } from 'react';
import { 
  MessageSquare, 
  LayoutDashboard, 
  Plus, 
  Sun, 
  Moon, 
  Settings, 
  PanelLeftClose, 
  LogOut, 
  ChevronDown, 
  ChevronRight,
  Layers,
  CheckCircle2,
  Circle,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { PLATFORMS } from '../../lib/constants';
import ConnectModal from '../channels/ConnectModal';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Column1Channels() {
  const pathname = usePathname();
  const router = useRouter();
  const { 
    channels, 
    conversations, 
    activeChannelId, 
    setActiveChannelId, 
    currentUser,
    isSidebarOpen,
    toggleSidebar,
    renameChannel,
  } = useChatStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPlatform, setModalPlatform] = useState<'telegram' | 'whatsapp' | 'zalo' | 'facebook' | undefined>(undefined);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Accordion open/collapse state for each platform group (all open by default)
  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({
    zalo: true,
    telegram: true,
    facebook: true,
    whatsapp: true,
  });

  const togglePlatformExpand = (plat: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedPlatforms((prev) => ({
      ...prev,
      [plat]: !prev[plat],
    }));
  };

  const openConnectForPlatform = (plat?: 'telegram' | 'whatsapp' | 'zalo' | 'facebook', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setModalPlatform(plat);
    setIsModalOpen(true);
  };

  // Listen to Ctrl+B key to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

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

  // Helper to calculate total unread messages per channel or platform
  const getUnreadCount = (channelIdOrPlatform: string | null) => {
    return conversations
      .filter((c) => {
        if (!channelIdOrPlatform) return c.status !== 'closed';
        if (channelIdOrPlatform.startsWith('platform:')) {
          const plat = channelIdOrPlatform.replace('platform:', '');
          const chan = channels.find((ch) => ch.id === c.channelId);
          return chan && chan.platform === plat && c.status !== 'closed';
        }
        return c.channelId === channelIdOrPlatform && c.status !== 'closed';
      })
      .reduce((sum, c) => sum + c.unreadCount, 0);
  };

  const totalUnreadAll = getUnreadCount(null);

  const platformKeys: ('zalo' | 'telegram' | 'facebook' | 'whatsapp')[] = ['zalo', 'telegram', 'facebook', 'whatsapp'];

  return (
    <aside 
      className={`border-r border-border bg-card flex flex-col h-full shrink-0 select-none transition-all duration-300 ease-in-out overflow-hidden z-20 ${
        isSidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 border-r-0 pointer-events-none'
      }`}
    >
      <div className="w-64 flex flex-col h-full shrink-0">
        {/* Brand Header with Close Button */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-md shadow-primary/20 shrink-0">
              TX
            </div>
            <span className="font-bold text-sm tracking-wider uppercase bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent truncate">
              Terax Omnichannel
            </span>
          </div>

          {/* Collapse Button */}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0 cursor-pointer"
            title="Thu gọn menu (Ctrl+B)"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Main Navigation Views */}
        <div className="p-3 space-y-1">
          <Link
            href="/inbox"
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
          <span>Nhóm nền tảng & Tài khoản</span>
          <button
            onClick={(e) => openConnectForPlatform(undefined, e)}
            className="p-1 rounded hover:bg-muted text-primary hover:scale-105 transition-all cursor-pointer flex items-center gap-1 font-semibold text-[10px]"
            title="Thêm tài khoản / Kênh mới"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm kênh</span>
          </button>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1.5 custom-scrollbar">
          {/* All Platforms Filter */}
          <button
            onClick={async () => {
              await setActiveChannelId(null);
              if (pathname !== '/inbox') {
                router.push('/inbox');
              }
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              activeChannelId === null && pathname === '/inbox'
                ? 'bg-muted text-foreground font-semibold ring-1 ring-border shadow-sm'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-foreground flex items-center justify-center font-bold text-[10px] shadow-sm">
                ALL
              </div>
              <span className="font-medium">Tất cả tin nhắn</span>
            </div>
            {totalUnreadAll > 0 && (
              <span className="bg-red-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                {totalUnreadAll}
              </span>
            )}
          </button>

          {/* Platform Groups (Zalo, Telegram, Facebook, WhatsApp) */}
          {platformKeys.map((plat) => {
            const config = PLATFORMS[plat] || PLATFORMS.livechat;
            const platChannels = channels.filter(c => c.platform === plat);
            const activePlatChannels = platChannels.filter(c => c.isActive);
            const isExpanded = !!expandedPlatforms[plat];
            const platformUnread = getUnreadCount(`platform:${plat}`);
            const isPlatformSelected = activeChannelId === `platform:${plat}` && pathname === '/inbox';

            return (
              <div 
                key={plat} 
                className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden transition-all duration-200"
              >
                {/* Platform Group Header Row */}
                <div
                  onClick={() => togglePlatformExpand(plat)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 text-xs transition-all cursor-pointer select-none ${
                    isPlatformSelected 
                      ? 'bg-primary/10 text-primary font-semibold' 
                      : 'hover:bg-muted/60 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => togglePlatformExpand(plat, e)}
                      className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-transform"
                      title={isExpanded ? "Thu gọn" : "Mở rộng"}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                    
                    <img
                      src={config.avatarUrl}
                      alt={config.name}
                      className="w-5 h-5 object-contain shrink-0 bg-white rounded-md p-0.5 border border-border/40 shadow-xs"
                    />

                    <span className="font-semibold text-xs truncate">
                      {config.name}
                    </span>

                    {/* Account Count Badge */}
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-muted text-muted-foreground rounded-md font-medium shrink-0">
                      {platChannels.length} acc
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Platform Total Unread */}
                    {platformUnread > 0 && (
                      <span className="bg-red-500 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                        {platformUnread}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Accounts Accordion */}
                {isExpanded && (
                  <div className="pl-4 pr-1.5 py-1 space-y-1 bg-background/50 border-t border-border/40 animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Option to select All accounts for this platform */}
                    {platChannels.length > 1 && (
                      <button
                        onClick={async () => {
                          await setActiveChannelId(`platform:${plat}`);
                          if (pathname !== '/inbox') {
                            router.push('/inbox');
                          }
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer ${
                          isPlatformSelected
                            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Layers className="w-3.5 h-3.5 shrink-0 opacity-70" />
                          <span className="truncate">Tất cả {config.name} ({platChannels.length} acc)</span>
                        </div>
                        {platformUnread > 0 && (
                          <span className={`font-bold text-[9px] px-1.5 py-0.2 rounded-full shrink-0 ${
                            isPlatformSelected ? 'bg-white text-primary' : 'bg-red-500 text-white'
                          }`}>
                            {platformUnread}
                          </span>
                        )}
                      </button>
                    )}

                    {/* List of Individual Accounts */}
                    {platChannels.map((chan) => {
                      const unread = getUnreadCount(chan.id);
                      const isSelected = activeChannelId === chan.id && pathname === '/inbox';
                      const isEditingThis = editingChannelId === chan.id;

                      if (isEditingThis) {
                        return (
                          <form
                            key={chan.id}
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (editingName.trim() && editingName.trim() !== chan.name) {
                                await renameChannel(chan.id, editingName.trim());
                              }
                              setEditingChannelId(null);
                            }}
                            className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-background border border-primary shadow-xs"
                          >
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              autoFocus
                              className="flex-1 min-w-0 px-1.5 py-0.5 text-[11px] font-medium bg-transparent text-foreground focus:outline-none"
                            />
                            <button
                              type="submit"
                              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shrink-0"
                              title="Lưu"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingChannelId(null)}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0"
                              title="Hủy"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </form>
                        );
                      }

                      return (
                        <div
                          key={chan.id}
                          className={`group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
                            isSelected
                              ? 'bg-muted text-foreground font-semibold ring-1 ring-border shadow-xs'
                              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={async () => {
                              await setActiveChannelId(chan.id);
                              if (pathname !== '/inbox') {
                                router.push('/inbox');
                              }
                            }}
                            className="flex-1 flex items-center gap-2 truncate min-w-0 text-left cursor-pointer"
                          >
                            {/* Online / Active Indicator dot */}
                            <span 
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                chan.isActive 
                                  ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' 
                                  : 'bg-neutral-300 dark:bg-neutral-600'
                              }`} 
                              title={chan.isActive ? 'Đang hoạt động' : 'Đã đăng xuất'}
                            />
                            <span className="truncate">{chan.name}</span>
                          </button>

                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            {/* Edit Name Button on Hover */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingName(chan.name);
                                setEditingChannelId(chan.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-opacity cursor-pointer"
                              title="Đổi tên tài khoản"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>

                            {unread > 0 && (
                              <span className="bg-red-500 text-white font-bold text-[9px] px-1.5 py-0.2 rounded-full">
                                {unread}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {platChannels.length === 0 && (
                      <p className="text-[10px] text-muted-foreground/60 italic py-1 px-2 text-center">
                        Chưa có tài khoản
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* User Footer Profile */}
        <div className="p-3 border-t border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full border border-border bg-white shadow-sm shrink-0"
            />
            <div className="truncate">
              <h5 className="text-xs font-semibold leading-tight text-foreground truncate">{currentUser.name}</h5>
              <span className="text-[10px] text-muted-foreground font-medium capitalize">{currentUser.role} trực chat</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Theme Switcher Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-card text-muted-foreground hover:text-foreground border border-border shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Đổi giao diện Sáng / Tối"
            >
              {theme === 'light' ? (
                <Moon className="w-3.5 h-3.5" />
              ) : (
                <Sun className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Logout Operator Button */}
            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className="p-1.5 rounded-lg bg-card text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-border shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Đăng xuất tài khoản"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Connect Channel Modal */}
      <ConnectModal
        isOpen={isModalOpen}
        initialPlatform={modalPlatform}
        onClose={() => {
          setIsModalOpen(false);
          setModalPlatform(undefined);
        }}
      />

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card text-card-foreground p-6 rounded-2xl border border-border shadow-2xl max-w-sm w-full space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold">Đăng xuất tài khoản?</h3>
              <p className="text-xs text-muted-foreground">
                Bạn có chắc chắn muốn đăng xuất phiên làm việc hiện tại của tài khoản <strong>{currentUser.name}</strong> không?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  window.location.reload();
                }}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-all shadow-md cursor-pointer"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
