'use client';

import Image from 'next/image';
import React from 'react';

export type StudioContextTone = 'indigo' | 'amber' | 'emerald';

export function getStudioContextTone(
  pomodoroRunning: boolean,
  pomodoroMode: 'focus' | 'break'
): StudioContextTone {
  if (!pomodoroRunning) return 'indigo';
  return pomodoroMode === 'focus' ? 'amber' : 'emerald';
}

export const STUDIO_TONE_TOKENS: Record<
  StudioContextTone,
  {
    cardBorder: string;
    cardGlow: string;
    vinylRing: string;
    fillGradient: string;
    eqBar: string;
    badge: string;
  }
> = {
  indigo: {
    cardBorder: 'border-indigo-500/25 dark:border-indigo-400/25',
    cardGlow: 'shadow-[0_0_24px_-6px_rgba(99,102,241,0.34)]',
    vinylRing: 'ring-indigo-500/45 shadow-[0_0_18px_rgba(99,102,241,0.38)]',
    fillGradient: 'from-indigo-500 to-cyan-400',
    eqBar: 'bg-indigo-500 dark:bg-cyan-400',
    badge:
      'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300 border-indigo-500/25',
  },
  amber: {
    cardBorder: 'border-amber-500/40 dark:border-amber-400/35',
    cardGlow: 'shadow-[0_0_26px_-6px_rgba(245,158,11,0.42)]',
    vinylRing: 'ring-amber-500/55 shadow-[0_0_20px_rgba(245,158,11,0.45)]',
    fillGradient: 'from-amber-500 to-orange-400',
    eqBar: 'bg-amber-500 dark:bg-amber-400',
    badge:
      'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  emerald: {
    cardBorder: 'border-emerald-500/35 dark:border-emerald-400/35',
    cardGlow: 'shadow-[0_0_26px_-6px_rgba(16,185,129,0.4)]',
    vinylRing: 'ring-emerald-500/55 shadow-[0_0_20px_rgba(16,185,129,0.42)]',
    fillGradient: 'from-emerald-500 to-teal-400',
    eqBar: 'bg-emerald-500 dark:bg-emerald-400',
    badge:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
};

interface VinylArtworkProps {
  videoId: string;
  title: string;
  isPlaying: boolean;
  tone?: StudioContextTone;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const VINYL_SIZE_MAP: Record<
  NonNullable<VinylArtworkProps['size']>,
  {
    outer: string;
    rim: string;
    spindle: string;
    pin: string;
    imgSize: number;
  }
> = {
  xs: {
    outer: 'w-8 h-8',
    rim: 'p-[2px]',
    spindle: 'w-2 h-2',
    pin: 'w-0.5 h-0.5',
    imgSize: 64,
  },
  sm: {
    outer: 'w-11 h-11',
    rim: 'p-[2.5px]',
    spindle: 'w-2.5 h-2.5',
    pin: 'w-1 h-1',
    imgSize: 88,
  },
  md: {
    outer: 'w-14 h-14',
    rim: 'p-[3px]',
    spindle: 'w-3 h-3',
    pin: 'w-1 h-1',
    imgSize: 112,
  },
  lg: {
    outer: 'w-44 h-44 sm:w-56 sm:h-56',
    rim: 'p-[12%]',
    spindle: 'w-6 h-6',
    pin: 'w-1.5 h-1.5',
    imgSize: 320,
  },
};

/**
 * Pure GPU-composited spinning vinyl disc artwork using YouTube thumbnail (`mqdefault.jpg`).
 * Pauses cleanly at the exact rotation angle via `animation-play-state: paused`.
 */
export function VinylArtwork({
  videoId,
  title,
  isPlaying,
  tone = 'indigo',
  size = 'md',
  className = '',
}: VinylArtworkProps) {
  const safeVideoId = videoId || 'jfKfPfyJRdk';
  const cfg = VINYL_SIZE_MAP[size];
  const tokens = STUDIO_TONE_TOKENS[tone];

  return (
    <div
      className={`relative shrink-0 rounded-full ring-2 transition-shadow duration-500 ${tokens.vinylRing} ${cfg.outer} ${className}`}
    >
      <div
        className={`vinyl-disc-spin ${
          isPlaying ? '' : 'vinyl-disc-paused'
        } relative w-full h-full rounded-full bg-slate-950 ${cfg.rim} flex items-center justify-center overflow-hidden shadow-inner`}
        style={{
          backgroundImage:
            'repeating-radial-gradient(circle at center, rgba(255,255,255,0.065) 0px, rgba(255,255,255,0.065) 1px, rgba(2,6,23,0.92) 2px, rgba(2,6,23,0.92) 5px)',
        }}
      >
        {/* Center album cover label */}
        <div className="relative w-full h-full rounded-full overflow-hidden ring-1 ring-white/15">
          <Image
            src={`https://i.ytimg.com/vi/${safeVideoId}/mqdefault.jpg`}
            alt={title}
            width={cfg.imgSize}
            height={cfg.imgSize}
            unoptimized
            className="w-full h-full object-cover scale-[1.35]"
          />
          {/* Subtle vinyl sheen over label */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18), transparent 55%)',
            }}
          />
        </div>

        {/* Center spindle hole */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute ${cfg.spindle} rounded-full bg-slate-950 border border-white/40 flex items-center justify-center shadow-sm`}
        >
          <span className={`${cfg.pin} rounded-full bg-slate-200/80`} />
        </div>
      </div>
    </div>
  );
}

interface StudioEqualizerProps {
  isPlaying: boolean;
  tone?: StudioContextTone;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * 4-bar pure CSS animated equalizer (`transform: scaleY` only, zero JS timers).
 */
export function StudioEqualizer({
  isPlaying,
  tone = 'indigo',
  size = 'sm',
  className = '',
}: StudioEqualizerProps) {
  const barColor = STUDIO_TONE_TOKENS[tone].eqBar;
  const containerClass = size === 'md' ? 'h-4 gap-[3px]' : 'h-3 gap-[2px]';
  const barWidth = size === 'md' ? 'w-[3px]' : 'w-[2.5px]';
  const pausedClass = isPlaying ? '' : 'studio-eq-paused';

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-end ${containerClass} ${className}`}
    >
      <span
        className={`studio-eq-bar studio-eq-bar-1 ${pausedClass} ${barWidth} h-full rounded-full ${barColor}`}
      />
      <span
        className={`studio-eq-bar studio-eq-bar-2 ${pausedClass} ${barWidth} h-full rounded-full ${barColor}`}
      />
      <span
        className={`studio-eq-bar studio-eq-bar-3 ${pausedClass} ${barWidth} h-full rounded-full ${barColor}`}
      />
      <span
        className={`studio-eq-bar studio-eq-bar-4 ${pausedClass} ${barWidth} h-full rounded-full ${barColor}`}
      />
    </span>
  );
}

