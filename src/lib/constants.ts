export const PLATFORMS = {
  zalo: {
    id: 'zalo',
    name: 'Zalo',
    color: 'bg-sky-500 dark:bg-sky-400',
    textColor: 'text-sky-500 dark:text-sky-400',
    borderColor: 'border-sky-500 dark:border-sky-400',
    iconColor: '#0068FF',
    avatarUrl: 'https://img.icons8.com/color/512/zalo.png',
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    color: 'bg-sky-600 dark:bg-sky-500',
    textColor: 'text-sky-600 dark:text-sky-400',
    borderColor: 'border-sky-600 dark:border-sky-500',
    iconColor: '#229ED9',
    avatarUrl: 'https://img.icons8.com/color/512/telegram-app.png',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    color: 'bg-blue-600 dark:bg-blue-500',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-600 dark:border-blue-500',
    iconColor: '#1877F2',
    avatarUrl: 'https://img.icons8.com/color/512/facebook-new.png',
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    color: 'bg-emerald-600 dark:bg-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-600 dark:border-emerald-500',
    iconColor: '#25D366',
    avatarUrl: 'https://img.icons8.com/color/512/whatsapp--v1.png',
  },
  livechat: {
    id: 'livechat',
    name: 'Live Chat Website',
    color: 'bg-teal-600 dark:bg-teal-500',
    textColor: 'text-teal-600 dark:text-teal-400',
    borderColor: 'border-teal-600 dark:border-teal-500',
    iconColor: '#10B981',
    avatarUrl: 'https://img.icons8.com/color/512/chat.png',
  },
} as const;

export const CONVERSATION_STATUSES = {
  open: {
    id: 'open',
    name: 'Đang mở',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    dotColor: 'bg-emerald-500',
  },
  pending: {
    id: 'pending',
    name: 'Đang xử lý',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    dotColor: 'bg-amber-500',
  },
  resolved: {
    id: 'resolved',
    name: 'Đã xử lý',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    dotColor: 'bg-blue-500',
  },
  closed: {
    id: 'closed',
    name: 'Đã đóng',
    color: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400',
    dotColor: 'bg-neutral-500',
  },
} as const;
