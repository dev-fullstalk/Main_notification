'use client';

import React, { useEffect } from 'react';

export default function FacebookOAuthCallback() {
  useEffect(() => {
    // Parse access_token from hash: #access_token=...&expires_in=...
    const hash = window.location.hash;
    const search = window.location.search;
    
    let token = '';
    if (hash && hash.includes('access_token=')) {
      const match = hash.match(/access_token=([^&]+)/);
      if (match) token = match[1];
    } else if (search && search.includes('code=')) {
      const match = search.match(/code=([^&]+)/);
      if (match) token = match[1];
    }

    if (token && window.opener) {
      window.opener.postMessage({ type: 'FB_OAUTH_TOKEN', token }, window.location.origin);
      window.close();
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-6">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-sm font-semibold text-slate-800">Đang xác thực tài khoản Facebook...</h3>
        <p className="text-xs text-slate-500">Cửa sổ sẽ tự động đóng khi hoàn tất.</p>
      </div>
    </div>
  );
}
