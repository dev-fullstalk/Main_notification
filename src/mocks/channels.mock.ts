import { Channel } from '../types/channel';

export const mockChannels: Channel[] = [
  {
    id: '1',
    platform: 'facebook',
    name: 'Fanpage Giày Nam Terax',
    externalChannelId: 'fb-page-123',
    avatarUrl: 'https://img.icons8.com/color/512/facebook-new.png',
    isActive: true,
  },
  {
    id: '2',
    platform: 'zalo',
    name: 'Zalo CSKH Terax Official',
    externalChannelId: 'zalo-oa-456',
    avatarUrl: 'https://img.icons8.com/color/512/zalo.png', // Zalo color icon
    isActive: true,
  },
  {
    id: '3',
    platform: 'telegram',
    name: 'Telegram CSKH Terax',
    externalChannelId: 'tele-bot-789',
    avatarUrl: 'https://img.icons8.com/color/512/telegram-app.png',
    isActive: true,
  },
  {
    id: '4',
    platform: 'tiktok',
    name: 'TikTok Shop Terax Fashion',
    externalChannelId: 'tiktok-shop-999',
    avatarUrl: 'https://img.icons8.com/color/512/tiktok.png',
    isActive: true,
  }
];
