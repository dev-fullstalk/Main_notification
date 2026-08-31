export interface Channel {
  id: string;
  platform: 'facebook' | 'zalo' | 'telegram' | 'whatsapp' | 'livechat';
  name: string;
  externalChannelId: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
  unreadCount?: number; // UI display helper
}
