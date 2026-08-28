export interface Message {
  id: string;
  conversationId: string;
  senderType: 'customer' | 'agent' | 'bot' | 'system';
  senderUserId?: string | null;
  messageType: 'text' | 'image' | 'video' | 'file' | 'audio' | 'sticker';
  content?: string;
  mediaUrl?: string;
  payload?: Record<string, any>;
  externalMessageId?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  errorMessage?: string;
  createdAt: string;
}
