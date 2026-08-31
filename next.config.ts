import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@whiskeysockets/baileys',
    'telegram',
    'zca-js',
    'pg',
    'pino',
    'qrcode-terminal',
  ],
};

export default nextConfig;
