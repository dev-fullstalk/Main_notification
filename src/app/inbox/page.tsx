'use client';

import React, { useEffect } from 'react';
import Column1Channels from '../../components/inbox/Column1Channels';
import Column2ConvList from '../../components/inbox/Column2ConvList';
import Column3ChatArea from '../../components/inbox/Column3ChatArea';
import CustomerInfoPanel from '../../components/inbox/CustomerInfoPanel';
import { useChatStore } from '../../store/useChatStore';

export default function InboxPage() {
  const { 
    activeConversationId, 
    conversations, 
    contacts,
    fetchChannels,
    fetchConversations,
    fetchMessages,
    activeChannelId,
    handleRealtimeMessage,
    handleRealtimeConversation
  } = useChatStore();


  // Initial data loading from database on mount
  useEffect(() => {
    fetchChannels();
    fetchConversations(activeChannelId);
  }, []);

  // Server-Sent Events (SSE) Real-time Stream: 1 kết nối duy nhất, 0% CPU lãng phí
  useEffect(() => {
    console.log('[Real-time Push] Establishing EventSource connection to /api/events...');
    const eventSource = new EventSource('/api/events');

    eventSource.onopen = () => {
      console.log('[Real-time Push] Connected to real-time event stream.');
    };

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.event === 'new_message') {
          handleRealtimeMessage(payload.data);
        } else if (payload.event === 'conversation_updated') {
          handleRealtimeConversation(payload.data);
        }
      } catch (err) {
        console.warn('Error parsing incoming SSE event:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('[Real-time Push] Connection interrupted, EventSource will auto-reconnect...', err);
    };

    // Khi người dùng chuyển tab quay lại (focus), nhẹ nhàng đồng bộ lại 1 lần phòng trường hợp mất mạng lâu
    const onWindowFocus = () => {
      fetchConversations(activeChannelId);
      if (activeConversationId) {
        fetchMessages(activeConversationId);
      }
    };
    window.addEventListener('focus', onWindowFocus);

    return () => {
      window.removeEventListener('focus', onWindowFocus);
      eventSource.close();
      console.log('[Real-time Push] Closed EventSource connection.');
    };
  }, [activeChannelId, activeConversationId, handleRealtimeMessage, handleRealtimeConversation]);


  // Find active conversation and contact profiles
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const activeContact = activeConversation ? contacts.find(ct => ct.id === activeConversation.contactId) : null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* CỘT 1: Main Sidebar Channels */}
      <Column1Channels />

      {/* CỘT 2: Conversations List Bubble queue */}
      <Column2ConvList />

      {/* CỘT 3 + DETAILS: Chat main workspace */}
      <div className="flex-1 flex h-full min-w-0">
        <Column3ChatArea />
        
        {/* Customer details right-hand side panel */}
        {activeConversation && activeContact && (
          <CustomerInfoPanel
            contact={activeContact}
            conversation={activeConversation}
          />
        )}
      </div>
    </div>
  );
}
