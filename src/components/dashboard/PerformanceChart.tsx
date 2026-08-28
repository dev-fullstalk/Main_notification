'use client';

import React from 'react';
import { useChatStore } from '../../store/useChatStore';

export default function PerformanceChart() {
  const hourlyData = useChatStore((state) => state.dashboardStats.hourlyData);

  // Compute SVG dimensions and points
  const width = 600;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;
  
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  
  const maxVal = 400; // Fixed peak for scale bounds

  // Map values to coordinates
  const points = hourlyData.map((item, index) => {
    const x = paddingX + (index / (hourlyData.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - (item.volume / maxVal) * chartHeight;
    return { x, y, label: item.hour, val: item.volume };
  });

  // Build SVG Path strings
  const linePath = points.length > 0 
    ? points.reduce((path, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`, '')
    : '';

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  return (
    <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-sm leading-none">Lưu lượng tin nhắn theo giờ</h4>
        <span className="text-[10px] text-muted-foreground font-medium">Khung giờ hoạt động cao điểm</span>
      </div>

      {/* SVG Container */}
      <div className="flex-1 w-full relative min-h-[220px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Area Gradient Defs */}
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map((i) => {
            const y = paddingY + (i / 4) * chartHeight;
            const gridVal = Math.round(maxVal - (i / 4) * maxVal);
            return (
              <g key={i} className="opacity-40">
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px] font-sans font-medium"
                >
                  {gridVal}
                </text>
              </g>
            );
          })}

          {/* Fill Area */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#chartGradient)"
            />
          )}

          {/* Area Stroke Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover points & labels */}
          {points.map((p, i) => (
            <g key={i} className="group">
              {/* Outer circular glow */}
              <circle
                cx={p.x}
                cy={p.y}
                r="6"
                className="fill-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              {/* Core circular point */}
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                className="fill-primary stroke-card stroke-2 shadow-sm"
              />

              {/* Data label overlay tooltip */}
              <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <rect
                  x={p.x - 24}
                  y={p.y - 30}
                  width="48"
                  height="20"
                  rx="6"
                  className="fill-neutral-900 dark:fill-neutral-800 text-neutral-100"
                />
                <text
                  x={p.x}
                  y={p.y - 17}
                  textAnchor="middle"
                  className="fill-white text-[9px] font-bold"
                >
                  {p.val} tin
                </text>
              </g>

              {/* X Axis Labels */}
              <text
                x={p.x}
                y={height - paddingY + 18}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px] font-sans font-medium"
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
