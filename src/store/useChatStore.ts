import { create } from 'zustand';
import { User } from '../types/user';
import { Channel } from '../types/channel';
import { Contact } from '../types/contact';
import { Conversation } from '../types/conversation';
import { Message } from '../types/message';

import { mockUsers, currentUser } from '../mocks/users.mock';
import { mockDashboardStats, mockMessages } from '../mocks/messages.mock';
import { mockChannels } from '../mocks/channels.mock';
import { mockContacts } from '../mocks/contacts.mock';
import { mockConversations } from '../mocks/conversations.mock';

const clientTypingTimers: Record<string, NodeJS.Timeout> = {};

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
  isSidebarOpen: boolean;
  isCustomerInfoOpen: boolean;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleCustomerInfo: () => void;
  setCustomerInfoOpen: (open: boolean) => void;
  setActiveChannelId: (id: string | null) => Promise<void>;
  setActiveConversationId: (id: string | null) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: 'all' | 'unread' | 'active' | 'resolved') => void;
  sendMessage: (conversationId: string, text: string, type?: 'text' | 'image' | 'file', mediaUrl?: string) => Promise<void>;
  assignAgent: (conversationId: string, agentId: string | null) => void;
  changeConversationStatus: (conversationId: string, status: 'open' | 'pending' | 'resolved' | 'closed') => void;
  connectNewChannel: (platform: 'facebook' | 'zalo' | 'telegram' | 'whatsapp', name: string, pageId: string) => void;
  disconnectChannel: (channelId: string) => Promise<void>;
  renameChannel: (channelId: string, newName: string) => Promise<void>;

  // Real Database integration actions
  fetchChannels: () => Promise<void>;
  fetchConversations: (channelId: string | null) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;

  // Poll actions
  createPoll: (conversationId: string, question: string, options: string[], allowMultiChoices?: boolean, isAnonymous?: boolean) => Promise<boolean>;
  votePoll: (conversationId: string, messageId: string, optionId: number) => Promise<void>;

  // Real-time Push (SSE) handlers
  handleRealtimeMessage: (data: any) => void;
  handleRealtimeConversation: (data: any) => void;
}


