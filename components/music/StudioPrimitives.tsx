'use client';

import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';

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
    pulseBorder: string;
    horizonBar: string;
  }
> = {
  indigo: {
    cardBorder: 'border-indigo-500/25 dark:border-indigo-400/25',
    cardGlow: 'shadow-[0_0_24px_-6px_rgba(99,102,241,0.34)]',
    vinylRing: 'ring-indigo-500/50 shadow-[0_0_22px_rgba(99,102,241,0.45)]',
    fillGradient: 'from-indigo-500 to-cyan-400',
    eqBar: 'bg-indigo-500 dark:bg-cyan-400',
    badge:
      'bg-indigo-500/12 text-indigo-600 dark:text-indigo-300 border-indigo-500/25',
    accentText: 'text-indigo-600 dark:text-cyan-400',
    pulseBorder: 'border-indigo-400/45',
    horizonBar: 'from-indigo-500/70 via-cyan-400/55 to-transparent',
  },
  amber: {
    cardBorder: 'border-amber-500/40 dark:border-amber-400/35',
    cardGlow: 'shadow-[0_0_26px_-6px_rgba(245,158,11,0.42)]',
    vinylRing: 'ring-amber-500/60 shadow-[0_0_24px_rgba(245,158,11,0.5)]',
    fillGradient: 'from-amber-500 to-orange-400',
    eqBar: 'bg-amber-500 dark:bg-amber-400',
    badge:
      'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    accentText: 'text-amber-600 dark:text-amber-400',
    pulseBorder: 'border-amber-400/45',
    horizonBar: 'from-amber-500/70 via-orange-400/55 to-transparent',
  },
  emerald: {
    cardBorder: 'border-emerald-500/35 dark:border-emerald-400/35',
    cardGlow: 'shadow-[0_0_26px_-6px_rgba(16,185,129,0.4)]',
    vinylRing: 'ring-emerald-500/60 shadow-[0_0_24px_rgba(16,185,129,0.48)]',
    fillGradient: 'from-emerald-500 to-teal-400',
    eqBar: 'bg-emerald-500 dark:bg-emerald-400',
    badge:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    pulseBorder: 'border-emerald-400/45',
    horizonBar: 'from-emerald-500/70 via-teal-400/55 to-transparent',
  },
};

export const HALO_RADIAL_MAP: Record<StudioContextTone, string> = {
  indigo:
    'radial-gradient(circle, rgba(99,102,241,0.34) 0%, rgba(34,211,238,0.14) 44%, transparent 74%)',
  amber:
    'radial-gradient(circle, rgba(245,158,11,0.34) 0%, rgba(251,146,60,0.12) 44%, transparent 74%)',
  emerald:
    'radial-gradient(circle, rgba(16,185,129,0.34) 0%, rgba(20,184,166,0.12) 44%, transparent 74%)',
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
    outer: 'w-48 h-48 sm:w-60 sm:h-60',
    rim: 'p-[21%]',
    spindle: 'w-5 h-5',
    pin: 'w-1.5 h-1.5',
    imgSize: 320,
  },
};

