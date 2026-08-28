'use client';

import React, { useMemo } from 'react';
import { Search, Filter, MessageSquareDashed } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { formatRelativeTime } from '../../lib/utils';
import { PLATFORMS } from '../../lib/constants';

export default function Column2ConvList() {
  const {
    conversations,
    contacts,
    channels,
    activeChannelId,
    activeConversationId,
    setActiveConversationId,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
  } = useChatStore();

  // Handle Search & Filter computation
  const filteredConversations = useMemo(() => {
    return conversations
      .filter((c) => {
        // 1. Filter by Channel
        if (activeChannelId && c.channelId !== activeChannelId) return false;
        
        // Find corresponding contact
        const contact = contacts.find((ct) => ct.id === c.contactId);
        if (!contact) return false;

        // 2. Filter by Search Query (Name or Phone)
        if (searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase();
          const nameMatch = contact.name.toLowerCase().includes(query);
          const phoneMatch = contact.phone ? contact.phone.includes(query) : false;
          const msgMatch = c.lastMessagePreview ? c.lastMessagePreview.toLowerCase().includes(query) : false;
          if (!nameMatch && !phoneMatch && !msgMatch) return false;
        }

        // 3. Filter by Status Tab
        if (statusFilter === 'unread') {
          return c.unreadCount > 0;
        } else if (statusFilter === 'active') {
          return c.status === 'open' || c.status === 'pending';
        } else if (statusFilter === 'resolved') {
          return c.status === 'resolved' || c.status === 'closed';
        }

        return true; // 'all'
      })
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()); // Sort newest first
  }, [conversations, contacts, activeChannelId, searchQuery, statusFilter]);

  return (
    <section className="w-80 border-r border-border bg-card flex flex-col h-full shrink-0 select-none">
      {/* Search Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT khách..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex gap-1 border-b border-border/50 pb-1">
          {(['all', 'unread', 'active', 'resolved'] as const).map((tab) => {
            const label = 
              tab === 'all' ? 'Tất cả' :
              tab === 'unread' ? 'Chưa đọc' :
              tab === 'active' ? 'Đang chờ' : 'Đã xong';
            
            const isActive = statusFilter === tab;

            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-lg transition-all ${
                  isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversations Queue */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground p-4">
            <MessageSquareDashed className="w-8 h-8 stroke-1.5 mb-2 text-muted-foreground/60" />
            <p className="text-xs text-center">Không tìm thấy cuộc hội thoại nào</p>
          </div>
        ) : (
          filteredConversations.map((c) => {
            const contact = contacts.find((ct) => ct.id === c.contactId);
            const channel = channels.find((ch) => ch.id === c.channelId);
            if (!contact) return null;

            const platformConfig = channel ? PLATFORMS[channel.platform] : PLATFORMS.livechat;
            const isActive = activeConversationId === c.id;

            return (
              <button
                key={c.id}
                onClick={() => setActiveConversationId(c.id)}
                className={`w-full text-left p-3.5 border-b border-border/50 transition-all flex gap-3 relative ${
                  isActive 
                    ? 'bg-primary/5 dark:bg-primary/10 border-l-[3px] border-l-primary' 
                    : 'hover:bg-muted/30'
                }`}
              >
                {/* Avatar with Platform Overlaid Icon */}
                <div className="relative shrink-0">
                  <img
                    src={contact.avatarUrl}
                    alt={contact.name}
                    className="w-10 h-10 rounded-full border border-border bg-muted shadow-sm"
                  />
                  {/* Small circular logo showing channel source */}
                  <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-white dark:bg-card border border-border p-0.5 flex items-center justify-center shadow-sm">
                    <img 
                      src={platformConfig.avatarUrl} 
                      alt={channel?.platform}
                      className="w-3.5 h-3.5 object-contain"
                    />
                  </div>
                </div>

                {/* Text Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className={`text-xs font-semibold truncate ${
                      isActive ? 'text-primary' : 'text-foreground'
                    }`}>
                      {contact.name}
                    </h4>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                      {formatRelativeTime(c.lastMessageAt)}
                    </span>
                  </div>
                  <p className={`text-[11px] truncate leading-normal ${
                    c.unreadCount > 0 ? 'text-foreground font-semibold' : 'text-muted-foreground'
                  }`}>
                    {c.lastMessagePreview || 'Chưa có tin nhắn'}
                  </p>
                </div>

                {/* Unread Counter Badge / Status Dot */}
                {c.unreadCount > 0 && (
                  <div className="absolute right-3.5 bottom-3.5 bg-red-500 text-white font-bold text-[9px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center leading-none shadow-sm animate-pulse">
                    {c.unreadCount}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
