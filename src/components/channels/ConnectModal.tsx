'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShieldCheck, 
  Link2, 
  Send, 
  KeyRound, 
  Phone, 
  Lock, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  ArrowLeft, 
  UserCheck,
  QrCode,
  Smartphone,
  Copy,
  Check,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { useChatStore } from '../../store/useChatStore';
import { PLATFORMS } from '../../lib/constants';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlatform?: 'telegram' | 'whatsapp' | 'zalo' | 'facebook' | 'tiktok';
}

export default function ConnectModal({ isOpen, onClose, initialPlatform }: ConnectModalProps) {
  const { connectNewChannel, fetchChannels } = useChatStore();
  const [platform, setPlatform] = useState<'telegram' | 'whatsapp' | 'zalo' | 'facebook' | 'tiktok'>(initialPlatform || 'zalo');

  // Common Form States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // --- TELEGRAM STATES ---
  const [telegramMode, setTelegramMode] = useState<'qr' | 'phone' | 'bot'>('qr');
  const [teleQrImage, setTeleQrImage] = useState<string | null>(null);
  const [teleQrStatus, setTeleQrStatus] = useState<string>('idle');
  const [telegramStep, setTelegramStep] = useState<'phone' | 'otp' | 'success'>('phone');
  const [telePhone, setTelePhone] = useState('');
  const [teleOtp, setTeleOtp] = useState('');
  const [tele2FA, setTele2FA] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [tempSession, setTempSession] = useState('');
  const [telegramUser, setTelegramUser] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  const telePollInterval = useRef<NodeJS.Timeout | null>(null);

  // --- WHATSAPP STATES ---
  const [waMode, setWaMode] = useState<'qr' | 'phone'>('qr');
  const [waQrImage, setWaQrImage] = useState<string | null>(null);
  const [waQrStatus, setWaQrStatus] = useState<string>('idle');
  const [waQrUser, setWaQrUser] = useState<any>(null);
  const [waStep, setWaStep] = useState<'phone' | 'pairing_code' | 'success'>('phone');
  const [waPhone, setWaPhone] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const waPollInterval = useRef<NodeJS.Timeout | null>(null);
  const waQrPollInterval = useRef<NodeJS.Timeout | null>(null);

  // --- ZALO STATES ---
  const [zaloMode, setZaloMode] = useState<'qr' | 'oa'>('qr');
  const [zaloQrImage, setZaloQrImage] = useState<string | null>(null);
  const [zaloStatus, setZaloStatus] = useState<string>('idle');
  const [zaloUser, setZaloUser] = useState<any>(null);
  const zaloPollInterval = useRef<NodeJS.Timeout | null>(null);

  // --- FACEBOOK STATES (DIRECT LOGIN & MANUAL) ---
  const [fbMode, setFbMode] = useState<'login' | 'manual'>('login');
  const [fbStep, setFbStep] = useState<'initial' | 'selecting' | 'success'>('initial');
  const [fbAppIdInput, setFbAppIdInput] = useState('');
  const [fbEmail, setFbEmail] = useState('');
  const [fbPassword, setFbPassword] = useState('');
  const [fb2FACode, setFb2FACode] = useState('');
  const [fbNeeds2FA, setFbNeeds2FA] = useState(false);
  const [showFbPassword, setShowFbPassword] = useState(false);
  const [fbDiscoveredPages, setFbDiscoveredPages] = useState<any[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [connectedCount, setConnectedCount] = useState(0);

  // --- MANUAL / STANDARD STATES ---
  const [channelName, setChannelName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [token, setToken] = useState('');

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialPlatform) {
        setPlatform(initialPlatform);
      }
      setErrorMessage(null);
      
      // Reset Telegram
      setTelegramStep('phone');
      setTeleOtp('');
      setTele2FA('');
      setNeedsTwoFactor(false);
      setTeleQrImage(null);
      setTeleQrStatus('idle');

      // Reset WhatsApp
      setWaStep('phone');
      setPairingCode('');
      setWaQrImage(null);
      setWaQrStatus('idle');
      setWaQrUser(null);

      // Reset Zalo
      setZaloQrImage(null);
      setZaloStatus('idle');
      setZaloUser(null);

      // Reset Facebook
      setFbStep('initial');
      setFbNeeds2FA(false);
      setSelectedPageIds([]);
    } else {
      if (telePollInterval.current) clearInterval(telePollInterval.current);
      if (waPollInterval.current) clearInterval(waPollInterval.current);
      if (waQrPollInterval.current) clearInterval(waQrPollInterval.current);
      if (zaloPollInterval.current) clearInterval(zaloPollInterval.current);
    }
  }, [isOpen, initialPlatform]);

  // Countdown timer for resending OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Esc key binding
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  // ==========================================
  // 1. TELEGRAM HANDLERS
  // ==========================================
  const handleGenerateTeleQR = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setTeleQrImage(null);
    setTeleQrStatus('generating');

    try {
      const res = await fetch('/api/auth/telegram/qr', { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Không thể tạo mã QR Telegram');

      if (json.data?.image) {
        setTeleQrImage(json.data.image);
        setTeleQrStatus('waiting');
      }

      if (telePollInterval.current) clearInterval(telePollInterval.current);
      telePollInterval.current = setInterval(async () => {
        try {
          const statusRes = await fetch('/api/auth/telegram/qr');
          const statusJson = await statusRes.json();
          if (statusJson.data?.status === 'completed') {
            if (telePollInterval.current) clearInterval(telePollInterval.current);
            setTeleQrStatus('completed');
            setTelegramUser(statusJson.data.user);
            await fetchChannels();
          }
        } catch (_) {}
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tạo mã QR Telegram.');
      setTeleQrStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTelegramCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telePhone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại Telegram.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/telegram/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: telePhone.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Không thể gửi mã OTP');

      setPhoneCodeHash(data.phoneCodeHash);
      setTempSession(data.tempSession);
      setTelegramStep('otp');
      setCountdown(60);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi gửi mã xác nhận qua Telegram.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTelegramCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teleOtp.trim()) {
      setErrorMessage('Vui lòng nhập mã OTP nhận được.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/telegram/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: telePhone.trim(),
          phoneCodeHash,
          phoneCode: teleOtp.trim(),
          password: tele2FA.trim() || undefined,
          tempSession,
          customChannelName: channelName.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (data.requires2FA) {
        setNeedsTwoFactor(true);
        setErrorMessage(data.message || 'Vui lòng nhập mật khẩu 2FA của tài khoản.');
        setIsLoading(false);
        return;
      }

      if (!data.success) throw new Error(data.error || 'Xác thực OTP thất bại');

      setTelegramUser(data.data);
      setTelegramStep('success');
      await fetchChannels();
    } catch (err: any) {
      setErrorMessage(err.message || 'Mã OTP hoặc mật khẩu 2FA không chính xác.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 2. WHATSAPP HANDLERS
  // ==========================================
  const handleGenerateWaQR = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setWaQrImage(null);
    setWaQrStatus('generating');

    try {
      const res = await fetch('/api/auth/whatsapp/qr', { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Không thể tạo mã QR WhatsApp');

      if (json.data?.image) {
        setWaQrImage(json.data.image);
        setWaQrStatus('waiting');
      }

      if (waQrPollInterval.current) clearInterval(waQrPollInterval.current);
      waQrPollInterval.current = setInterval(async () => {
        try {
          const statusRes = await fetch('/api/auth/whatsapp/qr');
          const statusJson = await statusRes.json();
          if (statusJson.data?.image && statusJson.data.image !== waQrImage) {
            setWaQrImage(statusJson.data.image);
          }
          if (statusJson.data?.status === 'completed' || statusJson.data?.isConnected) {
            if (waQrPollInterval.current) clearInterval(waQrPollInterval.current);
            setWaQrStatus('completed');
            setWaQrUser(statusJson.data.user || { name: 'WhatsApp Cá nhân' });
            await fetchChannels();
          }
        } catch (_) {}
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tạo mã QR WhatsApp.');
      setWaQrStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestWaPairing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waPhone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại WhatsApp.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/whatsapp/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: waPhone.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Không thể tạo mã liên kết WhatsApp');

      setPairingCode(data.pairingCode);
      setWaStep('pairing_code');

      if (waPollInterval.current) clearInterval(waPollInterval.current);
      waPollInterval.current = setInterval(async () => {
        try {
          const statusRes = await fetch('/api/auth/whatsapp/pair');
          const statusData = await statusRes.json();
          if (statusData.isConnected) {
            if (waPollInterval.current) clearInterval(waPollInterval.current);
            setWaStep('success');
            await fetchChannels();
          }
        } catch (_) {}
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tạo mã kết nối WhatsApp.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 3. ZALO QR LOGIN HANDLERS
  // ==========================================
  const handleGenerateZaloQR = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setZaloQrImage(null);

    try {
      const res = await fetch('/api/auth/zalo/qr', { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Không thể tạo mã QR Zalo');

      if (json.data?.image) {
        setZaloQrImage(json.data.image);
      }

      if (zaloPollInterval.current) clearInterval(zaloPollInterval.current);
      zaloPollInterval.current = setInterval(async () => {
        try {
          const statusRes = await fetch('/api/auth/zalo/qr');
          const statusJson = await statusRes.json();
          if (statusJson.data?.status === 'scanned') {
            setZaloStatus('scanned');
          } else if (statusJson.data?.status === 'completed') {
            if (zaloPollInterval.current) clearInterval(zaloPollInterval.current);
            setZaloStatus('completed');
            setZaloUser(statusJson.data.user);
            await fetchChannels();
          }
        } catch (_) {}
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tạo mã QR Zalo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFacebookPopup = () => {
    setErrorMessage(null);
    setIsLoading(true);

    const width = 520;
    const height = 640;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      '/auth/facebook-login',
      'facebook_oauth_window',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'FB_LOGIN_SUCCESS' || (event.data?.type === 'FB_OAUTH_TOKEN' && event.data.token)) {
        window.removeEventListener('message', handleMessage);
        setIsLoading(false);
        if (event.data.pages) {
          setFbDiscoveredPages(event.data.pages);
          setSelectedPageIds(event.data.pages.map((p: any) => p.id));
          setFbStep('selecting');
        } else if (event.data.token) {
          handleFetchRealFbPages(event.data.token);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    const checkClosed = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(checkClosed);
        setIsLoading(false);
      }
    }, 1000);
  };

  const handleFetchRealFbPages = async (customToken?: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/facebook/oauth-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: customToken || token || undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Không thể lấy danh sách Fanpage từ tài khoản Facebook này');

      const pages = json.data || [];
      if (pages.length === 0) {
        throw new Error('Tài khoản Facebook này hiện chưa quản trị Fanpage nào. Vui lòng tạo Fanpage trên Facebook trước.');
      }

      setFbDiscoveredPages(pages);
      setSelectedPageIds(pages.map((p: any) => p.id));
      setFbStep('selecting');
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi kết nối Facebook.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelectPage = (pageId: string) => {
    setSelectedPageIds((prev) => 
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedPageIds.length === fbDiscoveredPages.length) {
      setSelectedPageIds([]);
    } else {
      setSelectedPageIds(fbDiscoveredPages.map((p) => p.id));
    }
  };

  const handleConfirmConnectPages = async () => {
    if (selectedPageIds.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất 1 Fanpage để liên kết.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const selectedPages = fbDiscoveredPages.filter((p) => selectedPageIds.includes(p.id));
      const res = await fetch('/api/auth/facebook/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedPages }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Không thể liên kết Fanpage');

      setConnectedCount(selectedPages.length);
      setFbStep('success');
      await fetchChannels();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi lưu kết nối Fanpage.');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 5. STANDARD SUBMIT (MANUAL TOKEN / OA)
  // ==========================================
  const handleStandardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim() || !externalId.trim()) return;

    setIsLoading(true);
    setTimeout(() => {
      connectNewChannel(platform as any, channelName, externalId);
      setIsLoading(false);
      onClose();
      setChannelName('');
      setExternalId('');
      setToken('');
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 p-4">
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="relative w-full max-w-lg rounded-2xl bg-card text-card-foreground p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Thêm / Chuyển giao Tài khoản Kênh</h3>
              <p className="text-xs text-muted-foreground">Đăng nhập nhanh bằng 1-Click, Quét mã QR hoặc SĐT</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Platform Selector */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">Chọn Nền tảng</label>
          <div className="grid grid-cols-4 gap-2">
            {(['zalo', 'telegram', 'facebook', 'whatsapp'] as const).map((plat) => {
              const config = PLATFORMS[plat];
              const isSelected = platform === plat;
              return (
                <button
                  key={plat}
                  type="button"
                  onClick={() => {
                    setPlatform(plat);
                    setErrorMessage(null);
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-sm font-semibold' 
                      : 'border-border bg-card hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <img 
                    src={config.avatarUrl} 
                    alt={config.name}
                    className="w-7 h-7 mb-1.5 object-contain" 
                  />
                  <span className="text-[11px] leading-none">{config.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 1. TELEGRAM TAB (QR CODE / PHONE / BOT) */}
        {/* ======================================================== */}
        {platform === 'telegram' && (
          <div className="mt-4 space-y-4">
            <div className="flex p-1 bg-muted rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setTelegramMode('qr')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg transition-all text-center cursor-pointer ${
                  telegramMode === 'qr' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ⭐ Quét mã QR
              </button>
              <button
                type="button"
                onClick={() => { setTelegramMode('phone'); setTelegramStep('phone'); }}
                className={`flex-1 py-1.5 px-2.5 rounded-lg transition-all text-center cursor-pointer ${
                  telegramMode === 'phone' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                SĐT & OTP
              </button>
              <button
                type="button"
                onClick={() => setTelegramMode('bot')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg transition-all text-center cursor-pointer ${
                  telegramMode === 'bot' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Bot Token
              </button>
            </div>

            {/* Telegram QR Mode */}
            {telegramMode === 'qr' && (
              <div className="space-y-4">
                {teleQrStatus === 'completed' ? (
                  <div className="py-6 text-center space-y-4 animate-in zoom-in-95">
                    <div className="w-14 h-14 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto">
                      <UserCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold">Đã kết nối Telegram thành công!</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tài khoản: <strong>{telegramUser?.name || 'Telegram Sếp'}</strong> {telegramUser?.username && `(@${telegramUser.username})`}
                      </p>
                    </div>
                    <button type="button" onClick={onClose} className="w-full py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl cursor-pointer">Hoàn tất & Đóng</button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    {teleQrImage ? (
                      <>
                        <div className="p-3 bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 rounded-xl text-xs text-sky-800 dark:text-sky-300 text-left animate-in fade-in space-y-1">
                          <strong>📱 Hướng dẫn quét trên điện thoại:</strong>
                          <p>Mở <strong>Telegram</strong> ➡️ <strong>Settings (Cài đặt)</strong> ➡️ <strong>Devices (Thiết bị)</strong> ➡️ <strong>Link Desktop Device</strong> và quét mã bên dưới:</p>
                        </div>

                        <div className="flex flex-col items-center justify-center p-4 bg-muted/40 rounded-2xl border border-border min-h-[220px]">
                          <img 
                            src={teleQrImage} 
                            alt="Mã QR Telegram" 
                            className="w-48 h-48 mx-auto rounded-xl shadow-md border-2 border-sky-400/30 bg-white p-2"
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin text-sky-500" /> Đang chờ quét từ app Telegram...
                          </span>
                          <button 
                            type="button" 
                            onClick={handleGenerateTeleQR} 
                            disabled={isLoading}
                            className="text-primary hover:underline cursor-pointer disabled:opacity-50"
                          >
                            {isLoading ? 'Đang tạo lại...' : 'Làm mới mã QR'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-2xl border border-dashed border-border min-h-[240px] space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                          <QrCode className="w-8 h-8" />
                        </div>
                        <div className="max-w-xs space-y-1">
                          <h4 className="text-sm font-semibold text-foreground">Đăng nhập Telegram bằng mã QR</h4>
                          <p className="text-xs text-muted-foreground">
                            Bấm nút bên dưới khi đã mở sẵn Telegram trên điện thoại để quét mã kết nối nhanh.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleGenerateTeleQR}
                          disabled={isLoading}
                          className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold bg-sky-600 text-white rounded-xl hover:bg-sky-700 active:scale-95 transition-all shadow-md shadow-sky-500/20 cursor-pointer disabled:opacity-50"
                        >
                          {isLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Đang khởi tạo mã QR Telegram...</span>
                            </>
                          ) : (
                            <>
                              <QrCode className="w-4 h-4" />
                              <span>Ấn để tạo mã QR</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Telegram Phone / OTP Mode */}
            {telegramMode === 'phone' && (
              <div>
                {telegramStep === 'phone' && (
                  <form onSubmit={handleSendTelegramCode} className="space-y-4">
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                      💡 <strong>Chuyển giao cho Sếp:</strong> Nhập số điện thoại Telegram của Sếp. Telegram sẽ gửi mã OTP trực tiếp vào app Telegram trên máy của Sếp.
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Tên hiển thị kênh (Tùy chọn)
                      </label>
                      <input
                        type="text"
                        value={channelName}
                        onChange={(e) => setChannelName(e.target.value)}
                        placeholder="Ví dụ: Telegram Sếp Hải / CSKH 01"
                        className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Số điện thoại Telegram (kèm mã +84)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          value={telePhone}
                          onChange={(e) => setTelePhone(e.target.value)}
                          placeholder="+84912345678"
                          className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-medium border border-border rounded-xl hover:bg-muted text-muted-foreground cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading || !telePhone.trim()}
                        className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/95 transition-all shadow-md shadow-primary/20 cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang gửi mã...</> : <><Send className="w-3.5 h-3.5" /> Gửi mã OTP</>}
                      </button>
                    </div>
                  </form>
                )}

                {telegramStep === 'otp' && (
                  <form onSubmit={handleVerifyTelegramCode} className="space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between p-3 bg-muted/60 rounded-xl text-xs">
                      <div><span className="text-muted-foreground">Gửi OTP đến: </span><strong className="font-mono text-foreground">{telePhone}</strong></div>
                      <button type="button" onClick={() => setTelegramStep('phone')} className="flex items-center gap-1 text-primary hover:underline text-xs font-medium cursor-pointer">
                        <ArrowLeft className="w-3 h-3" /> Đổi số
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Mã xác nhận OTP (Telegram gửi về máy Sếp)</label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          autoFocus
                          value={teleOtp}
                          onChange={(e) => setTeleOtp(e.target.value)}
                          placeholder="Ví dụ: 12345"
                          className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl bg-background text-foreground text-base tracking-widest font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    {(needsTwoFactor || tele2FA) && (
                      <div className="animate-in fade-in space-y-1">
                        <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400">🔒 Mật khẩu 2FA (Cloud Password)</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="password"
                            value={tele2FA}
                            onChange={(e) => setTele2FA(e.target.value)}
                            placeholder="Nhập mật khẩu 2FA..."
                            className="w-full pl-9 pr-3 py-2 border border-amber-300 rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Không nhận được mã?</span>
                      {countdown > 0 ? <span>Gửi lại sau {countdown}s</span> : (
                        <button type="button" onClick={handleSendTelegramCode} className="text-primary hover:underline font-medium cursor-pointer">Gửi lại OTP</button>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setTelegramStep('phone')} className="px-4 py-2 text-xs font-medium border border-border rounded-xl hover:bg-muted text-muted-foreground cursor-pointer">Quay lại</button>
                      <button type="submit" disabled={isLoading || !teleOtp.trim()} className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-md cursor-pointer disabled:opacity-50">
                        {isLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang xác thực...</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Xác nhận Đăng nhập</>}
                      </button>
                    </div>
                  </form>
                )}

                {telegramStep === 'success' && telegramUser && (
                  <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
                    <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <UserCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-foreground">Đã kết nối Telegram thành công!</h4>
                      <p className="text-xs text-muted-foreground mt-1">Tài khoản đã sẵn sàng đồng bộ tin nhắn về trang Hộp thư.</p>
                    </div>
                    <button type="button" onClick={onClose} className="w-full py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-md hover:bg-primary/95 cursor-pointer">Hoàn tất & Đóng</button>
                  </div>
                )}
              </div>
            )}

            {/* Telegram Bot Token Mode */}
            {telegramMode === 'bot' && (
              <form onSubmit={handleStandardSubmit} className="space-y-3">
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Tên hiển thị Bot</label><input type="text" required value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="Ví dụ: Bot CSKH" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs" /></div>
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Username Bot</label><input type="text" required value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="@my_bot" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs" /></div>
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Bot Token</label><input type="password" required value={token} onChange={(e) => setToken(e.target.value)} placeholder="123456:ABC-DEF" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs" /></div>
                <div className="flex justify-end gap-2 pt-3"><button type="button" onClick={onClose} className="px-4 py-2 text-xs border border-border rounded-lg text-muted-foreground cursor-pointer">Hủy</button><button type="submit" className="px-4 py-2 text-xs bg-primary text-primary-foreground font-semibold rounded-lg cursor-pointer">Kết nối Bot</button></div>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. WHATSAPP TAB (QR CODE HOẶC PAIRING CODE) */}
        {/* ======================================================== */}
        {platform === 'whatsapp' && (
          <div className="mt-4 space-y-4">
            <div className="flex p-1 bg-muted rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setWaMode('qr')}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center cursor-pointer ${
                  waMode === 'qr' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ⭐ Quét mã QR
              </button>
              <button
                type="button"
                onClick={() => { setWaMode('phone'); setWaStep('phone'); }}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center cursor-pointer ${
                  waMode === 'phone' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Mã liên kết (SĐT)
              </button>
            </div>

            {/* WhatsApp QR Mode */}
            {waMode === 'qr' && (
              <div className="space-y-4">
                {waQrStatus === 'completed' ? (
                  <div className="py-6 text-center space-y-4 animate-in zoom-in-95">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <UserCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold">Đã kết nối WhatsApp thành công!</h4>
                      <p className="text-xs text-muted-foreground mt-1">Tài khoản WhatsApp: <strong>{waQrUser?.name || 'WhatsApp Sếp'}</strong> đã được liên kết.</p>
                    </div>
                    <button type="button" onClick={onClose} className="w-full py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl cursor-pointer">Hoàn tất & Đóng</button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    {waQrImage ? (
                      <>
                        <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 text-left animate-in fade-in space-y-1">
                          <strong>📱 Hướng dẫn quét trên điện thoại:</strong>
                          <p>Mở <strong>WhatsApp</strong> ➡️ <strong>Cài đặt (Settings)</strong> ➡️ <strong>Thiết bị liên kết (Linked Devices)</strong> ➡️ <strong>Liên kết thiết bị</strong> và quét mã bên dưới:</p>
                        </div>

                        <div className="flex flex-col items-center justify-center p-4 bg-muted/40 rounded-2xl border border-border min-h-[220px]">
                          <img 
                            src={waQrImage} 
                            alt="Mã QR WhatsApp" 
                            className="w-48 h-48 mx-auto rounded-xl shadow-md border-2 border-emerald-400/30 bg-white p-2"
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" /> Đang chờ quét từ app WhatsApp...
                          </span>
                          <button 
                            type="button" 
                            onClick={handleGenerateWaQR} 
                            disabled={isLoading}
                            className="text-primary hover:underline cursor-pointer disabled:opacity-50"
                          >
                            {isLoading ? 'Đang tạo lại...' : 'Làm mới mã QR'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-2xl border border-dashed border-border min-h-[240px] space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <QrCode className="w-8 h-8" />
                        </div>
                        <div className="max-w-xs space-y-1">
                          <h4 className="text-sm font-semibold text-foreground">Đăng nhập WhatsApp bằng mã QR</h4>
                          <p className="text-xs text-muted-foreground">
                            Bấm nút bên dưới khi đã mở sẵn ứng dụng WhatsApp trên điện thoại để quét mã liên kết.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleGenerateWaQR}
                          disabled={isLoading}
                          className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                        >
                          {isLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Đang khởi tạo mã QR WhatsApp...</span>
                            </>
                          ) : (
                            <>
                              <QrCode className="w-4 h-4" />
                              <span>Ấn để tạo mã QR</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* WhatsApp Phone Pairing Mode */}
            {waMode === 'phone' && (
              <div>
                {waStep === 'phone' && (
                  <form onSubmit={handleRequestWaPairing} className="space-y-4">
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                      📱 <strong>Liên kết bằng Số điện thoại:</strong> Nhập SĐT WhatsApp của Sếp để nhận mã số liên kết 8 ký tự.
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Số điện thoại WhatsApp (kèm mã quốc gia +84)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          value={waPhone}
                          onChange={(e) => setWaPhone(e.target.value)}
                          placeholder="+84912345678"
                          className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={onClose} className="px-4 py-2 text-xs border border-border rounded-xl text-muted-foreground cursor-pointer">Hủy</button>
                      <button type="submit" disabled={isLoading || !waPhone.trim()} className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-md cursor-pointer disabled:opacity-50">
                        {isLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang tạo mã...</> : <><Smartphone className="w-3.5 h-3.5" /> Lấy mã liên kết 8 ký tự</>}
                      </button>
                    </div>
                  </form>
                )}

                {waStep === 'pairing_code' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="text-center p-4 bg-muted/60 rounded-2xl border border-border">
                      <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Mã liên kết WhatsApp của Sếp:</span>
                      <div className="flex items-center justify-center gap-3 mt-2">
                        <span className="text-2xl md:text-3xl font-extrabold tracking-widest font-mono text-emerald-600 dark:text-emerald-400 bg-card px-4 py-2 rounded-xl border border-border shadow-sm">
                          {pairingCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(pairingCode)}
                          className="p-2.5 bg-card hover:bg-muted border border-border rounded-xl text-muted-foreground transition-all cursor-pointer"
                          title="Sao chép mã"
                        >
                          {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs space-y-1.5 text-amber-900 dark:text-amber-300">
                      <strong className="block font-semibold">👉 Hướng dẫn Sếp nhập mã trên điện thoại:</strong>
                      <p>1. Mở <strong>WhatsApp</strong> ➡️ <strong>Cài đặt (Settings)</strong> ➡️ <strong>Thiết bị liên kết (Linked Devices)</strong>.</p>
                      <p>2. Bấm <strong>Liên kết thiết bị</strong> ➡️ Chọn <strong>"Liên kết bằng số điện thoại" (Link with phone number instead)</strong>.</p>
                      <p>3. Nhập mã <strong>{pairingCode}</strong> vào điện thoại để hoàn tất kết nối.</p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                        Đang đợi Sếp xác nhận trên điện thoại...
                      </span>
                      <button type="button" onClick={() => setWaStep('phone')} className="text-primary hover:underline cursor-pointer">Nhập lại SĐT</button>
                    </div>
                  </div>
                )}

                {waStep === 'success' && (
                  <div className="py-6 text-center space-y-4 animate-in zoom-in-95">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold">Đã kết nối WhatsApp thành công!</h4>
                      <p className="text-xs text-muted-foreground mt-1">Phiên làm việc WhatsApp đã được lưu vào hệ thống.</p>
                    </div>
                    <button type="button" onClick={onClose} className="w-full py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-md cursor-pointer">Hoàn tất & Đóng</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. ZALO TAB (QUÉT QR CÁ NHÂN HOẶC ZALO OA) */}
        {/* ======================================================== */}
        {platform === 'zalo' && (
          <div className="mt-4 space-y-4">
            <div className="flex p-1 bg-muted rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setZaloMode('qr')}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center cursor-pointer ${
                  zaloMode === 'qr' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ⭐ Quét mã QR Cá nhân
              </button>
              <button
                type="button"
                onClick={() => setZaloMode('oa')}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center cursor-pointer ${
                  zaloMode === 'oa' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Zalo OA (Doanh nghiệp)
              </button>
            </div>

            {zaloMode === 'qr' && (
              <div className="p-2.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>Vì sao Zalo Cá nhân cần quét QR?</strong> Zalo bảo vệ tài khoản cá nhân nghiêm ngặt (chống hack qua SĐT/mật khẩu bên thứ ba). Quét mã QR là phương thức an toàn, chính thức để xác thực 1 chạm từ điện thoại mà không cần nhập mật khẩu.
                </span>
              </div>
            )}

            {zaloMode === 'qr' ? (
              <div className="space-y-4">
                {zaloStatus === 'completed' ? (
                  <div className="py-6 text-center space-y-4 animate-in zoom-in-95">
                    <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                      <UserCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold">Đã kết nối Zalo thành công!</h4>
                      <p className="text-xs text-muted-foreground mt-1">Tài khoản Zalo: <strong>{zaloUser?.name || 'Zalo Sếp'}</strong> đã được liên kết.</p>
                    </div>
                    <button type="button" onClick={onClose} className="w-full py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl cursor-pointer">Hoàn tất & Đóng</button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    {zaloQrImage ? (
                      <>
                        <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-xl text-xs text-blue-800 dark:text-blue-300 text-left animate-in fade-in">
                          💡 Nhờ Sếp mở ứng dụng <strong>Zalo trên điện thoại ➡️ Bấm biểu tượng Quét mã QR</strong> ở góc trên bên phải để quét mã bên dưới:
                        </div>

                        <div className="flex flex-col items-center justify-center p-4 bg-muted/40 rounded-2xl border border-border min-h-[220px]">
                          <div className="space-y-2">
                            <img 
                              src={zaloQrImage.startsWith('data:') ? zaloQrImage : `data:image/png;base64,${zaloQrImage}`} 
                              alt="Mã QR Zalo" 
                              className="w-48 h-48 mx-auto rounded-xl shadow-md border-2 border-primary/20 bg-white p-2"
                            />
                            {zaloStatus === 'scanned' && (
                              <p className="text-xs font-semibold text-emerald-600 animate-pulse">
                                ✅ Sếp đã quét mã! Vui lòng bấm "Đồng ý" trên điện thoại...
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin text-primary" /> Đang chờ quét...
                          </span>
                          <button 
                            type="button" 
                            onClick={handleGenerateZaloQR} 
                            disabled={isLoading}
                            className="text-primary hover:underline cursor-pointer disabled:opacity-50"
                          >
                            {isLoading ? 'Đang tạo lại...' : 'Làm mới mã QR'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-2xl border border-dashed border-border min-h-[240px] space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <QrCode className="w-8 h-8" />
                        </div>
                        <div className="max-w-xs space-y-1">
                          <h4 className="text-sm font-semibold text-foreground">Đăng nhập Zalo bằng mã QR</h4>
                          <p className="text-xs text-muted-foreground">
                            Bấm nút bên dưới khi đã mở sẵn ứng dụng Zalo trên điện thoại để tạo mã quét trực tiếp.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleGenerateZaloQR}
                          disabled={isLoading}
                          className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                        >
                          {isLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Đang khởi tạo mã QR...</span>
                            </>
                          ) : (
                            <>
                              <QrCode className="w-4 h-4" />
                              <span>Ấn để tạo mã QR</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleStandardSubmit} className="space-y-3">
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Tên Zalo OA</label><input type="text" required value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="Ví dụ: Zalo CSKH Doanh Nghiệp" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs" /></div>
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">OA ID (hoặc SĐT)</label><input type="text" required value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="Ví dụ: 1049281039829" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs" /></div>
                <div><label className="block text-xs font-semibold text-muted-foreground mb-1">Access Token / Secret</label><input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="••••••••••••" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs" /></div>
                <div className="flex justify-end gap-2 pt-3"><button type="button" onClick={onClose} className="px-4 py-2 text-xs border border-border rounded-lg text-muted-foreground cursor-pointer">Hủy</button><button type="submit" className="px-4 py-2 text-xs bg-primary text-primary-foreground font-semibold rounded-lg cursor-pointer">Kết nối OA</button></div>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. FACEBOOK TAB (1-CLICK OAUTH & QUÉT DANH SÁCH FANPAGE) */}
        {/* ======================================================== */}
        {platform === 'facebook' && (
          <div className="mt-4 space-y-4">
            <div className="flex p-1 bg-muted rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setFbMode('login')}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center cursor-pointer ${
                  fbMode === 'login' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ⭐ Đăng nhập Facebook (Popup)
              </button>
              <button
                type="button"
                onClick={() => setFbMode('manual')}
                className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center cursor-pointer ${
                  fbMode === 'manual' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Nhập Token thủ công
              </button>
            </div>

            {/* Facebook Account Login Mode */}
            {fbMode === 'login' && (
              <div>
                {/* Stage 1: Big 1-Click Facebook Login */}
                {fbStep === 'initial' && (
                  <div className="text-center space-y-4 py-3 animate-in fade-in">
                    <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl space-y-2.5 text-left">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold text-xs">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>Đồng bộ tin nhắn Fanpage tự động</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Chỉ cần bấm nút bên dưới để đăng nhập tài khoản Facebook. Hệ thống sẽ <strong>tự động quét và liên kết Fanpage</strong> để nhận & gửi tin nhắn khách hàng trực tiếp trên Web.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenFacebookPopup}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-[#1877F2] hover:bg-[#166fe5] active:bg-[#1465cf] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all scale-100 hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Đang tải danh sách Fanpage từ Facebook...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          <span>Đăng nhập bằng Facebook</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Cửa sổ đăng nhập bảo mật theo tiêu chuẩn Meta</span>
                    </div>
                  </div>
                )}

                {/* Stage 2: Page Selection Checklist */}
                {fbStep === 'selecting' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">
                          Tìm thấy {fbDiscoveredPages.length} Fanpage bạn quản lý:
                        </h4>
                        <p className="text-[11px] text-muted-foreground">Tích chọn các Fanpage bạn muốn đồng bộ tin nhắn về Web</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                      >
                        {selectedPageIds.length === fbDiscoveredPages.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                      {fbDiscoveredPages.map((page) => {
                        const isSelected = selectedPageIds.includes(page.id);
                        return (
                          <div
                            key={page.id}
                            onClick={() => handleToggleSelectPage(page.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                              isSelected
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs'
                                : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent div
                              className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
                            />
                            
                            <img
                              src={page.avatarUrl}
                              alt={page.name}
                              className="w-9 h-9 rounded-lg object-cover border border-border shrink-0 bg-white"
                            />

                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold text-foreground truncate">{page.name}</h5>
                              <p className="text-[10px] text-muted-foreground truncate">{page.category}</p>
                              <span className="text-[9px] font-mono text-muted-foreground/80">ID: {page.id}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setFbStep('initial')}
                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3 h-3" /> Đổi tài khoản
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmConnectPages}
                        disabled={isLoading || selectedPageIds.length === 0}
                        className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/95 transition-all shadow-md shadow-primary/20 cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang liên kết...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Kết nối {selectedPageIds.length} Fanpage đã chọn</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Stage 3: Success State */}
                {fbStep === 'success' && (
                  <div className="py-6 text-center space-y-4 animate-in zoom-in-95">
                    <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-foreground">Đã kết nối {connectedCount} Fanpage thành công!</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Hệ thống đã bắt đầu đồng bộ tin nhắn từ các Fanpage về trang Hộp thư trung tâm.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-md hover:bg-primary/95 cursor-pointer"
                    >
                      Hoàn tất & Đóng
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Facebook Manual Token Mode (For Developers) */}
            {fbMode === 'manual' && (
              <form onSubmit={handleStandardSubmit} className="space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Tên hiển thị Fanpage</label>
                  <input 
                    type="text" 
                    required 
                    value={channelName} 
                    onChange={(e) => setChannelName(e.target.value)} 
                    placeholder="Ví dụ: Fanpage Quần Áo Terax" 
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs focus:ring-2 focus:ring-primary" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Facebook Page ID</label>
                  <input 
                    type="text" 
                    required 
                    value={externalId} 
                    onChange={(e) => setExternalId(e.target.value)} 
                    placeholder="Ví dụ: 1294794130375995" 
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs font-mono focus:ring-2 focus:ring-primary" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Page Access Token</label>
                  <input 
                    type="password" 
                    value={token} 
                    onChange={(e) => setToken(e.target.value)} 
                    placeholder="EAAB••••••••" 
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-xs font-mono focus:ring-2 focus:ring-primary" 
                  />
                </div>
                <div className="flex items-start gap-2 p-2.5 bg-muted rounded-xl text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[11px]">Dành cho Quản trị viên muốn kết nối thủ công qua Access Token vĩnh viễn.</p>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button type="button" onClick={onClose} className="px-4 py-2 text-xs border border-border rounded-lg text-muted-foreground cursor-pointer">
                    Hủy
                  </button>
                  <button type="submit" disabled={isLoading} className="px-4 py-2 text-xs bg-primary text-primary-foreground font-semibold rounded-lg shadow-md cursor-pointer">
                    {isLoading ? 'Đang kết nối...' : 'Xác nhận kết nối Fanpage'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