/**
 * Pure GPU-composited spinning vinyl disc artwork using YouTube thumbnail (`mqdefault.jpg`).
 * Keeps etched micro-grooves spinning with the disc while keeping studio specular light stationary.
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
  const isLarge = size === 'lg';

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
            'repeating-radial-gradient(circle at center, rgba(255,255,255,0.09) 0px, rgba(255,255,255,0.09) 1px, rgba(2,6,23,0.95) 2px, rgba(2,6,23,0.95) 4.5px)',
        }}
      >
        {/* Asymmetric subtle vinyl rim glint marker so rotation velocity is visibly clear */}
        {isLarge && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 w-2 h-1 rounded-full bg-white/45 blur-[0.5px]"
          />
        )}

        {/* Center album cover label with recessed bezel */}
        <div
          className={`relative w-full h-full rounded-full overflow-hidden ${
            isLarge
              ? 'ring-4 ring-slate-950/90 outline outline-1 outline-white/20'
              : 'ring-1 ring-white/25'
          }`}
        >
          <Image
            src={`https://i.ytimg.com/vi/${safeVideoId}/mqdefault.jpg`}
            alt={title}
            width={cfg.imgSize}
            height={cfg.imgSize}
            unoptimized
            className={`w-full h-full object-cover ${
              isLarge ? 'scale-[1.22]' : 'scale-[1.35]'
            }`}
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.2), transparent 55%)',
            }}
          />
        </div>
      </div>

      {/* Stationary anisotropic studio light reflection over spinning vinyl grooves */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          backgroundImage:
            'conic-gradient(from 35deg, rgba(255,255,255,0.18) 0deg, transparent 42deg, transparent 172deg, rgba(255,255,255,0.14) 215deg, transparent 258deg, transparent 360deg)',
        }}
      />

      {/* Center spindle hole */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${cfg.spindle} rounded-full bg-slate-950 border border-white/45 flex items-center justify-center shadow-sm`}
      >
        <span className={`${cfg.pin} rounded-full bg-slate-200/85`} />
      </div>
    </div>
  );
}

/**
 * Minimalist Tonearm SVG positioned outside the right platter rim.
 * Parks cleanly off-disc (-22deg) on a rest post when paused, and drops onto grooves (+12deg) when playing.
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
      <svg viewBox="0 0 84 210" className="w-16 sm:w-20 h-auto overflow-visible">
        <defs>
          <linearGradient id="armMetalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <radialGradient id="pivotGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="68%" stopColor="#475569" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>

        {/* Stationary Rest Cradle Post (visible off-disc at bottom-right park position) */}
        <g transform="translate(65, 118)">
          <circle
            cx="0"
            cy="0"
            r="6"
            fill="#0f172a"
            stroke="#475569"
            strokeWidth="1.5"
          />
          <rect x="-3" y="-4" width="6" height="8" rx="1.5" fill="#334155" />
        </g>

        {/* Stationary Pivot Housing */}
        <circle
          cx="32"
          cy="32"
          r="17"
          fill="#020617"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
        />

        {/* Rotating Tonearm Assembly around (32, 32) */}
        <g
          className={`turntable-tonearm ${
            isPlaying ? 'turntable-tonearm-playing' : 'turntable-tonearm-parked'
          }`}
        >
          {/* Counterweight rear cylinder */}
          <rect
            x="24"
            y="4"
            width="16"
            height="14"
            rx="2.5"
            fill="#334155"
            stroke="#64748b"
            strokeWidth="1.2"
          />
          <line
            x1="24"
            y1="11"
            x2="40"
            y2="11"
            stroke="#cbd5e1"
            strokeWidth="1"
            opacity="0.65"
          />

          {/* Pivot Gimbal Ring */}
          <circle
            cx="32"
            cy="32"
            r="13"
            fill="url(#pivotGrad)"
            stroke="#1e293b"
            strokeWidth="2"
          />
          <circle cx="32" cy="32" r="4.5" fill="#0f172a" />
          <circle cx="32" cy="32" r="1.8" fill="#e2e8f0" />

          {/* Curved tonearm tube */}
          <path
            d="M 32 32 L 32 104 Q 32 138 22 162 L 15 178"
            fill="none"
            stroke="url(#armMetalGrad)"
            strokeWidth="3.4"
            strokeLinecap="round"
          />

          {/* Headshell / Cartridge */}
          <g transform="translate(15, 178) rotate(12)">
            <path
              d="M -4 0 L 7 -2 L 10 19 L -1 21 Z"
              fill="#1e293b"
              stroke="#64748b"
              strokeWidth="1"
            />
            <path
              d="M 8 3 Q 14 5 16 1"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle
              cx="4"
              cy="19"
              r="2.2"
              fill={needleDotColor}
              className={isPlaying ? 'animate-pulse' : ''}
              style={{
                filter: isPlaying
                  ? `drop-shadow(0 0 6px ${needleDotColor})`
                  : 'none',
              }}
            />
          </g>
        </g>
      </svg>
    </div>
  );
}

const RADIAL_BAR_COUNT = 20;
const RADIAL_BARS = Array.from({ length: RADIAL_BAR_COUNT }, (_, i) => {
  const angle = (i * 360) / RADIAL_BAR_COUNT;
  // Deterministic harmonic distribution so bars look musical without random hydration drift
  const heightPx = 10 + ((i * 17 + (i % 3) * 9) % 18);
  const durationSec = (0.48 + ((i * 7) % 11) * 0.05).toFixed(2);
  const delaySec = (-((i * 13) % 17) * 0.06).toFixed(2);
  return { angle, heightPx, durationSec, delaySec };
});

/**
 * Full Reactive Turntable Stage:
 * - #1 Vinyl Eject & Drop-In swap animation + automatic Tonearm lift/drop
 * - #2 Zero-re-render 3D Parallax Tilt via rAF DOM CSS variables + Dual Organic Bass Breath halos
 * - 40-Bar Radial Beat Ring + Sonic Pulse Ripples + Platter
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
  const tokens = STUDIO_TONE_TOKENS[tone];
  const pausedClass = isPlaying ? '' : 'studio-anim-paused';

  const safeId = videoId || 'jfKfPfyJRdk';
  const prevIdRef = useRef<string>(safeId);
  const [isSwapping, setIsSwapping] = useState(false);

  // Brief Tonearm lift when switching tracks while playing (#1)
  useEffect(() => {
    if (prevIdRef.current === safeId) return;
    prevIdRef.current = safeId;
    setIsSwapping(true);
    const timer = window.setTimeout(() => setIsSwapping(false), 460);
    return () => window.clearTimeout(timer);
  }, [safeId]);

  // Zero-render 3D mouse tilt using rAF + CSS custom properties (#2)
  const tiltRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const scheduleTiltUpdate = (xDeg: number, yDeg: number) => {
    pendingRef.current = { x: xDeg, y: yDeg };
    if (rafRef.current !== null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const el = tiltRef.current;
      if (!el) return;
      el.style.setProperty('--tilt-x', `${pendingRef.current.x.toFixed(2)}deg`);
      el.style.setProperty('--tilt-y', `${pendingRef.current.y.toFixed(2)}deg`);
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;
    scheduleTiltUpdate(normX * 8, -normY * 8);
  };

  const handlePointerLeave = () => {
    scheduleTiltUpdate(0, 0);
  };

  const bassHaloBg =
    tone === 'amber'
      ? 'radial-gradient(circle, rgba(245,158,11,0.34), transparent 68%)'
      : tone === 'emerald'
      ? 'radial-gradient(circle, rgba(16,185,129,0.34), transparent 68%)'
      : 'radial-gradient(circle, rgba(56,189,248,0.32), rgba(99,102,241,0.16) 48%, transparent 72%)';

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative flex items-center justify-center select-none py-4 px-6 sm:px-10 ${className}`}
    >
      {/* Dual-Layer Organic Bass Breathing Glow (#2) */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
          isPlaying ? 'opacity-100' : 'opacity-25'
        }`}
      >
        <div
          className={`bass-breath-a ${pausedClass} w-64 h-64 sm:w-80 sm:h-80 rounded-full`}
          style={{ background: bassHaloBg }}
        />
        <div
          className={`bass-breath-b ${pausedClass} absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full`}
          style={{ background: bassHaloBg }}
        />
      </div>

      {/* Expanding Sonic Pulse Ripples */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-4 flex items-center justify-center transition-opacity duration-500 ${
          isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span
          className={`sonic-pulse-ring ${pausedClass} absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border ${tokens.pulseBorder}`}
        />
        <span
          className={`sonic-pulse-ring ${pausedClass} absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border ${tokens.pulseBorder}`}
          style={{ animationDelay: '-1.2s' }}
        />
        <span
          className={`sonic-pulse-ring ${pausedClass} absolute w-56 h-56 sm:w-72 sm:h-72 rounded-full border ${tokens.pulseBorder}`}
          style={{ animationDelay: '-2.4s' }}
        />
      </div>

      {/* 20-Bar Circular Beat Spectrum hugging platter circumference */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute flex items-center justify-center transition-opacity duration-500 ${
          isPlaying ? 'opacity-85' : 'opacity-20'
        }`}
      >
        <div className="relative w-56 h-56 sm:w-[292px] sm:h-[292px]">
          {RADIAL_BARS.map((bar, idx) => (
            <div
              key={idx}
              className="absolute inset-0 flex justify-center"
              style={{ transform: `rotate(${bar.angle}deg)` }}
            >
              <span
                className={`radial-beat-bar ${
                  isPlaying ? '' : 'studio-eq-paused'
                } block w-[3px] rounded-full bg-gradient-to-t ${tokens.horizonBar}`}
                style={{
                  height: `${bar.heightPx}px`,
                  marginTop: `-${Math.round(bar.heightPx * 0.65)}px`,
                  animationDuration: `${bar.durationSec}s`,
                  animationDelay: `${bar.delaySec}s`,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 3D Tilting Platter Deck + Hardware Plinth Corner Mount + Swapping Vinyl */}
      <div
        ref={tiltRef}
        className="relative z-10 flex items-center justify-center"
        style={{
          transform:
            'perspective(900px) rotateX(var(--tilt-y, 0deg)) rotateY(var(--tilt-x, 0deg))',
          transition: 'transform 180ms ease-out',
        }}
      >
        {/* Physical Turntable Corner Plinth behind Tonearm */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-3 -right-5 sm:-right-7 w-20 h-24 rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-950/95 border border-white/15 shadow-2xl flex items-end justify-end p-2 z-[1]"
        >
          <span className="text-[9px] font-mono font-semibold tracking-wider text-slate-400/75 select-none">
            33⅓
          </span>
        </div>

        <div className="relative z-10 rounded-full p-3.5 sm:p-4 bg-gradient-to-b from-slate-800/95 via-slate-900 to-black shadow-[0_25px_65px_-12px_rgba(0,0,0,0.92)] border border-white/15 ring-1 ring-white/5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-1.5 rounded-full border border-dashed border-white/15"
          />
          <div key={safeId} className="vinyl-swap-enter">
            <VinylArtwork
              videoId={safeId}
              title={title}
              isPlaying={isPlaying}
              tone={tone}
              size="lg"
            />
          </div>
        </div>

        {/* Mechanical Tonearm with Spring Drop Physics (#1) */}
        <div className="absolute -top-3 sm:-top-4 -right-6 sm:-right-8 z-20">
          <StudioTonearm isPlaying={isPlaying && !isSwapping} tone={tone} />
        </div>
      </div>
    </div>
  );
}

const HORIZON_BARS = Array.from({ length: 22 }, (_, i) => ({
  heightPx: 14 + Math.round(Math.sin(i * 0.5) * 10 + ((i * 13) % 18)),
  duration: (0.48 + ((i * 7) % 12) * 0.055).toFixed(2),
  delay: (-((i * 9) % 15) * 0.07).toFixed(2),
}));

const MOTES = Array.from({ length: 8 }, (_, i) => ({
  leftPct: 8 + ((i * 11.4) % 84),
  topPct: 18 + ((i * 19) % 66),
  sizePx: 3 + (i % 3) * 1.5,
  durationSec: 16 + (i % 4) * 3,
  delaySec: -(i * 2.4),
}));

/**
 * Full-Viewport Outer Reactive Visuals:
 * - Clean negative-space margins with sleek Bottom Liquid Sine Waves & 22-bar Horizon Equalizer
 */
export function OuterReactiveVisuals({
  isPlaying,
  tone = 'indigo',
}: {
  isPlaying: boolean;
  tone?: StudioContextTone;
}) {
  const pausedBar = isPlaying ? '' : 'studio-eq-paused';
  const horizonGrad = STUDIO_TONE_TOKENS[tone].horizonBar;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden select-none"
    >
      {/* Bottom Dual Seamless SVG Liquid Sine Waves + 22-bar Horizon Equalizer */}
      <div
        className={`fixed inset-x-0 bottom-0 h-16 sm:h-20 overflow-hidden transition-opacity duration-500 ${
          isPlaying ? 'opacity-75' : 'opacity-25'
        }`}
      >
        <svg
          viewBox="0 0 1200 100"
          preserveAspectRatio="none"
          className={`liquid-wave-track ${
            isPlaying ? '' : 'studio-anim-paused'
          } absolute bottom-0 left-0 w-[200%] h-14 sm:h-16`}
          style={{ animationDuration: '14s' }}
        >
          <path
            d="M 0 56 C 150 18, 150 92, 300 56 C 450 18, 450 92, 600 56 C 750 18, 750 92, 900 56 C 1050 18, 1050 92, 1200 56 L 1200 100 L 0 100 Z"
            fill={
              tone === 'amber'
                ? 'rgba(245,158,11,0.13)'
                : tone === 'emerald'
                ? 'rgba(16,185,129,0.13)'
                : 'rgba(99,102,241,0.16)'
            }
          />
        </svg>

        <svg
          viewBox="0 0 1200 100"
          preserveAspectRatio="none"
          className={`liquid-wave-track ${
            isPlaying ? '' : 'studio-anim-paused'
          } absolute bottom-0 left-0 w-[200%] h-10 sm:h-14`}
          style={{ animationDuration: '21s', animationDirection: 'reverse' }}
        >
          <path
            d="M 0 60 C 150 92, 150 28, 300 60 C 450 92, 450 28, 600 60 C 750 92, 750 28, 900 60 C 1050 92, 1050 28, 1200 60 L 1200 100 L 0 100 Z"
            fill={
              tone === 'amber'
                ? 'rgba(251,146,60,0.10)'
                : tone === 'emerald'
                ? 'rgba(20,184,166,0.10)'
                : 'rgba(34,211,238,0.12)'
            }
          />
        </svg>

        <div className="absolute inset-x-0 bottom-0 h-12 sm:h-16 flex items-end justify-between gap-1.5 px-3 sm:px-8">
          {HORIZON_BARS.map((bar, idx) => (
            <span
              key={`h-${idx}`}
              className={`radial-beat-bar ${pausedBar} ${
                idx % 2 === 1 ? 'hidden sm:block' : ''
              } flex-1 max-w-[8px] opacity-65 rounded-t-full bg-gradient-to-t ${horizonGrad}`}
              style={{
                height: `${bar.heightPx}px`,
                animationDuration: `${bar.duration}s`,
                animationDelay: `${bar.delay}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function boostAtmosphericRgb(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  const avg = (r + g + b) / 3;
  const satBoost = 1.35;
  return [
    Math.min(235, Math.max(55, Math.round(avg + (r - avg) * satBoost))),
    Math.min(235, Math.max(55, Math.round(avg + (g - avg) * satBoost))),
    Math.min(235, Math.max(55, Math.round(avg + (b - avg) * satBoost))),
  ];
}

/**
 * Scene Backdrop Renderer (Baked Liquid Mesh Canvas / Midnight / Contextual Glow + Bokeh Motes)
 */
export function StudioSceneBackdrop({
  scene = 'aura',
  videoId,
  tone = 'indigo',
  isPlaying = false,
}: {
  scene: StudioSceneMode;
  videoId?: string;
  tone: StudioContextTone;
  isPlaying?: boolean;
}) {
  const safeVideoId = videoId || 'jfKfPfyJRdk';
  const pauseAnim = isPlaying ? '' : 'studio-anim-paused';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [albumAuraColors, setAlbumAuraColors] = useState<{
    a: string;
    b: string;
  } | null>(null);

  useEffect(() => {
    if (scene !== 'aura') return;
    let cancelled = false;

    const paintMesh = (allowReadback: boolean) => {
      const img = new window.Image();
      if (allowReadback) {
        img.crossOrigin = 'anonymous';
      }
      img.src = `https://i.ytimg.com/vi/${safeVideoId}/mqdefault.jpg`;

      img.onload = () => {
        if (cancelled) return;
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = 16;
        sampleCanvas.height = 9;
        const sampleCtx = sampleCanvas.getContext('2d');
        if (!sampleCtx) return;

        sampleCtx.imageSmoothingEnabled = true;
        sampleCtx.imageSmoothingQuality = 'high';
        sampleCtx.drawImage(img, 0, 0, 16, 9);

        const target = canvasRef.current;
        if (target) {
          const ctx = target.getContext('2d');
          if (ctx) {
            ctx.save();
            ctx.clearRect(0, 0, target.width, target.height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            if ('filter' in ctx) {
              ctx.filter = 'blur(8px) saturate(1.4)';
            }
            ctx.drawImage(
              sampleCanvas,
              -8,
              -5,
              target.width + 16,
              target.height + 10
            );
            ctx.restore();
          }
        }

        if (!allowReadback) return;
        try {
          const { data } = sampleCtx.getImageData(0, 0, 16, 9);
          let r1 = 0;
          let g1 = 0;
          let b1 = 0;
          let c1 = 0;
          let r2 = 0;
          let g2 = 0;
          let b2 = 0;
          let c2 = 0;

          for (let y = 0; y < 9; y++) {
            for (let x = 0; x < 16; x++) {
              const offset = (y * 16 + x) * 4;
              const r = data[offset];
              const g = data[offset + 1];
              const b = data[offset + 2];
              if (y < 5 && x < 10) {
                r1 += r;
                g1 += g;
                b1 += b;
                c1++;
              } else {
                r2 += r;
                g2 += g;
                b2 += b;
                c2++;
              }
            }
          }

          if (c1 > 0 && c2 > 0) {
            const [ar, ag, ab] = boostAtmosphericRgb(r1 / c1, g1 / c1, b1 / c1);
            const [br, bg, bb] = boostAtmosphericRgb(r2 / c2, g2 / c2, b2 / c2);
            setAlbumAuraColors({
              a: `radial-gradient(circle, rgba(${ar},${ag},${ab},0.36) 0%, rgba(${br},${bg},${bb},0.14) 44%, transparent 74%)`,
              b: `radial-gradient(circle, rgba(${br},${bg},${bb},0.34) 0%, rgba(${ar},${ag},${ab},0.14) 44%, transparent 74%)`,
            });
          }
        } catch {
          // Canvas tainted or unreadable; keep default indigo/cyan aura
        }
      };

      img.onerror = () => {
        if (!cancelled && allowReadback) {
          paintMesh(false);
        }
      };
    };

    paintMesh(true);
    return () => {
      cancelled = true;
    };
  }, [safeVideoId, scene]);

  const orbABackground =
    tone === 'indigo' && albumAuraColors
      ? albumAuraColors.a
      : HALO_RADIAL_MAP[tone];
  const orbBBackground =
    tone === 'indigo' && albumAuraColors
      ? albumAuraColors.b
      : HALO_RADIAL_MAP[tone];

  const moteColor =
    tone === 'amber'
      ? 'bg-amber-300/70 shadow-[0_0_8px_rgba(245,158,11,0.7)]'
      : tone === 'emerald'
      ? 'bg-emerald-300/70 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
      : 'bg-cyan-300/70 shadow-[0_0_8px_rgba(34,211,238,0.7)]';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none"
    >
      {/* Pure Midnight Scene */}
      {scene === 'midnight' && (
        <div className="absolute inset-0 bg-[#04060d] transition-opacity duration-700" />
      )}

      {/* Baked Liquid Album Mesh Scene (Zero legible text & 0ms per-frame GPU blur) */}
      {scene === 'aura' && (
        <div className="absolute inset-0 transition-opacity duration-700 bg-slate-950">
          <canvas
            ref={canvasRef}
            width={96}
            height={54}
            className="w-full h-full object-cover opacity-45 scale-110 transition-opacity duration-700"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(2,6,23,0.42) 0%, rgba(2,6,23,0.84) 72%, rgba(2,6,23,0.96) 100%)',
            }}
          />
          <div
            className={`aura-orbit-a ${pauseAnim} absolute -top-24 -left-24 w-[52vw] h-[52vh] min-w-[340px] max-w-[640px] rounded-full opacity-75 transition-colors duration-700`}
            style={{ background: orbABackground }}
          />
          <div
            className={`aura-orbit-b ${pauseAnim} absolute -bottom-24 -right-24 w-[50vw] h-[50vh] min-w-[340px] max-w-[620px] rounded-full opacity-70 transition-colors duration-700`}
            style={{ background: orbBBackground }}
          />
        </div>
      )}

      {/* Ambient Glow Scene */}
      {scene === 'glow' && (
        <div className="absolute inset-0 bg-slate-950 flex items-center justify-center transition-opacity duration-700">
          <div
            className={`aura-orbit-a ${pauseAnim} w-[560px] h-[560px] rounded-full transition-all duration-700 opacity-95`}
            style={{ background: HALO_RADIAL_MAP[tone] }}
          />
        </div>
      )}

      {/* Subtle Floating Motes + Rare Diagonal Shooting Stars (#6) */}
      {scene !== 'midnight' && (
        <>
          <div
            className={`absolute inset-0 transition-opacity duration-700 ${
              isPlaying ? 'opacity-80' : 'opacity-20'
            }`}
          >
            {MOTES.map((m, idx) => (
              <span
                key={idx}
                className={`zen-mote ${pauseAnim} absolute rounded-full ${moteColor}`}
                style={{
                  left: `${m.leftPct}%`,
                  top: `${m.topPct}%`,
                  width: `${m.sizePx}px`,
                  height: `${m.sizePx}px`,
                  animationDuration: `${m.durationSec}s`,
                  animationDelay: `${m.delaySec}s`,
                }}
              />
            ))}
          </div>

          <span
            className={`shooting-star ${pauseAnim} absolute top-[12%] left-[8%] w-28 h-[1.5px] rounded-full bg-gradient-to-r from-transparent via-white/80 to-cyan-300`}
          />
          <span
            className={`shooting-star ${pauseAnim} absolute top-[20%] right-[12%] w-24 h-[1.5px] rounded-full bg-gradient-to-r from-transparent via-white/75 to-indigo-300`}
            style={{ animationDuration: '23s', animationDelay: '-7s' }}
          />
        </>
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
  formatTooltip?: (value: number) => string;
  onChange: (value: number) => void;
  onCommitStart?: () => void;
  onCommitEnd?: () => void;
  className?: string;
}

const SLIDER_THUMB_TONE: Record<StudioContextTone, string> = {
  indigo:
    'border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.55)] ring-indigo-400/25',
  amber:
    'border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.55)] ring-amber-400/25',
  emerald:
    'border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.55)] ring-emerald-400/25',
};

/**
 * Thin Studio slider with distortion-free GPU `clip-path` fill bar and centered custom thumb.
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
  formatTooltip,
  onChange,
  onCommitStart,
  onCommitEnd,
  className = '',
}: StudioSliderProps) {
  const [isInteracting, setIsInteracting] = useState(false);
  const safeMax = max > min ? max : min + 1;
  const clampedValue = Math.min(safeMax, Math.max(min, value));
  const ratio = Math.min(1, Math.max(0, (clampedValue - min) / (safeMax - min)));
  const fillGradient = STUDIO_TONE_TOKENS[tone].fillGradient;
  const thumbToneClass = SLIDER_THUMB_TONE[tone];
  const pct = (ratio * 100).toFixed(3);
  const clipRight = ((1 - ratio) * 100).toFixed(3);

  return (
    <div
      className={`group relative flex items-center w-full h-5 select-none ${className}`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 ${heightClass} rounded-full bg-slate-200/90 dark:bg-white/10 overflow-hidden`}
      >
        <div
          className={`h-full w-full rounded-full bg-gradient-to-r ${fillGradient}`}
          style={{ clipPath: `inset(0 ${clipRight}% 0 0)` }}
        />
      </div>

      {/* Precision GPU-centered thumb with optional live scrub tooltip */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex items-center justify-center"
        style={{ left: `${pct}%` }}
      >
        {formatTooltip && isInteracting && !disabled && (
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-900/95 border border-white/15 text-[10px] font-mono tabular-nums text-white shadow-md whitespace-nowrap">
            {formatTooltip(clampedValue)}
          </span>
        )}
        <span
          className={`block w-3 h-3 rounded-full bg-white border-2 transition-transform duration-150 ${thumbToneClass} ${
            isInteracting
              ? 'scale-125 ring-4'
              : 'group-hover:scale-125 group-hover:ring-4'
          } ${disabled ? 'opacity-40' : 'opacity-100'}`}
        />
      </span>

      <input
        type="range"
        min={min}
        max={safeMax}
        step={step}
        value={clampedValue}
        disabled={disabled}
        aria-label={ariaLabel}
        onPointerDown={() => {
          setIsInteracting(true);
          onCommitStart?.();
        }}
        onPointerUp={() => {
          setIsInteracting(false);
          onCommitEnd?.();
        }}
        onPointerCancel={() => {
          setIsInteracting(false);
          onCommitEnd?.();
        }}
        onTouchStart={() => {
          setIsInteracting(true);
          onCommitStart?.();
        }}
        onTouchEnd={() => {
          setIsInteracting(false);
          onCommitEnd?.();
        }}
        onBlur={() => setIsInteracting(false)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="studio-range-input relative z-20 w-full h-5 m-0 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </div>
  );
}
