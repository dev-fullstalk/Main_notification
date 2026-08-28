'use client';

import React from 'react';
import Column1Channels from '../../components/inbox/Column1Channels';
import Column2ConvList from '../../components/inbox/Column2ConvList';
import Column3ChatArea from '../../components/inbox/Column3ChatArea';
import CustomerInfoPanel from '../../components/inbox/CustomerInfoPanel';
import { useChatStore } from '../../store/useChatStore';

export default function InboxPage() {
  const { activeConversationId, conversations, contacts } = useChatStore();

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
