'use client';

import React from 'react';

interface MobileThumbBarProps {
  children: React.ReactNode;
  className?: string;
}

export default function MobileThumbBar({ children, className = '' }: MobileThumbBarProps) {
  return (
    <div
      className={`sticky bottom-0 -mx-3 sm:mx-0 p-3 sm:p-0 bg-white/95 dark:bg-[#090E17]/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-slate-200/80 dark:border-slate-800/80 sm:border-0 shadow-glass sm:shadow-none z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-0 ${className}`}
    >
      {children}
    </div>
  );
}
