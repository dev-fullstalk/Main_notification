export interface Contact {
  id: string;
  channelId: string;
  externalUserId: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  email?: string;
  isGroup?: boolean;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}
