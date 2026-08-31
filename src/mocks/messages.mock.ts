import { Message } from '../types/message';

export const mockMessages: Message[] = [];

export interface HourlyData {
  hour: string;
  volume: number;
  inbound: number;
  outbound: number;
}

export interface AgentLeaderboardItem {
  id: string;
  name: string;
  avatarUrl: string;
  chatsHandled: number;
  messagesSent: number;
  avgResponseMin: number;
  rating: number;
}

export const mockDashboardStats = {
  totalConversations: 0,
  unreadConversations: 0,
  openConversations: 0,
  resolvedConversations: 0,
  pendingConversations: 0,
  avgResponseTimeSeconds: 0,
  avgResponseTimeMin: 0,
  responseRate: 100,
  totalMessagesToday: 0,
  todayInbound: 0,
  todayOutbound: 0,
  hourlyData: [] as HourlyData[],
  agentLeaderboard: [] as AgentLeaderboardItem[],
};
