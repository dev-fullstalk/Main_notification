import { Contact } from '../types/contact';

export const mockContacts: Contact[] = [
  {
    id: '101',
    channelId: '1', // facebook
    externalUserId: 'fb-cust-1',
    name: 'Nguyễn Văn Hải',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hai',
    phone: '0912345678',
    email: 'vanhai.nguyen@gmail.com',
  },
  {
    id: '102',
    channelId: '1', // facebook
    externalUserId: 'fb-cust-2',
    name: 'Trần Thị Thu Trang',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=trang',
    phone: '0987654321',
    email: 'thutrang.tran@gmail.com',
  },
  {
    id: '103',
    channelId: '2', // zalo
    externalUserId: 'zalo-cust-1',
    name: 'Lê Hoàng Nam',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nam',
    phone: '0905556677',
    email: 'hoangnam.le@yahoo.com',
  },
  {
    id: '104',
    channelId: '2', // zalo
    externalUserId: 'zalo-cust-2',
    name: 'Phạm Minh Tuyết',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tuyet',
    phone: '0977888999',
    email: 'minhtuyet.pham@gmail.com',
  },
  {
    id: '105',
    channelId: '3', // telegram
    externalUserId: 'tele-cust-1',
    name: 'Alex Nguyễn',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    phone: '0334445556',
    email: 'alex.nguyen@outlook.com',
  },
  {
    id: '106',
    channelId: '3', // telegram
    externalUserId: 'tele-cust-2',
    name: 'Đặng Tuấn Anh',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=anh',
    phone: '0944332211',
    email: 'tuananh.dang@gmail.com',
  },
  {
    id: '107',
    channelId: '4', // tiktok
    externalUserId: 'tiktok-cust-1',
    name: 'Mỹ Linh (Linh Kute)',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=linh',
    phone: '0888999111',
    email: 'mylinh99@gmail.com',
  },
  {
    id: '108',
    channelId: '4', // tiktok
    externalUserId: 'tiktok-cust-2',
    name: 'Hoàng Quốc Việt',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=viet',
    phone: '0911223344',
    email: 'viet.hq@gmail.com',
  }
];
