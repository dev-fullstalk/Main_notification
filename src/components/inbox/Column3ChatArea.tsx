'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Paperclip, CheckCircle2, UserCheck, X, Info, Smile, Bell, MoreVertical } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import MessageBubble from './MessageBubble';
import { CONVERSATION_STATUSES } from '../../lib/constants';
import { formatTimeOnly } from '../../lib/utils';

export default function Column3ChatArea() {
  const {
    activeConversationId,
    conversations,
    contacts,
    messages,
    users,
    sendMessage,
    assignAgent,
    changeConversationStatus,
    isCustomerInfoOpen,
    toggleCustomerInfo,
  } = useChatStore();

  const [inputVal, setInputVal] = useState('');
  const [mockAttachment, setMockAttachment] = useState<{ type: 'image' | 'file'; url: string; name: string } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Find active conversation, contact and message list
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const activeContact = activeConversation ? contacts.find(ct => ct.id === activeConversation.contactId) : null;
  const activeMessages = activeConversation ? messages.filter(m => m.conversationId === activeConversationId) : [];

  // Auto-scroll to bottom of conversation feed
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeMessages, activeConversation?.isTyping]);

  if (!activeConversation || !activeContact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f4f9] dark:bg-[#0f172a] text-muted-foreground">
        <p className="text-sm">Chọn một cuộc hội thoại từ danh sách để bắt đầu chat</p>
      </div>
    );
  }

  const notifyTyping = (isTyping: boolean) => {
    if (!activeConversation) return;
    fetch('/api/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: activeConversation.id, isTyping }),
    }).catch(() => {});
  };

  const handleInputChange = (val: string) => {
    setInputVal(val);
    if (!activeConversation) return;

    notifyTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      notifyTyping(false);
    }, 3000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() && !mockAttachment) return;

    notifyTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (mockAttachment) {
      sendMessage(activeConversation.id, inputVal, mockAttachment.type, mockAttachment.url);
      setMockAttachment(null);
    } else {
      sendMessage(activeConversation.id, inputVal, 'text');
    }
    
    setInputVal('');
  };

  const selectMockAttachment = (type: 'image' | 'file') => {
    if (type === 'image') {
      setMockAttachment({
        type: 'image',
        url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
        name: 'sneaker_sample.png',
      });
    } else {
      setMockAttachment({
        type: 'file',
        url: '#',
        name: 'Bao_gia_san_pham_2026.pdf',
      });
    }
  };

  const removeAttachment = () => {
    setMockAttachment(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f0f4f9] dark:bg-[#0f172a] relative overflow-hidden">
      {/* 1. Header Workspace - Google Style Solid Blue Bar */}
      <header className="px-5 py-3.5 bg-blue-600 dark:bg-blue-600 text-white flex items-center justify-between shadow-xs z-10">
        {/* Contact Name */}
        <div 
          onClick={toggleCustomerInfo}
          className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
          title="Xem thông tin chi tiết khách hàng"
        >
          <h2 className="text-base font-semibold text-white tracking-normal leading-tight">
            {activeContact.name}
          </h2>
        </div>

        {/* Action Controls & Dropdowns */}
        <div className="flex items-center gap-2.5">
          {/* Assign Agent Selector */}
          <div className="hidden sm:flex items-center gap-1 bg-white/15 hover:bg-white/20 rounded-full px-2.5 py-1 text-xs text-white border border-white/20 transition-colors">
            <UserCheck className="w-3.5 h-3.5 text-white/80 shrink-0" />
            <select
              value={activeConversation.assignedUserId || ''}
              onChange={(e) => assignAgent(activeConversation.id, e.target.value || null)}
              className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="" className="text-black">Chưa phân công</option>
              {users.map((u) => (
                <option key={u.id} value={u.id} className="text-black">
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Changer Dropdown */}
          <div className="hidden sm:flex items-center gap-1 bg-white/15 hover:bg-white/20 rounded-full px-2.5 py-1 text-xs text-white border border-white/20 transition-colors">
            <CheckCircle2 className="w-3.5 h-3.5 text-white/80 shrink-0" />
            <select
              value={activeConversation.status}
              onChange={(e) => changeConversationStatus(activeConversation.id, e.target.value as any)}
              className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="open" className="text-black">Đang mở (Open)</option>
              <option value="pending" className="text-black">Chờ xử lý (Pending)</option>
              <option value="resolved" className="text-black">Đã xong (Resolved)</option>
              <option value="closed" className="text-black">Đã đóng (Closed)</option>
            </select>
          </div>

          {/* Info / Detail Toggle Button */}
          <button
            onClick={toggleCustomerInfo}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isCustomerInfoOpen ? 'bg-white text-blue-600' : 'hover:bg-white/20 text-white/90 hover:text-white'
            }`}
            title="Thông tin chi tiết (Info)"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Message Feed History list */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar"
      >
        {/* Centered Conversation Start Summary */}
        <div className="flex flex-col items-center justify-center my-4">
          <img
            src={activeContact.avatarUrl}
            alt={activeContact.name}
            className="w-10 h-10 rounded-full border border-slate-200/80 shadow-xs mb-2 bg-white object-cover"
          />
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Conversation with {activeContact.name} • {formatTimeOnly(activeConversation.createdAt || new Date().toISOString())}
          </span>
        </div>

        {activeMessages.length === 0 && !activeConversation.isTyping ? (
          <div className="py-8 flex items-center justify-center text-slate-400 text-xs">
            Bắt đầu cuộc hội thoại bằng cách gửi tin nhắn đầu tiên.
          </div>
        ) : (
          <>
            {activeMessages.map((m) => {
              const senderAgent = m.senderUserId ? users.find(u => u.id === m.senderUserId) : undefined;
              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  contact={activeContact}
                  agent={senderAgent}
                />
              );
            })}

            {/* Typing Indicator Bubble */}
            {activeConversation.isTyping && (
              <div className="flex items-center gap-2 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <img
                  src={activeContact.avatarUrl}
                  alt={activeContact.name}
                  className="w-7 h-7 rounded-full border border-border bg-white shadow-xs shrink-0 object-cover"
                />
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-2xl rounded-bl-xs flex items-center gap-2 shadow-xs">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{activeContact.name} đang soạn tin</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. Chat Input Container - Floating Pill Bar with Round Send Button */}
      <footer className="p-4 pt-1 bg-[#f0f4f9] dark:bg-[#0f172a]">
        {/* Attachment Preview Box */}
        {mockAttachment && (
          <div className="mb-2 p-2 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-between border border-slate-200 dark:border-slate-700 max-w-sm shadow-xs animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-2 truncate">
              {mockAttachment.type === 'image' ? (
                <img 
                  src={mockAttachment.url} 
                  alt="Attachment Preview" 
                  className="w-9 h-9 object-cover rounded-xl border border-slate-200"
                />
              ) : (
                <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <Paperclip className="w-4 h-4" />
                </div>
              )}
              <div className="truncate">
                <p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-100">{mockAttachment.name}</p>
                <span className="text-[9px] text-slate-400 uppercase">{mockAttachment.type}</span>
              </div>
            </div>
            <button 
              onClick={removeAttachment}
              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Gỡ đính kèm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2.5">
          {/* Main Clean Floating Input Pill */}
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-full shadow-xs border border-slate-200/80 dark:border-slate-700/80 px-4 py-1.5 flex items-center gap-2 transition-all focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Nhập tin nhắn để trả lời khách hàng..."
              className="flex-1 bg-transparent text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none py-1"
            />
          </div>

          {/* Standalone Circular Send Button */}
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="w-10 h-10 rounded-full bg-blue-600 text-white shadow-xs flex items-center justify-center hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-blue-600"
            aria-label="Gửi tin nhắn"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </footer>
    </div>
  );
}
