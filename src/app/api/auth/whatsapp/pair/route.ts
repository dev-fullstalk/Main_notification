import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { query } from '@/config/database';
import { stopSync, restartSync } from '@/lib/sync-manager';

declare global {
  var __waPairSocket: any;
  var __waPairState: {
    isConnected: boolean;
    user: any;
    phone: string | null;
  } | undefined;
}

if (!global.__waPairState) {
  global.__waPairState = {
    isConnected: false,
    user: null,
    phone: null,
  };
}

function checkIsConnected(): boolean {
  const authDir = path.resolve(process.cwd(), 'whatsapp_auth');
  const credsFile = path.join(authDir, 'creds.json');
  if (!fs.existsSync(credsFile)) return false;
  try {
    const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
    return Boolean(creds && creds.registered === true && creds.me && creds.me.id);
  } catch (_) {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập số điện thoại WhatsApp hợp lệ (Ví dụ: +84912345678)' },
        { status: 400 }
      );
    }

    // Stop background sync process so there is no socket conflict during pairing
    try {
      stopSync('whatsapp');
    } catch (_) {}

    // Format phone: e.g. +84912345678 -> 84912345678
    const cleanPhone = phoneNumber.trim().replace(/[^0-9]/g, '');

    // Baileys dynamic import
    const { 
      default: makeWASocket, 
      useMultiFileAuthState, 
      DisconnectReason,
      Browsers,
      fetchLatestBaileysVersion
    } = await import('@whiskeysockets/baileys');
    const pino = (await import('pino')).default;

    const authDir = path.resolve(process.cwd(), 'whatsapp_auth');
    // Đóng socket trước đó nếu còn tồn tại
    if (global.__waPairSocket) {
      try {
        global.__waPairSocket.end();
      } catch (_) {}
      global.__waPairSocket = null;
    }

    // Clean old stale credentials to force fresh pairing code generation
    if (fs.existsSync(authDir)) {
      try {
        fs.rmSync(authDir, { recursive: true, force: true });
      } catch (_) {}
    }
    fs.mkdirSync(authDir, { recursive: true });

    global.__waPairState = {
      isConnected: false,
      user: null,
      phone: phoneNumber,
    };

    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const initSocket = () => {
      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
      });


      global.__waPairSocket = sock;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'open') {
          const userJid = sock.user?.id || `${cleanPhone}@s.whatsapp.net`;
          const rawPhone = userJid.split(':')[0] || cleanPhone;
          const userName = sock.user?.name || `+${rawPhone}`;
          
          if (global.__waPairState) {
            global.__waPairState.isConnected = true;
            global.__waPairState.user = { id: userJid, name: userName, phone: phoneNumber };
          }
          
          console.log('✅ [WhatsApp Pair] Kết nối thành công cho:', userName);

          // Lưu vào Database
          try {
            let platRes = await query(`SELECT id FROM channels_platforms WHERE name = 'whatsapp'`);
            let platformId = platRes.rows.length > 0 ? platRes.rows[0].id : 6;

            let chanRes = await query(`SELECT id FROM channels WHERE id__channels_platforms = $1 LIMIT 1`, [platformId]);
            if (chanRes.rows.length === 0) {
              await query(`
                INSERT INTO channels (id__channels_platforms, name, external_channel_id, avatar_url, is_active)
                VALUES ($1, $2, $3, 'https://img.icons8.com/color/512/whatsapp--v1.png', true)
              `, [platformId, `WhatsApp: ${userName}`, userJid]);
            } else {
              await query(`
                UPDATE channels 
                SET name = $1, external_channel_id = $2, is_active = true, updated_at = NOW()
                WHERE id = $3
              `, [`WhatsApp: ${userName}`, userJid, chanRes.rows[0].id]);
            }
          } catch (dbErr: any) {
            console.warn('DB WhatsApp channel update error:', dbErr.message);
          }

          // Restart sync daemon in background after 2s
          setTimeout(() => {
            try {
              restartSync('whatsapp');
            } catch (_) {}
          }, 2000);
        } else if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          console.log(`ℹ️ [WhatsApp Pair] Socket closed with code: ${statusCode}`);
          if (statusCode === DisconnectReason.loggedOut) {
            if (global.__waPairState) {
              global.__waPairState.isConnected = false;
              global.__waPairState.user = null;
            }
          } else if (statusCode === DisconnectReason.restartRequired || statusCode === 515 || statusCode === 428) {
            console.log('🔄 [WhatsApp Pair] Tự động kết nối lại để hoàn tất phiên...');
            setTimeout(initSocket, 1500);
          }
        }
      });

      return sock;
    };

    const sock = initSocket();

    // Đợi 2s để socket sẵn sàng tạo Pairing code
    await new Promise((r) => setTimeout(r, 2000));

    let pairingCode = '';
    if (!sock.authState.creds.registered) {
      pairingCode = await sock.requestPairingCode(cleanPhone);
      // Format pairing code to 4-4 format: e.g. "ABCD-EFGH"
      if (pairingCode && pairingCode.length === 8) {
        pairingCode = `${pairingCode.slice(0, 4)}-${pairingCode.slice(4)}`;
      }
    } else {
      pairingCode = 'ALREADY_REGISTERED';
      if (global.__waPairState) global.__waPairState.isConnected = true;
    }

    return NextResponse.json({
      success: true,
      pairingCode,
      phoneNumber,
      message: 'Mã kết nối WhatsApp đã được tạo.',
    });
  } catch (error: any) {
    console.error('WhatsApp pair error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Không thể tạo mã kết nối WhatsApp' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const isRegistered = checkIsConnected();
  const state = global.__waPairState;

  return NextResponse.json({
    success: true,
    isConnected: Boolean(state?.isConnected || isRegistered),
    user: state?.user || null,
  });
}
