'use client';

import React from 'react';
import { Message } from '../../types/message';
import { Contact } from '../../types/contact';
import { User } from '../../types/user';
import { FileText, Download, BarChart3, CheckCircle2, Circle } from 'lucide-react';
import { formatTimeOnly } from '../../lib/utils';
import { useChatStore } from '../../store/useChatStore';

interface MessageBubbleProps {
  message: Message;
  contact: Contact;
  agent?: User;
}

export default function MessageBubble({ message, contact, agent }: MessageBubbleProps) {
  const { currentUser, votePoll } = useChatStore();
  const isAgent = message.senderType === 'agent';
  const isSystem = message.senderType === 'system';
  const isPoll = message.messageType === 'poll' || Boolean(message.payload?.poll);
  const poll = message.payload?.poll;

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-muted text-muted-foreground text-[10px] font-medium px-2.5 py-1 rounded-full uppercase tracking-wider">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 my-1.5 ${isAgent ? 'justify-end' : 'justify-start items-end'}`}>
      {/* Customer Avatar on Left (Bottom-aligned with bubble) */}
      {!isAgent && (
        <img
          src={contact.avatarUrl}
          alt={contact.name}
          className="w-7 h-7 rounded-full border border-slate-200/80 shrink-0 self-end shadow-2xs bg-white mb-0.5 object-cover"
        />
      )}

      {/* Bubble Container */}
      <div className={`max-w-[75%] sm:max-w-[70%] w-fit flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
        {/* Agent Sender Name */}
        {isAgent && agent && (
          <span className="text-[10px] text-slate-400 mb-0.5 mr-1 text-right font-medium">
            {agent.name}
          </span>
        )}

        {/* Group Member Sender Name */}
        {!isAgent && (message.senderName || contact.isGroup) && (
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mb-0.5 ml-1 flex items-center gap-1">
            {message.senderName || contact.name}
          </span>
        )}

        {/* Message Core Content Box */}
        <div className={`w-fit max-w-full transition-all ${
          isPoll
            ? 'p-0 bg-transparent shadow-none border-none'
            : message.mediaUrl && !(message.content && message.content !== '[Hình ảnh]' && message.content !== '[Tập tin/Hình ảnh]' && message.content !== '[Hình Ảnh/Tập tin]' && message.content !== '[Hình ảnh/GIF]')
              ? 'p-0 bg-transparent shadow-none border-none'
              : isAgent
                ? 'px-3.5 py-2 rounded-[18px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-700/80'
                : 'px-3.5 py-2 rounded-[18px] bg-[#1a73e8] text-white shadow-xs'
        }`}>
          {/* A. POLL / BÌNH CHỌN TYPE */}
          {isPoll && poll && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm w-full min-w-[280px] sm:min-w-[320px] max-w-[380px] text-slate-900 dark:text-slate-100">
              {/* Poll Header */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wide">
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span>Bình chọn Zalo</span>
                </div>
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/40">
                  {poll.status === 'closed' ? 'Đã đóng' : 'Đang mở'}
                </span>
              </div>

              {/* Poll Question */}
              <h4 className="font-semibold text-sm mt-2.5 text-slate-900 dark:text-white leading-snug">
                {poll.question}
              </h4>

              {/* Poll Meta */}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 mb-3">
                {poll.totalVotes || 0} lượt bình chọn • {poll.allowMultiChoices ? 'Chọn nhiều' : 'Chọn 1 phương án'}
              </p>

              {/* Options List */}
              <div className="space-y-2">
                {poll.options?.map((opt: any) => {
                  const total = poll.totalVotes || 0;
                  const pct = total > 0 ? Math.round(((opt.votes || 0) / total) * 100) : 0;
                  const hasVoted = Array.isArray(opt.voters) && opt.voters.includes(String(currentUser.id));

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => votePoll(message.conversationId, message.id, opt.id)}
                      className={`w-full relative overflow-hidden text-left rounded-xl border transition-all cursor-pointer group ${
                        hasVoted
                          ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {/* Animated Progress Bar Fill */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ease-out ${
                          hasVoted
                            ? 'bg-blue-500/15 dark:bg-blue-500/25'
                            : 'bg-slate-200/60 dark:bg-slate-700/50'
                        }`}
                        style={{ width: `${pct}%` }}
                      />

                      {/* Content Overlay */}
                      <div className="relative z-10 px-3 py-2 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {hasVoted ? (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0" />
                          )}
                          <span className={`font-medium truncate ${
                            hasVoted ? 'text-blue-700 dark:text-blue-300 font-semibold' : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {opt.content}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                          {opt.votes || 0} ({pct}%)
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer hint */}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-right mt-3">
                Nhấp vào phương án để bình chọn
              </p>
            </div>
          )}

          {/* 1. MP4 / VIDEO / ANIMATED GIF TYPE */}
          {!isPoll && message.mediaUrl && (message.mediaUrl.endsWith('.mp4') || message.mediaUrl.endsWith('.webm') || message.messageType === 'video') && (
            <div className="space-y-1">
              <video
                src={message.mediaUrl}
                autoPlay
                loop
                muted
                playsInline
                controls
                className="rounded-2xl max-w-full max-h-64 object-contain bg-black/10 shadow-xs"
              />
              {message.content && message.content !== '[Hình ảnh]' && message.content !== '[Tập tin/Hình ảnh]' && message.content !== '[Hình Ảnh/Tập tin]' && message.content !== '[Hình ảnh/GIF]' && (
                <p className="whitespace-pre-wrap text-[13px] px-1 py-0.5">{message.content}</p>
              )}
            </div>
          )}

          {/* 2. STATIC IMAGE / STICKER TYPE */}
          {!isPoll && message.mediaUrl && !(message.mediaUrl.endsWith('.mp4') || message.mediaUrl.endsWith('.webm') || message.messageType === 'video' || message.mediaUrl.endsWith('.ogg') || message.mediaUrl.endsWith('.mp3') || message.messageType === 'file') && (
            <div className="space-y-1">
              <img
                src={message.mediaUrl}
                alt="Hình ảnh đính kèm"
                className="rounded-2xl max-w-full max-h-64 object-contain bg-transparent shadow-xs hover:scale-[1.01] transition-transform cursor-pointer"
              />
              {message.content && message.content !== '[Hình ảnh]' && message.content !== '[Tập tin/Hình ảnh]' && message.content !== '[Hình Ảnh/Tập tin]' && (
                <p className="whitespace-pre-wrap text-[13px] px-1 py-0.5">{message.content}</p>
              )}
            </div>
          )}

          {/* 3. AUDIO / VOICE TYPE */}
          {!isPoll && message.mediaUrl && (message.mediaUrl.endsWith('.ogg') || message.mediaUrl.endsWith('.mp3') || message.messageType === 'audio') && (
            <div className="space-y-1 py-0.5">
              <audio src={message.mediaUrl} controls className="w-full h-8" />
              {message.content && <p className="whitespace-pre-wrap text-[13px] px-1">{message.content}</p>}
            </div>
          )}

          {/* 4. FILE / DOCUMENT TYPE */}
          {!isPoll && message.mediaUrl && (message.messageType === 'file' || message.mediaUrl.endsWith('.pdf') || message.mediaUrl.endsWith('.docx') || message.mediaUrl.endsWith('.zip') || message.mediaUrl.endsWith('.bin') || message.mediaUrl.endsWith('.xlsx')) && (
            <div className="flex items-center gap-2.5 py-0.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isAgent ? 'bg-slate-100 dark:bg-slate-700 text-[#1a73e8]' : 'bg-white/20 text-white'
              }`}>
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs truncate">{message.content && message.content !== '[Tài liệu]' && message.content !== '[Hình ảnh/Tập tin]' ? message.content : 'Tài liệu đính kèm'}</p>
              </div>
              <a
                href={message.mediaUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className={`p-1 rounded-md hover:bg-black/10 transition-colors shrink-0 ${
                  isAgent ? 'text-slate-600 dark:text-slate-300' : 'text-white'
                }`}
                title="Tải xuống tập tin"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* 5. STANDARD TEXT */}
          {!isPoll && (!message.mediaUrl || message.messageType === 'text') && message.content && (
            <p className="whitespace-pre-wrap text-[13px] font-normal tracking-normal leading-relaxed">{message.content}</p>
          )}
        </div>

        {/* Timestamp subtle note underneath */}
        <span className={`text-[10px] mt-0.5 px-1 leading-none text-slate-400 dark:text-slate-500`}>
          {formatTimeOnly(message.createdAt)}
        </span>
      </div>
    </div>
  );
}
