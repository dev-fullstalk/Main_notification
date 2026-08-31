'use client';

import React from 'react';
import { Message } from '../../types/message';
import { Contact } from '../../types/contact';
import { User } from '../../types/user';
import { FileText, Download } from 'lucide-react';
import { formatTimeOnly } from '../../lib/utils';

interface MessageBubbleProps {
  message: Message;
  contact: Contact;
  agent?: User;
}

export default function MessageBubble({ message, contact, agent }: MessageBubbleProps) {
  const isAgent = message.senderType === 'agent';
  const isSystem = message.senderType === 'system';

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
      <div className={`max-w-[70%] w-fit flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
        {/* Agent Sender Name */}
        {isAgent && agent && (
          <span className="text-[10px] text-slate-400 mb-0.5 mr-1 text-right font-medium">
            {agent.name}
          </span>
        )}

        {/* Message Core Content Box */}
        <div className={`w-fit max-w-full transition-all ${
          message.mediaUrl && !(message.content && message.content !== '[Hình ảnh]' && message.content !== '[Tập tin/Hình ảnh]' && message.content !== '[Hình Ảnh/Tập tin]' && message.content !== '[Hình ảnh/GIF]')
            ? 'p-0 bg-transparent shadow-none border-none'
            : isAgent
              ? 'px-3.5 py-2 rounded-[18px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-700/80'
              : 'px-3.5 py-2 rounded-[18px] bg-[#1a73e8] text-white shadow-xs'
        }`}>
          {/* 1. MP4 / VIDEO / ANIMATED GIF TYPE */}
          {message.mediaUrl && (message.mediaUrl.endsWith('.mp4') || message.mediaUrl.endsWith('.webm') || message.messageType === 'video') && (
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
          {message.mediaUrl && !(message.mediaUrl.endsWith('.mp4') || message.mediaUrl.endsWith('.webm') || message.messageType === 'video' || message.mediaUrl.endsWith('.ogg') || message.mediaUrl.endsWith('.mp3') || message.messageType === 'file') && (
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
          {message.mediaUrl && (message.mediaUrl.endsWith('.ogg') || message.mediaUrl.endsWith('.mp3') || message.messageType === 'audio') && (
            <div className="space-y-1 py-0.5">
              <audio src={message.mediaUrl} controls className="w-full h-8" />
              {message.content && <p className="whitespace-pre-wrap text-[13px] px-1">{message.content}</p>}
            </div>
          )}

          {/* 4. FILE / DOCUMENT TYPE */}
          {message.mediaUrl && (message.messageType === 'file' || message.mediaUrl.endsWith('.pdf') || message.mediaUrl.endsWith('.docx') || message.mediaUrl.endsWith('.zip') || message.mediaUrl.endsWith('.bin') || message.mediaUrl.endsWith('.xlsx')) && (
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
          {(!message.mediaUrl || message.messageType === 'text') && message.content && (
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
