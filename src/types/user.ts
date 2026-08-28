export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'agent';
  avatarUrl?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
