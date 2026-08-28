import { User } from '../types/user';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Bùi Việt Hùng',
    email: 'hung.buiviet@terax.vn',
    role: 'agent',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=hung',
    isActive: true,
  },
  {
    id: '2',
    name: 'Nguyễn Thị Lan',
    email: 'lan.nguyen@terax.vn',
    role: 'agent',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=lan',
    isActive: true,
  },
  {
    id: '3',
    name: 'Trần Minh Đức',
    email: 'duc.tran@terax.vn',
    role: 'supervisor',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=duc',
    isActive: true,
  },
  {
    id: '4',
    name: 'Phạm Hồng Sơn',
    email: 'son.pham@terax.vn',
    role: 'admin',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=son',
    isActive: true,
  }
];

export const currentUser = mockUsers[0]; // Bùi Việt Hùng is the logged-in user
