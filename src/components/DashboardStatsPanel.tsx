'use client';

import { useState, useEffect } from 'react';

// StatItem with label in top left, padding, and uppercase
const StatItem = ({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string | number;
  icon: string;
  valueColor?: string;
}) => (
  <div className="flex flex-col min-w-30 justify-center px-6 py-3 h-full border-r border-gray-700 first:border-l relative">
    <p className="absolute top-2 left-4 text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
    <div className="flex flex-row items-center mt-5">
      <p className={`text-base font-bold ${valueColor || 'text-white'}`}>{value}</p>
    </div>
  </div>
);

// Compact, real-time sparkline chart component
const generateSparklineData = () => Array.from({ length: 40 }, () => 5 + Math.random() * 10);

const SparklineChart = ({ data }: { data: number[] }) => {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data);
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - (d / max) * 90;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <defs>
                <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                </linearGradient>
            </defs>
            <polyline
                points={points}
                fill="none"
                stroke="rgba(59, 130, 246, 0.8)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <polygon
                points={`0,100 ${points} 100,100`}
                fill="url(#sparklineGradient)"
            />
        </svg>
    );
};

export default function DashboardStatsPanel({ className }: { className?: string }) {
  const [isLive, setIsLive] = useState(true);
  const [stats, setStats] = useState({
    totalRegions: 12,
    activeAlerts: 1,
    activeJobs: 3,
    lastUpdate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  });
  const [sparklineData, setSparklineData] = useState(generateSparklineData());

  // Mock live stats updates
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        activeAlerts: Math.random() > 0.95 ? Math.floor(Math.random() * 5) : prev.activeAlerts,
        activeJobs: Math.random() > 0.8 ? Math.floor(Math.random() * 5) : prev.activeJobs,
        lastUpdate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Mock live sparkline updates
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
        setSparklineData(prev => [...prev.slice(1), 5 + Math.random() * 10]);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  return (
    <div className={`bg-[#232f3e] border-b border-black/50 px-4 h-[60px] flex items-center justify-between text-white shadow-md ${className}`}>
      <div className="flex items-center h-full">
        <h1 className="text-lg font-bold text-white pr-6">Forest Shield</h1>
        <div className="flex h-full">
            <StatItem label="System Status" value="Healthy" icon="✅" valueColor="text-green-400" />
            <StatItem label="Regions" value={stats.totalRegions} icon="🌍" />
            <StatItem 
              label="Active Alerts" 
              value={stats.activeAlerts} 
              icon="⚠️"
              valueColor={stats.activeAlerts > 0 ? "text-yellow-400" : "text-green-400"}
            />
            <StatItem label="Active Jobs" value={stats.activeJobs} icon="⚙️" />
        </div>
      </div>
      
      <div className="flex items-center gap-4 h-full">
        <div className="flex flex-col items-end pr-4 border-r border-gray-700 h-full justify-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider top-2 relative">Analysis Activity</p>
            <div className="w-32 h-8 mt-1">
                <SparklineChart data={sparklineData} />
            </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
           <span className="text-gray-400">Last Sync:</span>
           <span className="font-mono text-sm">{stats.lastUpdate}</span>
        </div>
        <div 
          onClick={() => setIsLive(!isLive)}
          className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-white/10 transition-colors"
        >
          <div className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs font-semibold uppercase tracking-wider">{isLive ? 'Live' : 'Paused'}</span>
        </div>
      </div>
    </div>
  );
} 