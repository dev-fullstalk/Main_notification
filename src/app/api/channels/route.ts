import { NextResponse } from 'next/server';
import { channelController } from '@/controllers/channel.controller';

// GET: List all connected channels from PostgreSQL
export async function GET() {
  return channelController.getAllActive();
}

// POST: Register a new channel connection (Mocked API placeholder for future DB inserts)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { platform, name, externalChannelId } = body;

    if (!platform || !name || !externalChannelId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const newChannel = {
      id: `channel-${Date.now()}`,
      platform,
      name,
      externalChannelId,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    console.log('Channel Connected successfully via API:', newChannel);

    return NextResponse.json({
      success: true,
      message: 'Channel connected successfully',
      data: newChannel,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
