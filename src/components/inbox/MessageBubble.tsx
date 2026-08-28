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
    <div className={`flex gap-3 my-4 ${isAgent ? 'justify-end' : 'justify-start'}`}>
      {/* Customer Avatar on Left */}
      {!isAgent && (
        <img
          src={contact.avatarUrl}
          alt={contact.name}
          className="w-8 h-8 rounded-full border border-border shrink-0 self-end shadow-sm"
        />
      )}

      {/* Bubble Container */}
      <div className="max-w-[70%] flex flex-col">
        {/* Agent Sender Name */}
        {isAgent && agent && (
          <span className="text-[10px] text-muted-foreground mb-1 mr-1 text-right">
            Gửi bởi: <strong className="font-semibold text-foreground">{agent.name}</strong>
          </span>
        )}

        {/* Message Core Content Box */}
        <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
          isAgent
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted dark:bg-neutral-800 text-foreground rounded-bl-none border border-border/50'
        }`}>
          {/* 1. IMAGE TYPE */}
          {message.messageType === 'image' && message.mediaUrl && (
            <div className="space-y-1.5">
              <img
                src={message.mediaUrl}
                alt="Hình ảnh đính kèm"
                className="rounded-lg max-w-full max-h-60 object-cover shadow-sm hover:scale-[1.01] transition-transform cursor-pointer"
              />
              {message.content && <p>{message.content}</p>}
            </div>
          )}

          {/* 2. FILE TYPE */}
          {message.messageType === 'file' && message.mediaUrl && (
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                isAgent ? 'bg-white/20' : 'bg-primary/10 text-primary'
              }`}>
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs truncate">Tài liệu đính kèm.pdf</p>
                <span className={`text-[10px] ${
                  isAgent ? 'text-primary-foreground/75' : 'text-muted-foreground'
                }`}>
                  1.2 MB
                </span>
              </div>
              <a
                href={message.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-1.5 rounded-md hover:bg-black/10 transition-colors ${
                  isAgent ? 'text-primary-foreground' : 'text-foreground'
                }`}
                title="Tải xuống"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* 3. STANDARD TEXT */}
          {message.messageType === 'text' && (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}

          {/* Timestamp details */}
          <div className={`text-[9px] mt-1 text-right leading-none ${
            isAgent ? 'text-primary-foreground/70' : 'text-muted-foreground'
          }`}>
            {formatTimeOnly(message.createdAt)}
          </div>
        </div>
      </div>

      {/* Agent Avatar on Right */}
      {isAgent && (
        <img
          src={agent?.avatarUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=agent'}
          alt={agent?.name || 'Agent'}
          className="w-8 h-8 rounded-full border border-border shrink-0 self-end bg-white shadow-sm"
        />
      )}
    </div>
  );
}
