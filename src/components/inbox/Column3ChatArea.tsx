'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Paperclip, CheckCircle2, UserCheck, X } from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import MessageBubble from './MessageBubble';
import { CONVERSATION_STATUSES } from '../../lib/constants';

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
  } = useChatStore();

  const [inputVal, setInputVal] = useState('');
  const [mockAttachment, setMockAttachment] = useState<{ type: 'image' | 'file'; url: string; name: string } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Find active conversation, contact and message list
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const activeContact = activeConversation ? contacts.find(ct => ct.id === activeConversation.contactId) : null;
  const activeMessages = activeConversation ? messages.filter(m => m.conversationId === activeConversationId) : [];

  // Auto-scroll to bottom of conversation feed
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeMessages]);

  if (!activeConversation || !activeContact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background text-muted-foreground">
        <p className="text-sm">Chọn một cuộc hội thoại từ danh sách để bắt đầu chat</p>
      </div>
    );
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() && !mockAttachment) return;

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
        url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&h=400&q=80',
        name: 'Mẫu giày Sneaker Red.png'
      });
    } else {
      setMockAttachment({
        type: 'file',
        url: '#',
        name: 'Báo giá sản phẩm.pdf'
      });
    }
  };

  const removeAttachment = () => {
    setMockAttachment(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden select-none">
      {/* Header Workspace */}
      <header className="p-4 border-b border-border flex items-center justify-between bg-card text-card-foreground">
        {/* Customer Basic Info */}
        <div className="flex items-center gap-3">
          <img
            src={activeContact.avatarUrl}
            alt={activeContact.name}
            className="w-10 h-10 rounded-full border border-border bg-muted shadow-sm"
          />
          <div>
            <h3 className="text-sm font-semibold leading-tight">{activeContact.name}</h3>
            <span className="text-[10px] text-muted-foreground font-medium">SĐT: {activeContact.phone || 'Chưa có'}</span>
          </div>
        </div>

        {/* Action Dropdowns */}
        <div className="flex items-center gap-3">
          {/* Assign Agent Selector */}
          <div className="flex items-center gap-1">
            <UserCheck className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={activeConversation.assignedUserId || ''}
              onChange={(e) => assignAgent(activeConversation.id, e.target.value || null)}
              className="text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground font-medium transition-colors"
            >
              <option value="">Chưa phân công</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Changer Dropdown */}
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={activeConversation.status}
              onChange={(e) => changeConversationStatus(activeConversation.id, e.target.value as any)}
              className={`text-xs border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary font-bold transition-all ${
                activeConversation.status === 'open' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' :
                activeConversation.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300 dark:border-amber-800' :
                activeConversation.status === 'resolved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border-blue-300 dark:border-blue-800' :
                'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 border-border'
              }`}
            >
              <option value="open">Đang mở (Open)</option>
              <option value="pending">Chờ xử lý (Pending)</option>
              <option value="resolved">Đã xong (Resolved)</option>
              <option value="closed">Đã đóng (Closed)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Message Feed History list */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/10"
      >
        {activeMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
            Bắt đầu cuộc hội thoại bằng cách gửi tin nhắn đầu tiên.
          </div>
        ) : (
          activeMessages.map((m) => {
            const senderAgent = m.senderUserId ? users.find(u => u.id === m.senderUserId) : undefined;
            return (
              <MessageBubble
                key={m.id}
                message={m}
                contact={activeContact}
                agent={senderAgent}
              />
            );
          })
        )}
      </div>

      {/* Chat Input Container */}
      <footer className="p-4 border-t border-border bg-card text-card-foreground">
        {/* Attachment Preview Box */}
        {mockAttachment && (
          <div className="mb-3 p-2 bg-muted rounded-xl flex items-center justify-between border border-border max-w-sm animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-2 truncate">
              {mockAttachment.type === 'image' ? (
                <img 
                  src={mockAttachment.url} 
                  alt="Attachment Preview" 
                  className="w-10 h-10 object-cover rounded-lg border border-border"
                />
              ) : (
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                  <Paperclip className="w-5 h-5" />
                </div>
              )}
              <div className="truncate">
                <p className="text-xs font-semibold truncate text-foreground">{mockAttachment.name}</p>
                <span className="text-[10px] text-muted-foreground uppercase">{mockAttachment.type}</span>
              </div>
            </div>
            <button 
              onClick={removeAttachment}
              className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-muted-foreground transition-colors"
              title="Gỡ đính kèm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-3">
          {/* Quick attachment options */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => selectMockAttachment('image')}
              className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted transition-colors shrink-0"
              title="Đính kèm ảnh minh họa"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => selectMockAttachment('file')}
              className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted transition-colors shrink-0"
              title="Đính kèm tài liệu minh họa"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          {/* Textarea Input */}
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Nhập câu trả lời cho khách hàng (nhấn Enter để gửi)..."
            className="flex-1 px-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
          />

          {/* Send Button */}
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/95 transition-all shadow-md shadow-primary/20 shrink-0"
            aria-label="Gửi tin nhắn"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>
      </footer>
    </div>
  );
}