export const useChatStore = create<ChatState>((set, get) => ({
  currentUser,
  users: mockUsers,
  channels: mockChannels,
  contacts: mockContacts,
  conversations: mockConversations,
  messages: mockMessages,
  activeChannelId: null,
  activeConversationId: null,
  searchQuery: '',
  statusFilter: 'all',
  dashboardStats: mockDashboardStats,
  isSidebarOpen: true,
  isCustomerInfoOpen: false,

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ isSidebarOpen: open }),
  toggleCustomerInfo: () => set((state) => ({ isCustomerInfoOpen: !state.isCustomerInfoOpen })),
  setCustomerInfoOpen: (open: boolean) => set({ isCustomerInfoOpen: open }),

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
            c.platform === 'facebook' ? 'facebook-new' : c.platform === 'telegram' ? 'telegram-app' : c.platform === 'whatsapp' ? 'whatsapp--v1' : c.platform
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
      const isPlatformFilter = channelId && channelId.startsWith('platform:');
      const url = channelId && channelId !== 'all' && !isPlatformFilter
        ? `/api/channels/${channelId}/conversations` 
        : `/api/channels/all/conversations`;

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
            unreadCount: c.unread_count || 0,
            isTyping: Boolean(c.is_typing)
          });

          const isGroup = Boolean(c.contact_metadata?.is_group || c.metadata?.is_group || (c.contact_name && c.contact_name.startsWith('[Nhóm]')));
          if (!contacts.some(ct => ct.id === String(c.contact_id))) {
            contacts.push({
              id: String(c.contact_id),
              channelId: String(c.channel_id),
              externalUserId: c.contact_external_user_id || '',
              name: c.contact_name || 'Khách hàng',
              avatarUrl: c.contact_avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.contact_name || 'Customer'}`,
              phone: c.contact_phone || undefined,
              email: c.contact_email || undefined,
              isGroup,
              metadata: c.contact_metadata || {}
            });
          }
        });

        set({ conversations, contacts });
        if (conversations.length === 0) {
          set({ activeConversationId: null, messages: [] });
        } else if (!get().activeConversationId) {
          const firstConv = conversations[0];
          set({ activeConversationId: firstConv.id });
          get().fetchMessages(firstConv.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversations from DB API:', err);
    }
  },

  fetchMessages: async (conversationId) => {
    if (!conversationId) {
      set({ messages: [] });
      return;
    }
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const mappedMessages: Message[] = json.data.map((m: any) => ({
          id: String(m.id),
          conversationId: String(m.conversation_id),
          senderType: m.sender_type || (m.id__messages_sender_types === 1 ? 'customer' : 'agent'),
          senderUserId: m.sender_user_id ? String(m.sender_user_id) : undefined,
          senderName: m.payload?.sender_name || (m.sender_type === 'agent' ? m.agent_name : undefined),
          messageType: m.payload?.poll ? 'poll' : (m.message_type || 'text'),
          content: m.content || '',
          mediaUrl: m.media_url || undefined,
          payload: m.payload || undefined,
          status: m.status || 'sent',
          createdAt: m.created_at,
        }));
        set({ messages: mappedMessages });
      } else {
        set({ messages: [] });
      }
    } catch (err) {
      console.error(`Failed to fetch messages for conversation ${conversationId}:`, err);
      set({ messages: [] });
    }
  },

  setActiveChannelId: async (id) => {
    set({ activeChannelId: id });
    await get().fetchConversations(id);
    
    // Automatically select the first conversation matching the new channel or platform filter
    const state = get();
    let matching = state.conversations;
    if (id) {
      if (id.startsWith('platform:')) {
        const targetPlatform = id.replace('platform:', '');
        matching = state.conversations.filter(c => {
          const chan = state.channels.find(ch => ch.id === c.channelId);
          return chan && chan.platform === targetPlatform;
        });
      } else {
        matching = state.conversations.filter(c => c.channelId === id);
      }
    }

    if (matching.length > 0) {
      const firstConvId = matching[0].id;
      set({ activeConversationId: firstConvId });
      
      // Clear unread in state & DB
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === firstConvId ? { ...c, unreadCount: 0 } : c
        )
      }));
      fetch(`/api/conversations/${firstConvId}/read`, { method: 'POST' }).catch(() => {});

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
    
    // Clear unread count for this conversation in state & DB
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, unreadCount: 0 } : c
      )
    }));
    fetch(`/api/conversations/${id}/read`, { method: 'POST' }).catch(() => {});

    await get().fetchMessages(id);
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setStatusFilter: (filter) => set({ statusFilter: filter }),

  sendMessage: async (conversationId, text, type = 'text', mediaUrl) => {
    // Không gửi tin nhắn rỗng nếu không có đính kèm
    if (!text?.trim() && !mediaUrl) {
      return;
    }

    const newLocalMessage: Message = {
      id: `local-msg-${Date.now()}`,
      conversationId,
      senderType: 'agent',
      senderUserId: get().currentUser.id,
      messageType: type,
      content: text.trim(),
      mediaUrl,
      status: 'sent',
      createdAt: new Date().toISOString()
    };

    // Optimistically update UI
    set((state) => ({
      messages: [...state.messages, newLocalMessage],
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessagePreview: text, lastMessageAt: new Date().toISOString() }
          : c
      )
    }));

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
      console.warn('Sent message locally in demo/mock mode:', error);
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

  disconnectChannel: async (channelId) => {
    try {
      await fetch(`/api/channels/${channelId}/disconnect`, { method: 'POST' });
      await get().fetchChannels();
      await get().fetchConversations(get().activeChannelId);
    } catch (err) {
      console.warn('Disconnect API error, falling back locally:', err);
      set((state) => ({
        channels: state.channels.map((c) => 
          c.id === channelId ? { ...c, isActive: false } : c
        ),
      }));
    }
  },

  renameChannel: async (channelId, newName) => {
    try {
      await fetch(`/api/channels/${channelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      await get().fetchChannels();
    } catch (err) {
      console.warn('Rename channel API error:', err);
      set((state) => ({
        channels: state.channels.map((c) =>
          c.id === channelId ? { ...c, name: newName } : c
        ),
      }));
    }
  },

  handleRealtimeMessage: (msg: any) => {
    if (!msg || !msg.id) return;
    const conversationIdStr = String(msg.conversation_id);
    const activeConvId = get().activeConversationId;

    // 1. Cập nhật tin nhắn trong khung chat Cột 3 nếu thuộc cuộc trò chuyện đang mở
    if (activeConvId && conversationIdStr === activeConvId) {
      set((state) => {
        // Kiểm tra xem tin nhắn đã có chưa (tránh trùng lặp id)
        const exists = state.messages.some((m) => String(m.id) === String(msg.id));
        if (exists) {
          return {
            messages: state.messages.map((m) =>
              String(m.id) === String(msg.id)
                ? {
                    ...m,
                    status: msg.status || m.status,
                    content: msg.content || m.content,
                  }
                : m
            ),
          };
        }

        // Lọc bỏ tin nhắn tạm local-msg tương ứng nếu có
        const filtered = state.messages.filter((m) => {
          if (m.id.startsWith('local-msg-') && m.content === msg.content && m.senderType === msg.sender_type) {
            return false;
          }
          return true;
        });

        const newMsg: Message = {
          id: String(msg.id),
          conversationId: conversationIdStr,
          senderType: msg.sender_type || (msg.id__messages_sender_types === 1 ? 'customer' : 'agent'),
          senderUserId: msg.sender_user_id ? String(msg.sender_user_id) : undefined,
          messageType: msg.message_type || 'text',
          content: msg.content || '',
          mediaUrl: msg.media_url || undefined,
          status: msg.status || 'sent',
          createdAt: msg.created_at || new Date().toISOString(),
        };

        return { messages: [...filtered, newMsg] };
      });
    }

      // 2. Cập nhật preview tin nhắn cuối, thời gian và số tin chưa đọc ở Cột 2
    if (clientTypingTimers[conversationIdStr]) {
      clearTimeout(clientTypingTimers[conversationIdStr]);
      delete clientTypingTimers[conversationIdStr];
    }

    set((state) => {
      let found = false;
      const updated = state.conversations.map((c) => {
        if (c.id === conversationIdStr) {
          found = true;
          const isCurrentActive = activeConvId === conversationIdStr;
          return {
            ...c,
            lastMessagePreview: msg.content || (msg.media_url ? '[Tập tin đính kèm]' : c.lastMessagePreview),
            lastMessageAt: msg.created_at || new Date().toISOString(),
            unreadCount: isCurrentActive ? 0 : (msg.sender_type === 'customer' ? (c.unreadCount || 0) + 1 : c.unreadCount),
            isTyping: false,
          };
        }
        return c;
      });

      // Nếu cuộc hội thoại chưa từng xuất hiện (khách hàng mới toanh), fetch lại danh sách
      if (!found) {
        get().fetchConversations(get().activeChannelId);
        return {};
      }

      // Đưa hội thoại vừa có tin nhắn mới lên đầu danh sách
      updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      return { conversations: updated };
    });
  },

  handleRealtimeConversation: (data: any) => {
    if (!data || !data.id) return;
    const convIdStr = String(data.id);

    // Xử lý tự động hủy trạng thái gõ phím sau 6 giây
    if (data.is_typing) {
      if (clientTypingTimers[convIdStr]) {
        clearTimeout(clientTypingTimers[convIdStr]);
      }
      clientTypingTimers[convIdStr] = setTimeout(() => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === convIdStr ? { ...c, isTyping: false } : c
          ),
        }));
        delete clientTypingTimers[convIdStr];
      }, 6000);
    } else if (data.is_typing === false && clientTypingTimers[convIdStr]) {
      clearTimeout(clientTypingTimers[convIdStr]);
      delete clientTypingTimers[convIdStr];
    }

    set((state) => {
      let found = false;
      const updated = state.conversations.map((c) => {
        if (c.id === convIdStr) {
          found = true;
          return {
            ...c,
            lastMessagePreview: data.last_message_preview !== undefined ? data.last_message_preview : c.lastMessagePreview,
            lastMessageAt: data.last_message_at !== undefined ? data.last_message_at : c.lastMessageAt,
            unreadCount: data.unread_count !== undefined ? data.unread_count : c.unreadCount,
            isTyping: data.is_typing !== undefined ? Boolean(data.is_typing) : c.isTyping,
          };
        }
        return c;
      });

      if (!found) {
        get().fetchConversations(get().activeChannelId);
        return {};
      }

      updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      return { conversations: updated };
    });
  },

  createPoll: async (conversationId, question, options, allowMultiChoices = false, isAnonymous = false) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, options, allowMultiChoices, isAnonymous }),
      });
      const json = await res.json();
      if (json.success) {
        await get().fetchMessages(conversationId);
        await get().fetchConversations(get().activeChannelId);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to create poll:', e);
      return false;
    }
  },

  votePoll: async (conversationId, messageId, optionId) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/polls/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          optionId,
          userId: get().currentUser.id,
          userName: get().currentUser.name,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.poll) {
        // Optimistically update message in state
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === String(messageId)
              ? {
                  ...m,
                  payload: {
                    ...(m.payload || {}),
                    poll: json.data.poll,
                  },
                }
              : m
          ),
        }));
      }
    } catch (e) {
      console.error('Failed to vote poll:', e);
    }
  },
}));

