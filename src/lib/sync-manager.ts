import { spawn, ChildProcess } from 'child_process';
import path from 'path';

// Singleton in Node global to persist across Next.js API reloads in development
declare global {
  var __syncProcesses: {
    telegram?: ChildProcess | null;
    zalo?: ChildProcess | null;
    whatsapp?: ChildProcess | null;
    facebook?: ChildProcess | null;
  } | undefined;
}

if (!global.__syncProcesses) {
  global.__syncProcesses = {};
}

const processes = global.__syncProcesses;

export type SyncPlatform = 'telegram' | 'zalo' | 'whatsapp' | 'facebook';

export function getSyncStatus() {
  return {
    telegram: {
      isRunning: Boolean(processes.telegram && !processes.telegram.killed && processes.telegram.exitCode === null),
      pid: processes.telegram?.pid || null,
    },
    zalo: {
      isRunning: Boolean(processes.zalo && !processes.zalo.killed && processes.zalo.exitCode === null),
      pid: processes.zalo?.pid || null,
    },
    whatsapp: {
      isRunning: Boolean(processes.whatsapp && !processes.whatsapp.killed && processes.whatsapp.exitCode === null),
      pid: processes.whatsapp?.pid || null,
    },
    facebook: {
      isRunning: Boolean(processes.facebook && !processes.facebook.killed && processes.facebook.exitCode === null),
      pid: processes.facebook?.pid || null,
    },
  };
}

export function stopSync(platform: SyncPlatform) {
  const proc = processes[platform];
  if (proc && !proc.killed && proc.exitCode === null) {
    console.log(`🛑 [SyncManager] Đang dừng tiến trình đồng bộ ${platform} (PID: ${proc.pid})...`);
    try {
      if (process.platform === 'win32' && proc.pid) {
        // Force kill process tree on Windows
        spawn('taskkill', ['/pid', String(proc.pid), '/f', '/t']);
      } else {
        proc.kill('SIGTERM');
      }
    } catch (e: any) {
      console.warn(`Lỗi khi dừng sync ${platform}:`, e.message);
    }
    processes[platform] = null;
  }
}

export function startSync(platform: SyncPlatform) {
  stopSync(platform);

  const scriptMap: Record<SyncPlatform, string> = {
    telegram: 'src/scripts/telegram-sync.js',
    zalo: 'src/scripts/zalo-sync.js',
    whatsapp: 'src/scripts/whatsapp-sync.js',
    facebook: 'src/scripts/facebook-sync.js',
  };

  const scriptRelativePath = scriptMap[platform];
  const scriptFullPath = path.resolve(process.cwd(), scriptRelativePath);

  console.log(`🚀 [SyncManager] Đang tự động khởi chạy tiến trình ${platform} (${scriptRelativePath})...`);

  const child = spawn(process.execPath, [scriptFullPath], {
    cwd: process.cwd(),
    stdio: 'inherit',
    detached: false,
    env: { ...process.env },
  });

  child.on('error', (err) => {
    console.error(`❌ [SyncManager] Lỗi tiến trình ${platform}:`, err.message);
  });

  child.on('exit', (code, signal) => {
    console.log(`ℹ️ [SyncManager] Tiến trình ${platform} đã kết thúc (Code: ${code}, Signal: ${signal})`);
    if (processes[platform] === child) {
      processes[platform] = null;
    }
  });

  processes[platform] = child;
  return child.pid;
}

export function restartSync(platform: SyncPlatform) {
  stopSync(platform);
  // Short delay to let sockets clean up
  setTimeout(() => {
    startSync(platform);
  }, 1000);
}
