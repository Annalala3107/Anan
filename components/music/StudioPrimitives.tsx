'use client';

import Image from 'next/image';
import React from 'react';

export type StudioContextTone = 'indigo' | 'amber' | 'emerald';
export type StudioSceneMode = 'aura' | 'midnight' | 'glow';

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
    accentText: string;
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
    accentText: 'text-indigo-600 dark:text-cyan-400',
  },
  amber: {
    cardBorder: 'border-amber-500/40 dark:border-amber-400/35',
    cardGlow: 'shadow-[0_0_26px_-6px_rgba(245,158,11,0.42)]',
    vinylRing: 'ring-amber-500/55 shadow-[0_0_20px_rgba(245,158,11,0.45)]',
    fillGradient: 'from-amber-500 to-orange-400',
    eqBar: 'bg-amber-500 dark:bg-amber-400',
    badge:
      'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    accentText: 'text-amber-600 dark:text-amber-400',
  },
  emerald: {
    cardBorder: 'border-emerald-500/35 dark:border-emerald-400/35',
    cardGlow: 'shadow-[0_0_26px_-6px_rgba(16,185,129,0.4)]',
    vinylRing: 'ring-emerald-500/55 shadow-[0_0_20px_rgba(16,185,129,0.42)]',
    fillGradient: 'from-emerald-500 to-teal-400',
    eqBar: 'bg-emerald-500 dark:bg-emerald-400',
    badge:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    accentText: 'text-emerald-600 dark:text-emerald-400',
  },
};

export const HALO_RADIAL_MAP: Record<StudioContextTone, string> = {
  indigo:
    'radial-gradient(circle, rgba(99,102,241,0.28) 0%, rgba(34,211,238,0.08) 48%, transparent 72%)',
  amber:
    'radial-gradient(circle, rgba(245,158,11,0.3) 0%, rgba(251,146,60,0.09) 48%, transparent 72%)',
  emerald:
    'radial-gradient(circle, rgba(16,185,129,0.28) 0%, rgba(20,184,166,0.08) 48%, transparent 72%)',
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

/**
 * Minimalist Tonearm SVG: rotates into playing position when `isPlaying` is true.
 */
export function StudioTonearm({
  isPlaying,
  tone = 'indigo',
  className = '',
}: {
  isPlaying: boolean;
  tone?: StudioContextTone;
  className?: string;
}) {
  const needleDotColor =
    tone === 'amber' ? '#f59e0b' : tone === 'emerald' ? '#10b981' : '#22d3ee';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    >
      <svg
        viewBox="0 0 74 190"
        className={`w-16 sm:w-20 h-auto overflow-visible turntable-tonearm ${
          isPlaying ? 'turntable-tonearm-playing' : 'turntable-tonearm-parked'
        }`}
      >
        <defs>
          <linearGradient id="armMetalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <radialGradient id="pivotGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="70%" stopColor="#475569" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>

        {/* Counterweight rear cylinder */}
        <rect
          x="25"
          y="6"
          width="14"
          height="14"
          rx="2"
          fill="#334155"
          stroke="#475569"
          strokeWidth="1.5"
        />
        <line
          x1="25"
          y1="13"
          x2="39"
          y2="13"
          stroke="#94a3b8"
          strokeWidth="1"
          opacity="0.6"
        />

        {/* Pivot Gimbal Base */}
        <circle
          cx="32"
          cy="32"
          r="14"
          fill="url(#pivotGrad)"
          stroke="#1e293b"
          strokeWidth="2"
        />
        <circle cx="32" cy="32" r="5" fill="#0f172a" />
        <circle cx="32" cy="32" r="2" fill="#cbd5e1" />

        {/* S-curved tonearm tube */}
        <path
          d="M 32 32 L 32 95 Q 32 125 22 145 L 14 165"
          fill="none"
          stroke="url(#armMetalGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* Headshell / Cartridge mount */}
        <g transform="translate(14, 165)">
          <path
            d="M -3 0 L 7 -2 L 11 18 L 1 20 Z"
            fill="#1e293b"
            stroke="#475569"
            strokeWidth="1"
          />
          {/* Finger lift */}
          <path
            d="M 9 2 Q 15 4 17 0"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Stylus needle glowing contact point */}
          <circle
            cx="4"
            cy="18"
            r="1.8"
            fill={needleDotColor}
            className={isPlaying ? 'animate-pulse' : ''}
            style={{
              filter: isPlaying
                ? `drop-shadow(0 0 4px ${needleDotColor})`
                : 'none',
            }}
          />
        </g>
      </svg>
    </div>
  );
}

/**
 * Full Turntable Deck Stage (Base platter + Vinyl + Tonearm).
 */
export function StudioTurntable({
  videoId,
  title,
  isPlaying,
  tone = 'indigo',
  className = '',
}: {
  videoId: string;
  title: string;
  isPlaying: boolean;
  tone?: StudioContextTone;
  className?: string;
}) {
  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
    >
      {/* Platter deck base with subtle metallic sheen */}
      <div className="relative rounded-full p-4 sm:p-5 bg-gradient-to-b from-slate-800/90 via-slate-900 to-black shadow-[0_25px_60px_-12px_rgba(0,0,0,0.85)] border border-white/10 ring-1 ring-white/5">
        {/* Outer strobe dots pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-1.5 rounded-full border border-dashed border-white/10"
        />

        {/* Center Vinyl Artwork */}
        <VinylArtwork
          videoId={videoId}
          title={title}
          isPlaying={isPlaying}
          tone={tone}
          size="lg"
        />
      </div>

      {/* Tonearm Assembly mounted top-right */}
      <div className="absolute -top-3 sm:-top-5 -right-3 sm:-right-4 z-20">
        <StudioTonearm isPlaying={isPlaying} tone={tone} />
      </div>
    </div>
  );
}

/**
 * Scene Backdrop Renderer (Aura / Midnight / Glow)
 */
export function StudioSceneBackdrop({
  scene = 'aura',
  videoId,
  tone = 'indigo',
}: {
  scene: StudioSceneMode;
  videoId?: string;
  tone: StudioContextTone;
}) {
  const safeVideoId = videoId || 'jfKfPfyJRdk';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none"
    >
      {/* Pure Midnight Scene */}
      {scene === 'midnight' && (
        <div className="absolute inset-0 bg-[#05070f] transition-opacity duration-700" />
      )}

      {/* Album Aura Scene (Blurs current album art with vignette) */}
      {scene === 'aura' && (
        <div className="absolute inset-0 transition-opacity duration-700">
          <div className="absolute inset-0 bg-slate-950" />
          <div className="absolute inset-0 flex items-center justify-center opacity-30 blur-3xl scale-125 transform-gpu">
            <Image
              src={`https://i.ytimg.com/vi/${safeVideoId}/mqdefault.jpg`}
              alt="Scene Aura"
              width={640}
              height={360}
              unoptimized
              className="w-full h-full object-cover"
            />
          </div>
          {/* Dark vignette gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(5,8,20,0.45) 0%, rgba(2,6,23,0.92) 80%, #020617 100%)',
            }}
          />
        </div>
      )}

      {/* Ambient Glow Scene (Focused contextual radial halo) */}
      {scene === 'glow' && (
        <div className="absolute inset-0 bg-slate-950 flex items-center justify-center transition-opacity duration-700">
          <div
            className="w-[560px] h-[560px] rounded-full transition-all duration-700 opacity-90"
            style={{ background: HALO_RADIAL_MAP[tone] }}
          />
        </div>
      )}
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
