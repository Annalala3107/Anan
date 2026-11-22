'use client';

import React from 'react';

export interface CosmicSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
  tone?: 'indigo' | 'cyan';
  size?: 'sm' | 'md';
  variant?: 'inline' | 'card';
  disabled?: boolean;
  className?: string;
}

/**
 * Accessible GPU-animated toggle switch replacing native browser checkboxes across light/dark/glass UIs.
 */
export default function CosmicSwitch({
  checked,
  onChange,
  label,
  description,
  tone = 'indigo',
  size = 'md',
  variant = 'inline',
  disabled = false,
  className = '',
}: CosmicSwitchProps) {
  const isSm = size === 'sm';
  const trackSize = isSm ? 'w-8 h-[18px]' : 'w-9 h-5';
  const thumbSize = isSm ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5';
  const thumbTranslate = isSm
    ? checked
      ? 'translate-x-[15px]'
      : 'translate-x-[2px]'
    : checked
    ? 'translate-x-[18px]'
    : 'translate-x-[3px]';

  const activeTrackClass =
    tone === 'cyan'
      ? 'bg-cyan-600 dark:bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.4)]'
      : 'bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.45)]';

  const inactiveTrackClass =
    'bg-slate-300 dark:bg-white/15 border border-slate-300/80 dark:border-white/15';

  const cardSurfaceClass =
    variant === 'card'
      ? checked
        ? tone === 'cyan'
          ? 'px-3.5 py-2.5 rounded-2xl border bg-cyan-500/12 border-cyan-500/40 text-cyan-800 dark:text-cyan-200'
          : 'px-3.5 py-2.5 rounded-2xl border bg-indigo-500/12 border-indigo-500/40 text-indigo-800 dark:text-indigo-200'
        : 'px-3.5 py-2.5 rounded-2xl border bg-slate-100/90 dark:bg-slate-800/75 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
      : '';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      className={`group flex items-center gap-2.5 text-left transition-colors duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${cardSurfaceClass} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex shrink-0 items-center rounded-full transition-colors duration-150 ${trackSize} ${
          checked ? activeTrackClass : inactiveTrackClass
        }`}
      >
        <span
          className={`block rounded-full bg-white shadow-sm transition-transform duration-150 transform-gpu ${thumbSize} ${thumbTranslate}`}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        {description && <span className="block">{description}</span>}
      </span>
    </button>
  );
}
