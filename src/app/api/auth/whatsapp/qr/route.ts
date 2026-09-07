import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import { query } from '@/config/database';
import { stopSync, restartSync } from '@/lib/sync-manager';

declare global {
  var __waQrSocket: any;
  var __waQrState: {
    image: string | null;
    status: 'idle' | 'generating' | 'waiting' | 'completed' | 'failed';
    user: any | null;
    error?: string | null;
  } | undefined;
}

if (!global.__waQrState) {
  global.__waQrState = {
    image: null,
    status: 'idle',
    user: null,
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

export async function GET() {
  const isRegistered = checkIsConnected();
  const state = global.__waQrState;

  return NextResponse.json({
    success: true,
    data: {
      image: state?.image || null,
      status: state?.status || 'idle',
      user: state?.user || null,
      error: state?.error || null,
      isConnected: state?.status === 'completed' || isRegistered,
    },
  });
}

export async function POST(request: Request) {
  try {
    const { 
      default: makeWASocket, 
      useMultiFileAuthState, 
      DisconnectReason,
      Browsers,
      fetchLatestBaileysVersion
    } = await import('@whiskeysockets/baileys');
    const pino = (await import('pino')).default;

    // Stop background sync process so there is no socket conflict during QR login
    try {
      stopSync('whatsapp');
    } catch (_) {}

    const authDir = path.resolve(process.cwd(), 'whatsapp_auth');
    if (global.__waQrSocket) {
      try {
        global.__waQrSocket.end();
      } catch (_) {}
      global.__waQrSocket = null;
    }

    // Clean old stale credentials to force fresh QR code generation
    if (fs.existsSync(authDir)) {
      try {
        fs.rmSync(authDir, { recursive: true, force: true });
      } catch (_) {}
    }
    fs.mkdirSync(authDir, { recursive: true });

    global.__waQrState = {
      image: null,
      status: 'generating',
      user: null,
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


      global.__waQrSocket = sock;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const qrDataUrl = await QRCode.toDataURL(qr, {
              width: 300,
              margin: 2,
              errorCorrectionLevel: 'M',
              color: {
                dark: '#000000',
                light: '#ffffff',
              },
            });
            if (global.__waQrState) {
              global.__waQrState.image = qrDataUrl;
              global.__waQrState.status = 'waiting';
            }
            console.log('📱 [WhatsApp QR] Mã QR mới đã được tạo và sẵn sàng quét!');
          } catch (err: any) {
            console.error('WhatsApp QR render error:', err);
          }
        }

        if (connection === 'open') {
          const userJid = sock.user?.id || `whatsapp-${Date.now()}`;
          const rawPhone = userJid.split(':')[0] || userJid.split('@')[0];
          const userName = sock.user?.name || `+${rawPhone}`;
          
          if (global.__waQrState) {
            global.__waQrState.status = 'completed';
            global.__waQrState.user = { id: userJid, name: userName };
          }

          console.log('✅ [WhatsApp QR] Kết nối thành công cho:', userName);

          // Update database
          try {
            let platRes = await query(`SELECT id FROM channels_platforms WHERE name = 'whatsapp'`);
            let platformId = platRes.rows.length > 0 ? platRes.rows[0].id : 6;

            let chanRes = await query(
              `SELECT id FROM channels WHERE id__channels_platforms = $1 LIMIT 1`,
              [platformId]
            );

            if (chanRes.rows.length === 0) {
              await query(
                `INSERT INTO channels (id__channels_platforms, name, external_channel_id, avatar_url, is_active)
                 VALUES ($1, $2, $3, 'https://img.icons8.com/color/512/whatsapp--v1.png', true)`,
                [platformId, `WhatsApp: ${userName}`, userJid]
              );
            } else {
              await query(
                `UPDATE channels 
                 SET name = $1, external_channel_id = $2, is_active = true, updated_at = NOW()
                 WHERE id = $3`,
                [`WhatsApp: ${userName}`, userJid, chanRes.rows[0].id]
              );
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
          console.log(`ℹ️ [WhatsApp QR] Socket closed with code: ${statusCode}`);
          if (statusCode === DisconnectReason.loggedOut) {
            if (global.__waQrState) {
              global.__waQrState.status = 'failed';
              global.__waQrState.error = 'Phiên đăng nhập đã bị đăng xuất';
            }
          } else if (statusCode === DisconnectReason.restartRequired || statusCode === 515 || statusCode === 428) {
            console.log('🔄 [WhatsApp QR] Tự động kết nối lại để hoàn tất phiên...');
            setTimeout(initSocket, 1500);
          }
        }
      });

      return sock;
    };

    initSocket();

    // Wait 2.5s for initial QR generation
    await new Promise((r) => setTimeout(r, 2500));

    return NextResponse.json({
      success: true,
      data: global.__waQrState,
    });
  } catch (error: any) {
    console.error('WhatsApp QR API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Không thể tạo mã QR WhatsApp' },
      { status: 500 }
    );
  }
}
