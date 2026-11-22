'use client';

import React from 'react';

export interface GpuProgressBarProps {
  percent: number;
  secondaryPercent?: number;
  minVisiblePercent?: number;
  trackClassName?: string;
  barClassName?: string;
  secondaryBarClassName?: string;
  title?: string;
  secondaryTitle?: string;
  className?: string;
}

function toRatio(pct: number, minVisible = 0): number {
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  const clamped = Math.min(100, Math.max(pct, minVisible));
  return Math.max(0, Math.min(1, clamped / 100));
}

/**
 * 100% GPU-composited progress bar using scaleX transforms instead of layout-reflowing width styles.
 */
export default function GpuProgressBar({
  percent,
  secondaryPercent,
  minVisiblePercent = 0,
  trackClassName = 'w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full',
  barClassName = 'bg-indigo-500 rounded-full',
  secondaryBarClassName = 'bg-amber-400 rounded-full',
  title,
  secondaryTitle,
  className = '',
}: GpuProgressBarProps) {
  const primaryRatio = toRatio(percent, minVisiblePercent);

  if (typeof secondaryPercent === 'number') {
    const combinedPct = Math.min(100, Math.max(0, percent) + Math.max(0, secondaryPercent));
    const combinedRatio = toRatio(combinedPct, minVisiblePercent);

    return (
      <div className={`relative overflow-hidden ${trackClassName} ${className}`}>
        {combinedRatio > 0 && (
          <div
            title={secondaryTitle}
            className={`absolute inset-0 h-full w-full origin-left transition-transform duration-300 ease-out transform-gpu ${secondaryBarClassName}`}
            style={{ transform: `scaleX(${combinedRatio})` }}
          />
        )}
        {primaryRatio > 0 && (
          <div
            title={title}
            className={`relative h-full w-full origin-left transition-transform duration-300 ease-out transform-gpu ${barClassName}`}
            style={{ transform: `scaleX(${primaryRatio})` }}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${trackClassName} ${className}`}>
      <div
        title={title}
        className={`h-full w-full origin-left transition-transform duration-300 ease-out transform-gpu ${barClassName}`}
        style={{ transform: `scaleX(${primaryRatio})` }}
      />
    </div>
  );
}
