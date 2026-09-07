'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Image as ImageIcon,
  Paperclip,
  CheckCircle2,
  UserCheck,
  X,
  MoreVertical,
  BarChart3,
  Plus,
  Trash2,
  Users,
  Loader2,
  FileText,
  UploadCloud,
} from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import MessageBubble from './MessageBubble';
import { formatTimeOnly } from '../../lib/utils';
import { compressImage, formatFileSize, isImageFile } from '../../lib/file-compressor';

interface PendingAttachment {
  file: File;
  previewUrl?: string;
  name: string;
  sizeFormatted: string;
  type: 'image' | 'file';
}

export default function Column3ChatArea() {
  const {
    activeConversationId,
    conversations,
    contacts,
    messages,
    users,
    sendMessage,
    createPoll,
    assignAgent,
    changeConversationStatus,
    isCustomerInfoOpen,
    toggleCustomerInfo,
  } = useChatStore();

  const [inputVal, setInputVal] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Poll Modal State
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [allowMultiChoices, setAllowMultiChoices] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [pollError, setPollError] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSendingRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find active conversation, contact and message list
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const activeContact = activeConversation ? contacts.find((ct) => ct.id === activeConversation.contactId) : null;
  const activeMessages = activeConversation ? messages.filter((m) => m.conversationId === activeConversationId) : [];

  // Auto-scroll to bottom of conversation feed
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeMessages, activeConversation?.isTyping]);

  // Clean up object URLs on unmount or when attachment changes
  useEffect(() => {
    return () => {
      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
    };
  }, [pendingAttachment]);

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

    if (val.trim()) {
      notifyTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        notifyTyping(false);
      }, 3000);
    } else {
      notifyTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  // Process raw file with compression if image
  const processSelectedFile = async (rawFile: File) => {
    if (isImageFile(rawFile)) {
      // 1. Client-Side Image Compression to save 85-95% storage
      const compressed = await compressImage(rawFile, 1920, 1920, 0.82);
      const previewUrl = URL.createObjectURL(compressed);
      setPendingAttachment({
        file: compressed,
        previewUrl,
        name: compressed.name,
        sizeFormatted: formatFileSize(compressed.size),
        type: 'image',
      });
    } else {
      setPendingAttachment({
        file: rawFile,
        name: rawFile.name,
        sizeFormatted: formatFileSize(rawFile.size),
        type: 'file',
      });
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processSelectedFile(file);
    }
    // reset input value so same file can be re-selected
    e.target.value = '';
  };

  const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processSelectedFile(file);
    }
    e.target.value = '';
  };

  // Clipboard Paste (Ctrl+V) handler for screenshots / images
  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await processSelectedFile(file);
          break;
        }
      }
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processSelectedFile(files[0]);
    }
  };

  const removeAttachment = () => {
    if (pendingAttachment?.previewUrl) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }
    setPendingAttachment(null);
  };

  // Send Message & Upload File
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const textToSend = inputVal.trim();
    const attachmentToSend = pendingAttachment;

    if (!textToSend && !attachmentToSend) {
      return;
    }

    if (isSendingRef.current || !activeConversation) {
      return;
    }

    isSendingRef.current = true;
    setIsSending(true);
    setInputVal('');
    setPendingAttachment(null);

    notifyTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      if (attachmentToSend) {
        setIsUploading(true);
        // 1. Upload file to /api/upload
        const formData = new FormData();
        formData.append('file', attachmentToSend.file);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadJson = await uploadRes.json();
        if (!uploadJson.success || !uploadJson.data?.url) {
          throw new Error(uploadJson.error || 'Upload failed');
        }

        const uploadedUrl = uploadJson.data.url;
        const mediaType = uploadJson.data.type || attachmentToSend.type;

        // 2. Send message with uploaded media URL
        await sendMessage(
          activeConversation.id,
          textToSend || attachmentToSend.name,
          mediaType,
          uploadedUrl
        );
      } else {
        await sendMessage(activeConversation.id, textToSend, 'text');
      }
    } catch (err: any) {
      console.error('Lỗi khi gửi tin nhắn hoặc tải tệp:', err);
      // Restore pending attachment if upload failed
      if (attachmentToSend) {
        setPendingAttachment(attachmentToSend);
      }
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  // Poll Handling
  const handleOpenPollModal = () => {
    setPollQuestion('');
    setPollOptions(['', '']);
    setAllowMultiChoices(false);
    setIsAnonymous(false);
    setPollError('');
    setIsPollModalOpen(true);
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemovePollOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  const handlePollOptionChange = (idx: number, val: string) => {
    const updated = [...pollOptions];
    updated[idx] = val;
    setPollOptions(updated);
  };

  const handleCreatePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim()) {
      setPollError('Vui lòng nhập câu hỏi bình chọn');
      return;
    }

    const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      setPollError('Vui lòng nhập ít nhất 2 phương án bình chọn');
      return;
    }

    setIsCreatingPoll(true);
    setPollError('');
    try {
      const success = await createPoll(
        activeConversation.id,
        pollQuestion.trim(),
        validOptions,
        allowMultiChoices,
        isAnonymous
      );
      if (success) {
        setIsPollModalOpen(false);
      } else {
        setPollError('Không thể tạo bình chọn, vui lòng thử lại.');
      }
    } catch (err: any) {
      setPollError(err.message || 'Lỗi khi tạo bình chọn');
    } finally {
      setIsCreatingPoll(false);
    }
  };

  const isGroupChat = Boolean(activeContact.isGroup || activeContact.name.startsWith('[Nhóm]'));

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col h-full bg-[#f0f4f9] dark:bg-[#0f172a] relative overflow-hidden select-none"
    >
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleImageFileChange}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt,.csv"
        className="hidden"
        onChange={handleDocFileChange}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-xs border-2 border-dashed border-blue-500 z-50 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl flex flex-col items-center gap-3">
            <UploadCloud className="w-12 h-12 text-blue-600 animate-bounce" />
            <p className="font-bold text-sm text-slate-800 dark:text-slate-100">
              Thả ảnh hoặc tệp vào đây để gửi
            </p>
            <span className="text-xs text-slate-400">Hỗ trợ nén ảnh tự động trước khi tải lên</span>
          </div>
        </div>
      )}

      {/* 1. Header Workspace - Solid Blue Bar */}
      <header className="px-5 py-3.5 bg-blue-600 dark:bg-blue-600 text-white flex items-center justify-between shadow-xs z-10">
        {/* Contact / Group Info */}
        <div
          onClick={toggleCustomerInfo}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
          title="Xem thông tin chi tiết"
        >
          <div className="relative">
            <img
              src={activeContact.avatarUrl}
              alt={activeContact.name}
              className="w-8 h-8 rounded-full border border-white/40 bg-white object-cover shadow-xs"
            />
            {isGroupChat && (
              <span className="absolute -bottom-1 -right-1 bg-blue-800 text-white p-0.5 rounded-full border border-white">
                <Users className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-white tracking-normal leading-tight truncate max-w-xs">
                {activeContact.name}
              </h2>
              {isGroupChat && (
                <span className="bg-white/20 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                  Nhóm Zalo
                </span>
              )}
            </div>
            <span className="text-[10px] text-white/75 leading-none block mt-0.5">
              {isGroupChat ? 'Cuộc trò chuyện nhóm' : 'Khách hàng cá nhân'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
        {/* Centered Conversation Start Summary */}
        <div className="flex flex-col items-center justify-center my-4">
          <img
            src={activeContact.avatarUrl}
            alt={activeContact.name}
            className="w-11 h-11 rounded-full border border-slate-200/80 shadow-xs mb-2 bg-white object-cover"
          />
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {isGroupChat ? 'Nhóm Zalo' : 'Hội thoại với'} {activeContact.name} • {formatTimeOnly(activeConversation.createdAt || new Date().toISOString())}
          </span>
        </div>

        {activeMessages.length === 0 && !activeConversation.isTyping ? (
          <div className="py-8 flex items-center justify-center text-slate-400 text-xs">
            Bắt đầu cuộc hội thoại bằng cách gửi tin nhắn đầu tiên.
          </div>
        ) : (
          <>
            {activeMessages.map((m) => {
              const senderAgent = m.senderUserId ? users.find((u) => u.id === m.senderUserId) : undefined;
              return (
                <MessageBubble
                  key={m.id}
                  message={m}
                  contact={activeContact}
                  agent={senderAgent}
                />
              );
            })}

            {/* Typing Indicator */}
            {activeConversation.isTyping && (
              <div className="flex items-center gap-2 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <img
                  src={activeContact.avatarUrl}
                  alt={activeContact.name}
                  className="w-7 h-7 rounded-full border border-border bg-white shadow-xs shrink-0 object-cover"
                />
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-2xl rounded-bl-xs flex items-center gap-2 shadow-xs">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {activeContact.name} đang soạn tin
                  </span>
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

      {/* 3. Chat Input Container */}
      <footer className="p-4 pt-1 bg-[#f0f4f9] dark:bg-[#0f172a]">
        {/* Attachment Preview Box */}
        {pendingAttachment && (
          <div className="mb-2 p-2 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-between border border-slate-200 dark:border-slate-700 max-w-sm shadow-xs animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-2.5 truncate">
              {pendingAttachment.previewUrl ? (
                <img
                  src={pendingAttachment.previewUrl}
                  alt="Xem trước ảnh"
                  className="w-10 h-10 object-cover rounded-xl border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div className="truncate">
                <p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-100">
                  {pendingAttachment.name}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="uppercase font-bold text-blue-600 dark:text-blue-400">
                    {pendingAttachment.type}
                  </span>
                  <span>•</span>
                  <span>{pendingAttachment.sizeFormatted}</span>
                  {pendingAttachment.type === 'image' && (
                    <span className="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 px-1 py-0.2 rounded text-[9px] font-semibold">
                      Đã nén
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={removeAttachment}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Gỡ đính kèm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Bar & Actions */}
        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* Quick Action Buttons Group */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Image Picker Button */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
              title="Gửi ảnh (Tự động nén tối ưu)"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Document/File Picker Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
              title="Gửi tài liệu / tệp tin"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Poll Creation Button (Special for Group Chats) */}
            <button
              type="button"
              onClick={handleOpenPollModal}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isGroupChat
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100'
                  : 'hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600'
              }`}
              title="Tạo bình chọn nhóm Zalo"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
          </div>

          {/* Main Clean Floating Input Pill */}
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-full shadow-xs border border-slate-200/80 dark:border-slate-700/80 px-4 py-1.5 flex items-center gap-2 transition-all focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={isSending || isUploading}
              placeholder={
                isGroupChat
                  ? 'Nhắn tin vào nhóm Zalo (hoặc dán ảnh Ctrl+V)...'
                  : 'Nhập tin nhắn để trả lời khách hàng (Ctrl+V để dán ảnh)...'
              }
              className="flex-1 bg-transparent text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none py-1 disabled:opacity-60"
            />
          </div>

          {/* Standalone Circular Send Button */}
          <button
            type="submit"
            disabled={(!inputVal.trim() && !pendingAttachment) || isSending || isUploading}
            className="w-10 h-10 rounded-full bg-blue-600 text-white shadow-xs flex items-center justify-center hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-blue-600"
            aria-label="Gửi tin nhắn"
          >
            {isUploading || isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 ml-0.5" />
            )}
          </button>
        </form>
      </footer>

      {/* 4. MODAL TẠO BÌNH CHỌN (POLL MODAL) */}
      {isPollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                <BarChart3 className="w-5 h-5" />
                <span>Tạo bình chọn nhóm Zalo</span>
              </div>
              <button
                onClick={() => setIsPollModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreatePollSubmit} className="p-5 space-y-4">
              {pollError && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-600 text-xs">
                  {pollError}
                </div>
              )}

              {/* Question */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Câu hỏi bình chọn <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Ví dụ: Mọi người chốt lịch họp tuần này vào thứ mấy?"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  autoFocus
                />
              </div>

              {/* Options List */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Các phương án lựa chọn <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs font-bold text-slate-400">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                        placeholder={`Phương án ${idx + 1}`}
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePollOption(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Xóa phương án này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {pollOptions.length < 10 && (
                  <button
                    type="button"
                    onClick={handleAddPollOption}
                    className="mt-2.5 flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm phương án</span>
                  </button>
                )}
              </div>

              {/* Poll Settings Checkboxes */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={allowMultiChoices}
                    onChange={(e) => setAllowMultiChoices(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span>Cho phép chọn nhiều phương án</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span>Bình chọn ẩn danh (Không hiển thị người đã vote)</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPollModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreatingPoll}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCreatingPoll ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <span>Tạo bình chọn</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
