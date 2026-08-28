import { create } from 'zustand';
import { User } from '../types/user';
import { Channel } from '../types/channel';
import { Contact } from '../types/contact';
import { Conversation } from '../types/conversation';
import { Message } from '../types/message';

import { mockUsers, currentUser } from '../mocks/users.mock';
import { mockChannels } from '../mocks/channels.mock';
import { mockContacts } from '../mocks/contacts.mock';
import { mockConversations } from '../mocks/conversations.mock';
import { mockMessages, mockDashboardStats } from '../mocks/messages.mock';

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
  setActiveChannelId: (id: string | null) => void;
  setActiveConversationId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: 'all' | 'unread' | 'active' | 'resolved') => void;
  sendMessage: (conversationId: string, text: string, type?: 'text' | 'image' | 'file', mediaUrl?: string) => void;
  assignAgent: (conversationId: string, agentId: string | null) => void;
  changeConversationStatus: (conversationId: string, status: 'open' | 'pending' | 'resolved' | 'closed') => void;
  connectNewChannel: (platform: 'facebook' | 'zalo' | 'telegram' | 'tiktok', name: string, pageId: string) => void;
  disconnectChannel: (channelId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentUser,
  users: mockUsers,
  channels: mockChannels,
  contacts: mockContacts,
  conversations: mockConversations,
  messages: mockMessages,
  activeChannelId: null,
  activeConversationId: '201', // Default active conversation
  searchQuery: '',
  statusFilter: 'all',
  dashboardStats: mockDashboardStats,

  setActiveChannelId: (id) => {
    set({ activeChannelId: id });
    
    // Automatically select the first conversation matching the new channel filter
    const state = get();
    const filteredConv = state.conversations.filter(c => {
      if (id && c.channelId !== id) return false;
      return true;
    });
    
    if (filteredConv.length > 0) {
      set({ activeConversationId: filteredConv[0].id });
      // Mark as read
      get().setActiveConversationId(filteredConv[0].id);
    } else {
      set({ activeConversationId: null });
    }
  },

  setActiveConversationId: (id) => {
    set({ activeConversationId: id });
    
    if (!id) return;
    
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

  sendMessage: (conversationId, text, type = 'text', mediaUrl) => {
    const messageId = `m-sent-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    const newMsg: Message = {
      id: messageId,
      conversationId,
      senderType: 'agent',
      senderUserId: get().currentUser.id,
      messageType: type,
      content: text,
      mediaUrl,
      status: 'sent',
      createdAt: timestamp,
    };

    // Update messages, last message preview in conversation, and outbound analytics count
    set((state) => {
      const updatedMessages = [...state.messages, newMsg];
      const updatedConversations = state.conversations.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            lastMessagePreview: type === 'text' ? text : `[${type.toUpperCase()}] đính kèm`,
            lastMessageAt: timestamp,
          };
        }
        return c;
      });

      const updatedDashboard = {
        ...state.dashboardStats,
        todayOutbound: state.dashboardStats.todayOutbound + 1,
        agentLeaderboard: state.dashboardStats.agentLeaderboard.map(agent => 
          agent.id === get().currentUser.id 
            ? { ...agent, messagesSent: agent.messagesSent + 1 }
            : agent
        )
      };

      return {
        messages: updatedMessages,
        conversations: updatedConversations,
        dashboardStats: updatedDashboard,
      };
    });

    // Emulate mock auto-reply from customer after 1.5 seconds
    setTimeout(() => {
      const currentConv = get().conversations.find((c) => c.id === conversationId);
      if (!currentConv) return;
      const contact = get().contacts.find((ct) => ct.id === currentConv.contactId);
      const customerName = contact ? contact.name : 'Khách hàng';

      const replies = [
        'Dạ vâng, cảm ơn shop đã tư vấn ạ.',
        'Mẫu này chất liệu gì vậy shop?',
        'Dạ em đã nhận được tin nhắn, shop phản hồi nhanh quá.',
        'Shop ship COD cho em về địa chỉ cũ nha.',
        'Sản phẩm này có được bảo hành đổi trả trong 7 ngày không shop?',
        'Để em suy nghĩ thêm rồi báo lại shop sau nha.',
      ];
      
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const autoReplyId = `m-reply-${Date.now()}`;
      const replyTimestamp = new Date().toISOString();

      const replyMsg: Message = {
        id: autoReplyId,
        conversationId,
        senderType: 'customer',
        messageType: 'text',
        content: randomReply,
        status: 'delivered',
        createdAt: replyTimestamp,
      };

      set((state) => {
        const updatedMessages = [...state.messages, replyMsg];
        const isActive = state.activeConversationId === conversationId;
        
        const updatedConversations = state.conversations.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              lastMessagePreview: randomReply,
              lastMessageAt: replyTimestamp,
              unreadCount: isActive ? 0 : c.unreadCount + 1,
            };
          }
          return c;
        });

        const updatedDashboard = {
          ...state.dashboardStats,
          todayInbound: state.dashboardStats.todayInbound + 1,
        };

        return {
          messages: updatedMessages,
          conversations: updatedConversations,
          dashboardStats: updatedDashboard,
        };
      });
    }, 1500);
  },

  assignAgent: (conversationId, agentId) => {
    set((state) => {
      const updatedConversations = state.conversations.map((c) => {
        if (c.id === conversationId) {
          return { ...c, assignedUserId: agentId };
        }
        return c;
      });

      // Update Dashboard Leaderboard logic
      const updatedDashboard = {
        ...state.dashboardStats,
        agentLeaderboard: state.dashboardStats.agentLeaderboard.map(agent => {
          const activeChatsCount = updatedConversations.filter(c => c.assignedUserId === agent.id && c.status !== 'closed').length;
          return {
            ...agent,
            chatsHandled: activeChatsCount + 10 // Mock baseline + current active
          };
        })
      };

      return { 
        conversations: updatedConversations,
        dashboardStats: updatedDashboard
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

      // Update dashboard stats open/pending counts
      const openCount = updatedConversations.filter(c => c.status === 'open').length;
      const pendingCount = updatedConversations.filter(c => c.status === 'pending').length;

      const updatedDashboard = {
        ...state.dashboardStats,
        openConversations: openCount,
        pendingConversations: pendingCount,
      };

      return {
        conversations: updatedConversations,
        dashboardStats: updatedDashboard,
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
