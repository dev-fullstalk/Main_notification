'use client';

import React, { useState } from 'react';
import { User, Phone, Mail, Calendar, Tag, FileText, ChevronRight } from 'lucide-react';
import { Contact } from '../../types/contact';
import { Conversation } from '../../types/conversation';
import { PLATFORMS } from '../../lib/constants';

interface CustomerInfoPanelProps {
  contact: Contact;
  conversation: Conversation;
}

export default function CustomerInfoPanel({ contact, conversation }: CustomerInfoPanelProps) {
  const [note, setNote] = useState('Khách hàng thân thiết, ưu tiên phản hồi nhanh. Thích mẫu Sneaker Pro Black size 42.');
  const platformConfig = PLATFORMS[contact.channelId as keyof typeof PLATFORMS] || PLATFORMS.facebook;

  return (
    <aside className="w-80 border-l border-border bg-card flex flex-col h-full shrink-0 select-none overflow-y-auto custom-scrollbar">
      {/* Customer Header summary */}
      <div className="p-6 flex flex-col items-center text-center border-b border-border">
        <img
          src={contact.avatarUrl}
          alt={contact.name}
          className="w-20 h-20 rounded-full border border-border shadow-sm mb-3 bg-muted"
        />
        <h4 className="font-bold text-sm leading-snug">{contact.name}</h4>
        
        {/* VIP / Category Tags */}
        <div className="flex gap-1.5 mt-2">
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
            Khách VIP
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
            {platformConfig.name}
          </span>
        </div>
      </div>

      {/* Customer Metadata fields */}
      <div className="p-5 space-y-4">
        <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Thông tin cá nhân</h5>
        
        <div className="space-y-3 text-xs">
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-foreground">{contact.phone || 'Chưa cung cấp'}</span>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-foreground truncate">{contact.email || 'Chưa cung cấp'}</span>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-foreground">Đăng ký: 24/08/2026</span>
          </div>
        </div>
      </div>

      {/* Interactive Notes Section */}
      <div className="p-5 border-t border-border space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ghi chú CSKH</h5>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Nhập ghi chú riêng cho khách hàng này..."
          className="w-full p-2.5 border border-border rounded-lg bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none custom-scrollbar"
        />
        <p className="text-[9px] text-muted-foreground italic">
          * Ghi chú này chỉ hiển thị nội bộ cho các nhân viên trực chat.
        </p>
      </div>

      {/* Transaction Summary list */}
      <div className="p-5 border-t border-border space-y-3">
        <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lịch sử mua hàng</h5>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50 text-xs">
            <div>
              <p className="font-semibold">Mã đơn #10492</p>
              <span className="text-[10px] text-muted-foreground">24/08/2026</span>
            </div>
            <span className="font-bold text-primary">1,250,000đ</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50 text-xs">
            <div>
              <p className="font-semibold">Mã đơn #10291</p>
              <span className="text-[10px] text-muted-foreground">12/07/2026</span>
            </div>
            <span className="font-bold text-muted-foreground">890,000đ</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
