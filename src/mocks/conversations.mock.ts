import { Conversation } from '../types/conversation';

export const mockConversations: Conversation[] = [
  {
    id: '201',
    channelId: '1', // facebook
    contactId: '101', // Nguyễn Văn Hải
    assignedUserId: '1', // Bùi Việt Hùng
    status: 'open',
    lastMessagePreview: 'Shop còn size 42 màu đen của mẫu Sneaker Pro không ạ?',
    lastMessageAt: '2026-08-28T18:40:00+07:00',
    unreadCount: 2,
  },
  {
    id: '202',
    channelId: '1', // facebook
    contactId: '102', // Trần Thị Thu Trang
    assignedUserId: '2', // Nguyễn Thị Lan
    status: 'pending',
    lastMessagePreview: 'Mình đã gửi ảnh bill chuyển khoản rồi nhé, kiểm tra giúp mình.',
    lastMessageAt: '2026-08-28T18:15:00+07:00',
    unreadCount: 0,
  },
  {
    id: '203',
    channelId: '2', // zalo
    contactId: '103', // Lê Hoàng Nam
    assignedUserId: '1', // Bùi Việt Hùng
    status: 'open',
    lastMessagePreview: 'Giao cho mình giờ hành chính ở 123 Nguyễn Trãi nhé.',
    lastMessageAt: '2026-08-28T18:32:00+07:00',
    unreadCount: 1,
  },
  {
    id: '204',
    channelId: '2', // zalo
    contactId: '104', // Phạm Minh Tuyết
    assignedUserId: null,
    status: 'open',
    lastMessagePreview: 'Tư vấn giúp em size giày cho nữ cao 1m60 nặng 50kg mang vừa size bao nhiêu ạ?',
    lastMessageAt: '2026-08-28T17:45:00+07:00',
    unreadCount: 3,
  },
  {
    id: '205',
    channelId: '3', // telegram
    contactId: '105', // Alex Nguyễn
    assignedUserId: '1', // Bùi Việt Hùng
    status: 'resolved',
    lastMessagePreview: 'Cảm ơn shop nhiều, giày đi rất êm và vừa chân nhé!',
    lastMessageAt: '2026-08-28T16:20:00+07:00',
    unreadCount: 0,
  },
  {
    id: '206',
    channelId: '3', // telegram
    contactId: '106', // Đặng Tuấn Anh
    assignedUserId: '3', // Trần Minh Đức
    status: 'open',
    lastMessagePreview: 'Mã giảm giá cho khách hàng mới sử dụng thế nào vậy admin?',
    lastMessageAt: '2026-08-28T18:43:00+07:00',
    unreadCount: 1,
  },
  {
    id: '207',
    channelId: '4', // tiktok
    contactId: '107', // Mỹ Linh
    assignedUserId: null,
    status: 'open',
    lastMessagePreview: 'Cho em hỏi mẫu này bao giờ thì về thêm hàng ạ?',
    lastMessageAt: '2026-08-28T18:02:00+07:00',
    unreadCount: 1,
  },
  {
    id: '208',
    channelId: '4', // tiktok
    contactId: '108', // Hoàng Quốc Việt
    assignedUserId: '2', // Nguyễn Thị Lan
    status: 'closed',
    lastMessagePreview: 'Đã nhận được hàng, sản phẩm ok.',
    lastMessageAt: '2026-08-28T15:10:00+07:00',
    unreadCount: 0,
  }
];
