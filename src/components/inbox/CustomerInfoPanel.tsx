'use client';

import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, Calendar, Tag, FileText, ChevronRight, X } from 'lucide-react';
import { Contact } from '../../types/contact';
import { Conversation } from '../../types/conversation';
import { PLATFORMS } from '../../lib/constants';
import { useChatStore } from '../../store/useChatStore';

interface CustomerInfoPanelProps {
  contact: Contact;
  conversation: Conversation;
}

export default function CustomerInfoPanel({ contact, conversation }: CustomerInfoPanelProps) {
  const { isCustomerInfoOpen, setCustomerInfoOpen } = useChatStore();
  const [note, setNote] = useState('Khách hàng thân thiết, ưu tiên phản hồi nhanh. Thích mẫu Sneaker Pro Black size 42.');
  const platformConfig = PLATFORMS[contact.channelId as keyof typeof PLATFORMS] || PLATFORMS.facebook;

  // Listen to Esc key to close customer info panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCustomerInfoOpen) {
        setCustomerInfoOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCustomerInfoOpen, setCustomerInfoOpen]);

  return (
    <>
      {/* Backdrop overlay */}
      {isCustomerInfoOpen && (
        <div 
          onClick={() => setCustomerInfoOpen(false)}
          className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-30 transition-opacity cursor-pointer animate-in fade-in duration-200"
        />
      )}

      {/* Slide-over Right Drawer */}
      <aside 
        className={`fixed inset-y-0 right-0 z-40 w-80 bg-card border-l border-border shadow-2xl flex flex-col h-full select-none overflow-y-auto custom-scrollbar transform transition-transform duration-300 ease-in-out ${
          isCustomerInfoOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Drawer Header with Title & Close Button */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
            Thông tin khách hàng
          </span>
          <button
            onClick={() => setCustomerInfoOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Customer Header summary */}
        <div className="p-6 flex flex-col items-center text-center border-b border-border">
        <img
          src={contact.avatarUrl}
          alt={contact.name}
          className="w-20 h-20 rounded-full border border-border shadow-sm mb-3 bg-muted"
        />
        <h4 className="font-bold text-sm leading-snug">{contact.name}</h4>
        
        {/* Platform Badge */}
        <div className="flex gap-1.5 mt-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {platformConfig.name}
          </span>
        </div>
      </div>

      {/* Customer Metadata fields */}
      <div className="p-5 space-y-4">
        <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Thông tin liên hệ</h5>
        
        <div className="space-y-3 text-xs">
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-foreground">{contact.phone || 'Chưa có số điện thoại'}</span>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-foreground truncate">{contact.email || 'Chưa có email'}</span>
          </div>
        </div>
      </div>

      {/* Interactive Notes Section */}
      <div className="p-5 border-t border-border space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ghi chú khách hàng</h5>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Nhập ghi chú riêng cho khách hàng này..."
          className="w-full p-2.5 border border-border rounded-lg bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none custom-scrollbar"
        />
        <p className="text-[9px] text-muted-foreground italic">
          * Ghi chú lưu nội bộ cho nhân viên trực chat.
        </p>
      </div>
    </aside>
    </>
  );
}
