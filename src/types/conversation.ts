export interface Conversation {
  id: string;
  channelId: string;
  contactId: string;
  assignedUserId?: string | null;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  lastMessagePreview?: string;
  lastMessageAt: string;
  unreadCount: number;
  isTyping?: boolean;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}
