import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin', 'vietnamese'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TX Omnichannel Central Inbox - Trung tâm quản trị tin nhắn đa nền tảng',
  description: 'Hệ thống quản lý tin nhắn đa kênh (Facebook, Zalo, Telegram, WhatsApp) tập trung.',
};

import SyncAutoStarter from '@/components/common/SyncAutoStarter';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${roboto.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SyncAutoStarter />
        {children}
      </body>
    </html>
  );
}
