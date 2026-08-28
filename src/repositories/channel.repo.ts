import { query } from '../config/database';
import { ChannelDTO } from '../types/db.types';

export const channelRepo = {
  async getAllActive(): Promise<ChannelDTO[]> {
    const { rows } = await query(`
      SELECT c.*, p.name as platform
      FROM channels c
      JOIN channels_platforms p ON c.id__channels_platforms = p.id
      WHERE c.is_active = true
    `);
    return rows;
  }
};
