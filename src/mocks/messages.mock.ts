import { Message } from '../types/message';

export const mockMessages: Message[] = [
  // Conversation 201 - Nguyễn Văn Hải (Facebook)
  {
    id: 'm1',
    conversationId: '201',
    senderType: 'customer',
    messageType: 'text',
    content: 'Chào shop, mình quan tâm đến mẫu Sneaker Pro bên bạn.',
    createdAt: '2026-08-28T18:30:00+07:00',
    status: 'read',
  },
  {
    id: 'm2',
    conversationId: '201',
    senderType: 'agent',
    senderUserId: '2', // Nguyễn Thị Lan
    messageType: 'text',
    content: 'Chào anh Hải ạ! Mẫu Sneaker Pro bên em đang là mẫu bán chạy nhất đấy ạ. Anh đang cần tìm màu và size nào ạ?',
    createdAt: '2026-08-28T18:32:00+07:00',
    status: 'read',
  },
  {
    id: 'm3',
    conversationId: '201',
    senderType: 'customer',
    messageType: 'image',
    content: 'Mẫu này nè shop, màu đen này đẹp ghê.',
    mediaUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&h=400&q=80',
    createdAt: '2026-08-28T18:35:00+07:00',
    status: 'read',
  },
  {
    id: 'm4',
    conversationId: '201',
    senderType: 'agent',
    senderUserId: '1', // Bùi Việt Hùng
    messageType: 'text',
    content: 'Dạ chính xác mẫu này rồi anh ơi! Phiên bản Sneaker Pro Black này bên em đi rất êm và tôn dáng. Hiện tại bên em đang có sẵn đủ size từ 39 đến 44 ạ.',
    createdAt: '2026-08-28T18:38:00+07:00',
    status: 'read',
  },
  {
    id: 'm5',
    conversationId: '201',
    senderType: 'customer',
    messageType: 'text',
    content: 'Shop còn size 42 màu đen của mẫu Sneaker Pro không ạ?',
    createdAt: '2026-08-28T18:40:00+07:00',
    status: 'delivered',
  },

  // Conversation 202 - Trần Thị Thu Trang (Facebook)
  {
    id: 'm10',
    conversationId: '202',
    senderType: 'customer',
    messageType: 'text',
    content: 'Chào bạn, mình vừa đặt đơn hàng online qua website nhưng chưa thấy ai liên hệ xác nhận.',
    createdAt: '2026-08-28T18:00:00+07:00',
    status: 'read',
  },
  {
    id: 'm11',
    conversationId: '202',
    senderType: 'agent',
    senderUserId: '2', // Nguyễn Thị Lan
    messageType: 'text',
    content: 'Chào chị Trang, em kiểm tra thấy đơn hàng giày nữ size 37 mã #10492 của chị đã được tạo thành công rồi ạ. Chị vui lòng hoàn tất thanh toán chuyển khoản qua STK ngân hàng dưới đây để bên em đóng gói đi đơn nhé ạ.',
    createdAt: '2026-08-28T18:05:00+07:00',
    status: 'read',
  },
  {
    id: 'm12',
    conversationId: '202',
    senderType: 'customer',
    messageType: 'text',
    content: 'Ok mình chuyển khoản liền đây.',
    createdAt: '2026-08-28T18:07:00+07:00',
    status: 'read',
  },
  {
    id: 'm13',
    conversationId: '202',
    senderType: 'customer',
    messageType: 'image',
    content: 'Mình đã gửi ảnh bill chuyển khoản rồi nhé, kiểm tra giúp mình.',
    mediaUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=400&h=400&q=80', // Dummy billing image
    createdAt: '2026-08-28T18:15:00+07:00',
    status: 'read',
  },

  // Conversation 203 - Lê Hoàng Nam (Zalo)
  {
    id: 'm20',
    conversationId: '203',
    senderType: 'customer',
    messageType: 'text',
    content: 'Shop ơi, đơn hàng giày thể thao chạy bộ của mình đặt hôm qua đã đi chưa vậy?',
    createdAt: '2026-08-28T18:25:00+07:00',
    status: 'read',
  },
  {
    id: 'm21',
    conversationId: '203',
    senderType: 'agent',
    senderUserId: '1', // Bùi Việt Hùng
    messageType: 'text',
    content: 'Dạ chào anh Nam, đơn hàng của anh đã được bên em đóng gói và bàn giao cho đơn vị vận chuyển GHTK từ sáng nay rồi ạ. Mã vận đơn của anh là: GHTK882200119. Dự kiến khoảng 1-2 ngày nữa anh sẽ nhận được hàng nhé ạ.',
    createdAt: '2026-08-28T18:30:00+07:00',
    status: 'read',
  },
  {
    id: 'm22',
    conversationId: '203',
    senderType: 'customer',
    messageType: 'text',
    content: 'Giao cho mình giờ hành chính ở 123 Nguyễn Trãi nhé. Vì là địa chỉ công ty.',
    createdAt: '2026-08-28T18:32:00+07:00',
    status: 'delivered',
  },

  // Conversation 204 - Phạm Minh Tuyết (Zalo)
  {
    id: 'm30',
    conversationId: '204',
    senderType: 'customer',
    messageType: 'text',
    content: 'Dạ shop ơi tư vấn size giúp em với.',
    createdAt: '2026-08-28T17:40:00+07:00',
    status: 'delivered',
  },
  {
    id: 'm31',
    conversationId: '204',
    senderType: 'customer',
    messageType: 'text',
    content: 'Tư vấn giúp em size giày cho nữ cao 1m60 nặng 50kg mang vừa size bao nhiêu ạ?',
    createdAt: '2026-08-28T17:45:00+07:00',
    status: 'delivered',
  },

  // Conversation 205 - Alex Nguyễn (Telegram)
  {
    id: 'm40',
    conversationId: '205',
    senderType: 'customer',
    messageType: 'text',
    content: 'Giày mình mua đi êm lắm shop.',
    createdAt: '2026-08-28T16:10:00+07:00',
    status: 'read',
  },
  {
    id: 'm41',
    conversationId: '205',
    senderType: 'agent',
    senderUserId: '1', // Bùi Việt Hùng
    messageType: 'text',
    content: 'Dạ em cảm ơn anh Alex đã dành thời gian phản hồi tốt cho sản phẩm của shop ạ! Chúc anh có những trải nghiệm tuyệt vời với đôi Sneaker Pro mới. Nếu cần hỗ trợ thêm cứ nhắn em nhé.',
    createdAt: '2026-08-28T16:15:00+07:00',
    status: 'read',
  },
  {
    id: 'm42',
    conversationId: '205',
    senderType: 'customer',
    messageType: 'text',
    content: 'Cảm ơn shop nhiều, giày đi rất êm và vừa chân nhé!',
    createdAt: '2026-08-28T16:20:00+07:00',
    status: 'read',
  },

  // Conversation 206 - Đặng Tuấn Anh (Telegram)
  {
    id: 'm50',
    conversationId: '206',
    senderType: 'customer',
    messageType: 'text',
    content: 'Mã giảm giá cho khách hàng mới sử dụng thế nào vậy admin?',
    createdAt: '2026-08-28T18:43:00+07:00',
    status: 'delivered',
  },

  // Conversation 207 - Mỹ Linh (TikTok)
  {
    id: 'm60',
    conversationId: '207',
    senderType: 'customer',
    messageType: 'text',
    content: 'Cho em hỏi mẫu này bao giờ thì về thêm hàng ạ?',
    createdAt: '2026-08-28T18:02:00+07:00',
    status: 'delivered',
  },

  // Conversation 208 - Hoàng Quốc Việt (TikTok)
  {
    id: 'm70',
    conversationId: '208',
    senderType: 'customer',
    messageType: 'text',
    content: 'Đã nhận được hàng, sản phẩm ok.',
    createdAt: '2026-08-28T15:10:00+07:00',
    status: 'read',
  }
];
export const mockDashboardStats = {
  todayInbound: 1420,
  todayOutbound: 1180,
  openConversations: 12,
  pendingConversations: 4,
  avgResponseTimeMin: 3.5,
  responseRate: 98.4,
  platformDistribution: {
    facebook: 45,
    zalo: 30,
    telegram: 15,
    tiktok: 10,
  },
  hourlyData: [
    { hour: '08:00', volume: 60 },
    { hour: '10:00', volume: 140 },
    { hour: '12:00', volume: 180 },
    { hour: '14:00', volume: 220 },
    { hour: '16:00', volume: 280 },
    { hour: '18:00', volume: 340 },
    { hour: '20:00', volume: 190 },
  ],
  agentLeaderboard: [
    { id: '1', name: 'Bùi Việt Hùng', avatar: 'hung', chatsHandled: 84, messagesSent: 342 },
    { id: '2', name: 'Nguyễn Thị Lan', avatar: 'lan', chatsHandled: 72, messagesSent: 290 },
    { id: '3', name: 'Trần Minh Đức', avatar: 'duc', chatsHandled: 45, messagesSent: 150 },
    { id: '4', name: 'Phạm Hồng Sơn', avatar: 'son', chatsHandled: 12, messagesSent: 35 },
  ],
};
