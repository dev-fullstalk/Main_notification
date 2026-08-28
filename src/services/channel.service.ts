import { channelRepo } from '../repositories/channel.repo';
import { ChannelDTO } from '../types/db.types';

export const channelService = {
  async getAllActive(): Promise<ChannelDTO[]> {
    try {
      return await channelRepo.getAllActive();
    } catch (error: any) {
      console.error('Database query failed in channelService.getAllActive:', error.message);
      throw error;
    }
  }
};
