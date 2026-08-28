import { channelRepo } from '../repositories/channel.repo';
import { ChannelDTO } from '../types/db.types';
import { mockChannels } from '../mocks/channels.mock';

export const channelService = {
  async getAllActive(): Promise<ChannelDTO[]> {
    try {
      return await channelRepo.getAllActive();
    } catch (error: any) {
      console.warn('Database query failed in channelService. Falling back to Mock Data. Details:', error.message);
      
      // Fallback: convert mock channels to match DB DTO properties
      return mockChannels.map((c) => ({
        id: c.id,
        id__channels_platforms: 
          c.platform === 'facebook' ? 1 : 
          c.platform === 'zalo' ? 2 : 
          c.platform === 'telegram' ? 3 : 
          c.platform === 'tiktok' ? 4 : 5,
        name: c.name,
        external_channel_id: c.externalChannelId,
        avatar_url: c.avatarUrl || null,
        metadata: {},
        is_active: c.isActive,
        platform: c.platform,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }
  }
};
