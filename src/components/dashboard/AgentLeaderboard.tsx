'use client';

import React from 'react';
import { useChatStore } from '../../store/useChatStore';

export default function AgentLeaderboard() {
  const leaderboard = useChatStore((state) => state.dashboardStats.agentLeaderboard);

  // Compute total baseline messages for percentage calculations
  const maxMessages = Math.max(...leaderboard.map(a => a.messagesSent), 1);

  return (
    <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-sm leading-none">Bảng xếp hạng Agent hiệu suất</h4>
        <span className="text-[10px] text-muted-foreground font-medium">Báo cáo năng suất nhân sự trực chat</span>
      </div>

      {/* Leaderboard Table */}
      <div className="flex-grow overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
              <th className="pb-3 text-center w-12">Hạng</th>
              <th className="pb-3 pl-2">Agent</th>
              <th className="pb-3 text-center w-28">Đơn hỗ trợ</th>
              <th className="pb-3 text-right pr-2 w-28">Số tin gửi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 text-xs">
            {leaderboard.map((agent, index) => {
              const rank = index + 1;
              const performancePercent = Math.round((agent.messagesSent / maxMessages) * 100);
              
              // Seed matching Dicebear seeds defined in mock users
              const dicebearSeed = 
                agent.name.includes('Hùng') ? 'hung' :
                agent.name.includes('Lan') ? 'lan' :
                agent.name.includes('Đức') ? 'duc' : 'son';

              return (
                <tr key={agent.id} className="hover:bg-muted/30 transition-colors">
                  {/* Rank Badge */}
                  <td className="py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-5.5 h-5.5 rounded-full font-bold text-[10px] ${
                      rank === 1 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
                      rank === 2 ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400' :
                      rank === 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400' :
                      'text-muted-foreground'
                    }`}>
                      {rank}
                    </span>
                  </td>

                  {/* Agent Profile info */}
                  <td className="py-3 pl-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${dicebearSeed}`}
                        alt={agent.name}
                        className="w-7 h-7 rounded-full border border-border bg-white"
                      />
                      <div>
                        <p className="font-semibold">{agent.name}</p>
                        <div className="w-24 mt-1 bg-border rounded-full h-1 overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full transition-all duration-500" 
                            style={{ width: `${performancePercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Chats Handled */}
                  <td className="py-3 text-center font-medium">
                    {agent.chatsHandled} khách
                  </td>

                  {/* Messages Sent count */}
                  <td className="py-3 text-right pr-2 font-bold text-primary">
                    {agent.messagesSent} tin
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
