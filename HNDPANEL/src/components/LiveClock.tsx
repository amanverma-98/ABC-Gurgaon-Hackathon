'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface LiveClockProps {
  className?: string;
  showIcon?: boolean;
  variant?: 'light' | 'dark';
}

export const LiveClock: React.FC<LiveClockProps> = ({
  className = '',
  showIcon = true,
  variant = 'light',
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const updateClock = () => {
      const now = new Date();
      // Format: 03:45:12 PM
      const formattedTime = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      // Format: Fri, 18 Sep 2026
      const formattedDate = now.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      setTimeStr(formattedTime);
      setDateStr(formattedDate);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const isLight = variant === 'light';

  if (!isMounted) {
    return (
      <div className={`hidden sm:flex flex-col items-end justify-center px-2.5 py-1 rounded-xl ${isLight ? 'bg-[#f0f9f8] border border-[#cfe3e1]' : 'bg-[#033030]/80 border border-[#0d6e6e]/60'} min-w-[120px] ${className}`}>
        <div className={`h-3.5 w-16 ${isLight ? 'bg-teal-100' : 'bg-[#043b3b]'} animate-pulse rounded`} />
        <div className={`h-2.5 w-20 ${isLight ? 'bg-teal-50' : 'bg-[#043b3b]'} animate-pulse rounded mt-1`} />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1 rounded-xl shadow-xs select-none ${
        isLight
          ? 'bg-[#f0f9f8] border border-[#cfe3e1] text-slate-800'
          : 'bg-[#033030]/90 border border-[#0d6e6e] text-white'
      } ${className}`}
      title="Current Hospital System Date & Time"
    >
      {showIcon && (
        <Clock
          className={`w-3.5 h-3.5 shrink-0 hidden md:block ${
            isLight ? 'text-teal-700' : 'text-teal-300'
          }`}
        />
      )}
      <div className="flex flex-col items-end justify-center leading-none">
        {/* Big Time */}
        <span
          className={`text-xs sm:text-sm font-bold font-mono tracking-wide leading-none ${
            isLight ? 'text-[#12383b]' : 'text-white'
          }`}
        >
          {timeStr}
        </span>
        {/* Today's Date & Day */}
        <span
          className={`text-[10px] font-semibold tracking-normal mt-0.5 leading-none ${
            isLight ? 'text-[#4a6f70]' : 'text-[#99f6e4]/85'
          }`}
        >
          {dateStr}
        </span>
      </div>
    </div>
  );
};

export default LiveClock;
