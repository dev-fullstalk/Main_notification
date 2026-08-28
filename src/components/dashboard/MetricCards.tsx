'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Clock, Percent, Inbox, MessageSquare } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';

export default function MetricCards() {
  const stats = useChatStore((state) => state.dashboardStats);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* 1. Today's Messages */}
      <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tin nhắn hôm nay</span>
          <h3 className="text-2xl font-bold mt-1.5 leading-none">
            {stats.todayInbound + stats.todayOutbound}
          </h3>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="text-emerald-500 font-medium flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {stats.todayInbound} Nhận
            </span>
            <span className="text-blue-500 font-medium flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {stats.todayOutbound} Gửi
            </span>
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Inbox className="w-6 h-6" />
        </div>
      </div>

      {/* 2. Active Conversations */}
      <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Hội thoại chờ</span>
          <h3 className="text-2xl font-bold mt-1.5 leading-none">
            {stats.openConversations + stats.pendingConversations}
          </h3>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="text-amber-500 font-medium">
              {stats.openConversations} Đang mở
            </span>
            <span className="text-purple-500 font-medium">
              {stats.pendingConversations} Chờ xử lý
            </span>
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
          <MessageSquare className="w-6 h-6" />
        </div>
      </div>

      {/* 3. Response Time */}
      <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tốc độ phản hồi</span>
          <h3 className="text-2xl font-bold mt-1.5 leading-none">
            {stats.avgResponseTimeMin} phút
          </h3>
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <span className="text-emerald-500 font-semibold flex items-center">
              -0.4m
            </span>
            <span>so với hôm qua</span>
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
          <Clock className="w-6 h-6" />
        </div>
      </div>

      {/* 4. Response Rate */}
      <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tỷ lệ phản hồi</span>
          <h3 className="text-2xl font-bold mt-1.5 leading-none">
            {stats.responseRate}%
          </h3>
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <span className="text-emerald-500 font-semibold flex items-center">
              +0.2%
            </span>
            <span>tỷ lệ hoàn thành</span>
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
          <Percent className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
