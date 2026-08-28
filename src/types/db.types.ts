// Lookup tables type definitions
export interface DbUserRole {
  id: number;
  name: 'admin' | 'supervisor' | 'agent';
}

export interface DbChannelPlatform {
  id: number;
  name: 'facebook' | 'zalo' | 'telegram' | 'tiktok' | 'livechat';
}

export interface DbConversationStatus {
  id: number;
  name: 'open' | 'pending' | 'resolved' | 'closed';
}

export interface DbMessageSenderType {
  id: number;
  name: 'customer' | 'agent' | 'bot' | 'system';
}

export interface DbMessageType {
  id: number;
  name: 'text' | 'image' | 'video' | 'file' | 'audio' | 'sticker';
}

export interface DbMessageStatus {
  id: number;
  name: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
}

// Main tables type definitions
export interface DbUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  id__users_roles: number;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbChannel {
  id: string;
  id__channels_platforms: number;
  name: string;
  external_channel_id: string;
  access_token?: string | null;
  refresh_token?: string | null;
  token_expires_at?: string | null;
  avatar_url?: string | null;
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbContact {
  id: string;
  channel_id: string;
  external_user_id: string;
  name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  email?: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DbConversation {
  id: string;
  channel_id: string;
  contact_id: string;
  assigned_user_id?: string | null;
  id__conversations_statuses: number;
  last_message_preview?: string | null;
  last_message_at: string;
  unread_count: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  id__messages_sender_types: number;
  sender_user_id?: string | null;
  id__messages_types: number;
  content?: string | null;
  media_url?: string | null;
  payload: Record<string, any>;
  external_message_id?: string | null;
  id__messages_statuses: number;
  error_message?: string | null;
  created_at: string;
}

// Data Transfer Objects (DTOs) for API responses
export interface ChannelDTO extends DbChannel {
  platform: string; // Resolves from channels_platforms.name
}

export interface ConversationDTO extends DbConversation {
  contact_name: string;
  contact_avatar_url?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  status: string; // Resolves from conversations_statuses.name
}

export interface MessageDTO extends DbMessage {
  sender_type: string; // Resolves from messages_sender_types.name
  message_type: string; // Resolves from messages_types.name
  status: string; // Resolves from messages_statuses.name
  agent_name?: string | null; // Resolves from users.name
  agent_avatar_url?: string | null; // Resolves from users.avatar_url
}