interface StudioSliderProps {
  value: number;
  min?: number;
  max: number;
  step?: number;
  disabled?: boolean;
  ariaLabel: string;
  tone?: StudioContextTone;
  heightClass?: string;
  onChange: (value: number) => void;
  onCommitStart?: () => void;
  onCommitEnd?: () => void;
  className?: string;
}

/**
 * Thin Studio slider with GPU `transform: scaleX` fill bar and native range input ergonomics.
 */
export function StudioSlider({
  value,
  min = 0,
  max,
  step = 1,
  disabled = false,
  ariaLabel,
  tone = 'indigo',
  heightClass = 'h-1.5',
  onChange,
  onCommitStart,
  onCommitEnd,
  className = '',
}: StudioSliderProps) {
  const safeMax = max > min ? max : min + 1;
  const clampedValue = Math.min(safeMax, Math.max(min, value));
  const ratio = Math.min(1, Math.max(0, (clampedValue - min) / (safeMax - min)));
  const fillGradient = STUDIO_TONE_TOKENS[tone].fillGradient;

  return (
    <div className={`relative flex items-center w-full select-none ${className}`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 ${heightClass} rounded-full bg-slate-200/90 dark:bg-white/10 overflow-hidden`}
      >
        <div
          className={`h-full w-full origin-left rounded-full bg-gradient-to-r ${fillGradient}`}
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={safeMax}
        step={step}
        value={clampedValue}
        disabled={disabled}
        aria-label={ariaLabel}
        onPointerDown={onCommitStart}
        onPointerUp={onCommitEnd}
        onPointerCancel={onCommitEnd}
        onTouchStart={onCommitStart}
        onTouchEnd={onCommitEnd}
        onChange={(e) => onChange(Number(e.target.value))}
        className="studio-range-input relative z-10 w-full h-4 m-0 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </div>
  );
}
