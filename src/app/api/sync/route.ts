import { NextResponse } from 'next/server';
import { getSyncStatus, startSync, stopSync, restartSync } from '@/lib/sync-manager';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const autoStart = searchParams.get('autoStart');

    if (autoStart === 'true') {
      const current = getSyncStatus();
      const platforms: ('telegram' | 'zalo' | 'whatsapp' | 'facebook')[] = ['telegram', 'zalo', 'whatsapp', 'facebook'];
      for (const p of platforms) {
        if (!current[p]?.isRunning) {
          try {
            startSync(p);
          } catch (e: any) {
            console.warn(`[SyncAutoStart] Lỗi khởi động ${p}:`, e.message);
          }
        }
      }
    }

    const status = getSyncStatus();
    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, platform } = body; // action: 'restart' | 'start' | 'stop', platform: 'telegram' | 'zalo' | 'whatsapp' | 'facebook' | 'all'

    const platforms: ('telegram' | 'zalo' | 'whatsapp' | 'facebook')[] = 
      platform === 'all' ? ['telegram', 'zalo', 'whatsapp', 'facebook'] : [platform];

    for (const p of platforms) {
      if (action === 'start') {
        startSync(p);
      } else if (action === 'stop') {
        stopSync(p);
      } else if (action === 'restart') {
        restartSync(p);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã thực hiện ${action} tiến trình đồng bộ cho ${platform} thành công!`,
      status: getSyncStatus(),
    });
  } catch (error: any) {
    console.error('Sync control API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
