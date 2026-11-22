'use client';

import React from 'react';
import { RomanItem } from '@/lib/mathUtils';
import MathText from '@/components/MathText';

interface RomanChoicesGridProps {
  items: RomanItem[];
  className?: string;
}

export default function RomanChoicesGrid({
  items,
  className = '',
}: RomanChoicesGridProps) {
  if (!items || items.length === 0) return null;

  return (
    <div
      className={`rounded-2xl border border-indigo-200/90 dark:border-indigo-500/25 bg-indigo-50/70 dark:bg-slate-900/50 p-3.5 sm:p-4 my-3.5 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-indigo-500/15">
        <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Các biểu thức / mệnh đề lựa chọn:
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 transition-colors hover:border-indigo-400/50"
          >
            <span className="shrink-0 px-2 py-0.5 rounded-md text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-300/60 dark:border-indigo-500/30 shadow-xs">
              ({item.numeral})
            </span>
            <div className="font-reading text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed overflow-x-auto min-w-0 flex-1">
              <MathText content={item.content} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
