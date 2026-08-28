import { create } from 'zustand';
import { User } from '../types/user';
import { Channel } from '../types/channel';
import { Contact } from '../types/contact';
import { Conversation } from '../types/conversation';
import { Message } from '../types/message';

import { mockUsers, currentUser } from '../mocks/users.mock';
import { mockDashboardStats } from '../mocks/messages.mock';

interface ChatState {
  currentUser: User;
  users: User[];
  channels: Channel[];
  contacts: Contact[];
  conversations: Conversation[];
  messages: Message[];
  activeChannelId: string | null; // null represents "All Platforms"
  activeConversationId: string | null;
  searchQuery: string;
  statusFilter: 'all' | 'unread' | 'active' | 'resolved';
  dashboardStats: typeof mockDashboardStats;
  
  // Actions
  setActiveChannelId: (id: string | null) => Promise<void>;
  setActiveConversationId: (id: string | null) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: 'all' | 'unread' | 'active' | 'resolved') => void;
  sendMessage: (conversationId: string, text: string, type?: 'text' | 'image' | 'file', mediaUrl?: string) => Promise<void>;
  assignAgent: (conversationId: string, agentId: string | null) => void;
  changeConversationStatus: (conversationId: string, status: 'open' | 'pending' | 'resolved' | 'closed') => void;
  connectNewChannel: (platform: 'facebook' | 'zalo' | 'telegram' | 'tiktok', name: string, pageId: string) => void;
  disconnectChannel: (channelId: string) => void;

  // Real Database integration actions
  fetchChannels: () => Promise<void>;
  fetchConversations: (channelId: string | null) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentUser,
  users: mockUsers,
  channels: [],
  contacts: [],
  conversations: [],
  messages: [],
  activeChannelId: null,
  activeConversationId: null,
  searchQuery: '',
  statusFilter: 'all',
  dashboardStats: mockDashboardStats,

  fetchChannels: async () => {
    try {
      const res = await fetch('/api/channels');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const mappedChannels: Channel[] = json.data.map((c: any) => ({
          id: String(c.id),
          platform: c.platform,
          name: c.name,
          externalChannelId: c.external_channel_id,
          isActive: c.is_active,
          avatarUrl: c.avatar_url || `https://img.icons8.com/color/512/${
            c.platform === 'facebook' ? 'facebook-new' : c.platform === 'telegram' ? 'telegram-app' : c.platform
          }.png`,
        }));
        set({ channels: mappedChannels });
      }
    } catch (err) {
      console.error('Failed to fetch channels from DB API:', err);
    }
  },

  fetchConversations: async (channelId) => {
    try {
      const url = channelId && channelId !== 'all' 
        ? `/api/channels/${channelId}/conversations` 
        : `/api/channels/all/conversations`; // backend service handles fallback if not matching channelId

      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const conversations: Conversation[] = [];
        const contacts: Contact[] = [];
        
        json.data.forEach((c: any) => {
          conversations.push({
            id: String(c.id),
            channelId: String(c.channel_id),
            contactId: String(c.contact_id),
            assignedUserId: c.assigned_user_id ? String(c.assigned_user_id) : null,
            status: c.status || 'open',
            lastMessagePreview: c.last_message_preview || '',
            lastMessageAt: c.last_message_at,
            unreadCount: c.unread_count || 0
          });

          if (!contacts.some(ct => ct.id === String(c.contact_id))) {
            contacts.push({
              id: String(c.contact_id),
              channelId: String(c.channel_id),
              externalUserId: c.contact_external_user_id || '',
              name: c.contact_name || 'Khách hàng',
              avatarUrl: c.contact_avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.contact_name || 'Customer'}`,
              phone: c.contact_phone || undefined,
              email: c.contact_email || undefined
            });
          }
        });

        set({ conversations, contacts });
      }
    } catch (err) {
      console.error('Failed to fetch conversations from DB API:', err);
    }
  },

  fetchMessages: async (conversationId) => {
    if (!conversationId) return;
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const messages: Message[] = json.data.map((m: any) => ({
          id: String(m.id),
          conversationId: String(m.conversation_id),
          senderType: m.sender_type || (m.id__messages_sender_types === 1 ? 'customer' : 'agent'),
          senderUserId: m.sender_user_id ? String(m.sender_user_id) : undefined,
          messageType: m.message_type || 'text',
          content: m.content || '',
          mediaUrl: m.media_url || undefined,
          status: m.status || 'sent',
          createdAt: m.created_at
        }));
        set({ messages });
      }
    } catch (err) {
      console.error(`Failed to fetch messages for conversation ${conversationId}:`, err);
    }
  },

  setActiveChannelId: async (id) => {
    set({ activeChannelId: id });
    await get().fetchConversations(id);
    
    // Automatically select the first conversation matching the new channel filter
    const state = get();
    if (state.conversations.length > 0) {
      const firstConvId = state.conversations[0].id;
      set({ activeConversationId: firstConvId });
      await get().fetchMessages(firstConvId);
    } else {
      set({ activeConversationId: null, messages: [] });
    }
  },

  setActiveConversationId: async (id) => {
    set({ activeConversationId: id });
    if (!id) {
      set({ messages: [] });
      return;
    }
    
    await get().fetchMessages(id);
    
    // Clear unread count for this conversation when opened
    set((state) => {
      const updatedConversations = state.conversations.map((c) =>
        c.id === id ? { ...c, unreadCount: 0 } : c
      );
      return { conversations: updatedConversations };
    });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setStatusFilter: (filter) => set({ statusFilter: filter }),

  sendMessage: async (conversationId, text, type = 'text', mediaUrl) => {
    const typeMap = {
      text: 1,
      image: 2,
      video: 3,
      file: 4,
      audio: 5,
      sticker: 6
    };
    const id__messages_types = typeMap[type] || 1;

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          id__messages_types,
          media_url: mediaUrl,
          sender_user_id: get().currentUser.id
        })
      });
      const result = await response.json();
      if (result.success) {
        // Refresh messages and conversations from the database to reflect the update
        await get().fetchMessages(conversationId);
        await get().fetchConversations(get().activeChannelId);
      }
    } catch (error) {
      console.error('Failed to send message via API:', error);
    }
  },

  assignAgent: (conversationId, agentId) => {
    set((state) => {
      const updatedConversations = state.conversations.map((c) => {
        if (c.id === conversationId) {
          return { ...c, assignedUserId: agentId };
        }
        return c;
      });

      return { 
        conversations: updatedConversations
      };
    });
  },

  changeConversationStatus: (conversationId, status) => {
    set((state) => {
      const updatedConversations = state.conversations.map((c) => {
        if (c.id === conversationId) {
          return { ...c, status };
        }
        return c;
      });

      return {
        conversations: updatedConversations
      };
    });
  },

  connectNewChannel: (platform, name, pageId) => {
    const newId = `channel-${Date.now()}`;
    const newChannel: Channel = {
      id: newId,
      platform,
      name,
      externalChannelId: pageId,
      isActive: true,
      avatarUrl: `https://img.icons8.com/color/512/${
        platform === 'facebook' ? 'facebook-new' : platform === 'telegram' ? 'telegram-app' : platform
      }.png`,
    };

    set((state) => ({
      channels: [...state.channels, newChannel],
    }));
  },

  disconnectChannel: (channelId) => {
    set((state) => ({
      channels: state.channels.map((c) => 
        c.id === channelId ? { ...c, isActive: false } : c
      ),
    }));
  },
}));
