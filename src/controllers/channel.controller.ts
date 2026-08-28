import { NextResponse } from 'next/server';
import { channelService } from '../services/channel.service';

export const channelController = {
  async getAllActive() {
    try {
      const data = await channelService.getAllActive();
      return NextResponse.json({ success: true, data });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || 'Internal Server Error' },
        { status: 500 }
      );
    }
  }
};
