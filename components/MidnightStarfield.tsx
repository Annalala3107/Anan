'use client';

import { useEffect, useRef, useState } from 'react';

export interface MidnightStarfieldProps {
  /** Toggle 3-layer CSS ambient radial glows */
  showAmbientGlows?: boolean;
  /** Toggle animated HTML5 Canvas starfield */
  showStars?: boolean;
  /** Toggle smooth pointer parallax & proximity glow reaction */
  pointerReact?: boolean;
  /** Preview or enforce reduced-motion static starfield */
  forceReducedMotion?: boolean;
  /** Density preset, automatically clamped lower on mobile screens */
  density?: 'low' | 'balanced' | 'rich';
}

interface Star {
  x: number;
  y: number;
  z: number; // Depth factor 0.28..1.0
  radius: number;
  vx: number;
  vy: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  tone: 'ice' | 'indigo' | 'amber';
}

type ToneSprites = Record<Star['tone'], HTMLCanvasElement>;

const TONE_PALETTE: Record<Star['tone'], { core: string; halo: string }> = {
  ice: { core: 'rgba(240, 249, 255, 1)', halo: 'rgba(56, 189, 248, 0.55)' }, // Cool Cyan-Ice
  indigo: { core: 'rgba(224, 231, 255, 1)', halo: 'rgba(99, 102, 241, 0.58)' }, // Cool Indigo
  amber: { core: 'rgba(254, 243, 199, 1)', halo: 'rgba(245, 158, 11, 0.62)' }, // Warm Amber Accent
};

/** Pre-bake soft glow-halo sprites once so per-frame star drawing needs zero ctx.shadowBlur */
function createToneSprites(dpr: number): ToneSprites {
  const size = 48;
  const half = size / 2;
  const tones: Star['tone'][] = ['ice', 'indigo', 'amber'];
  const sprites = {} as ToneSprites;

  for (const tone of tones) {
    const offscreen = document.createElement('canvas');
    offscreen.width = Math.round(size * dpr);
    offscreen.height = Math.round(size * dpr);
    const octx = offscreen.getContext('2d');
    if (octx) {
      octx.scale(dpr, dpr);
      const { core, halo } = TONE_PALETTE[tone];

      // Soft outer radial halo
      const haloGrad = octx.createRadialGradient(half, half, 0, half, half, half);
      haloGrad.addColorStop(0, core);
      haloGrad.addColorStop(0.16, halo);
      haloGrad.addColorStop(0.45, halo.replace(/[\d.]+\)$/, '0.14)'));
      haloGrad.addColorStop(1, 'rgba(7, 10, 19, 0)');

      octx.fillStyle = haloGrad;
      octx.beginPath();
      octx.arc(half, half, half, 0, Math.PI * 2);
      octx.fill();

      // Crisp pinpoint core for readability on high-DPI displays
      octx.fillStyle = core;
      octx.beginPath();
      octx.arc(half, half, 2.2, 0, Math.PI * 2);
      octx.fill();
    }
    sprites[tone] = offscreen;
  }

  return sprites;
}

export default function MidnightStarfield({
  showAmbientGlows = true,
  showStars = true,
  pointerReact = true,
  forceReducedMotion = false,
  density = 'balanced',
}: MidnightStarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [osReducedMotion, setOsReducedMotion] = useState(false);

  // Sync OS prefers-reduced-motion preference cleanly
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setOsReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setOsReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isReducedMotion = forceReducedMotion || osReducedMotion;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !showStars) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 2);
    let sprites = createToneSprites(dpr);

    const getTargetCount = (w: number) => {
      const mobileCap = w < 768;
      if (mobileCap) {
        return density === 'low' ? 24 : density === 'rich' ? 46 : 36;
      }
      const base = density === 'low' ? 52 : density === 'rich' ? 120 : 84;
      return w >= 1440 ? Math.round(base * 1.15) : base;
    };

    const seedStars = (w: number, h: number): Star[] => {
      const count = getTargetCount(w);
      const stars: Star[] = [];
      for (let i = 0; i < count; i++) {
        const z = 0.28 + Math.random() * 0.72;
        const roll = Math.random();
        // ~52% Ice Cyan, ~36% Indigo, ~12% Warm Amber accent
        const tone: Star['tone'] = roll < 0.52 ? 'ice' : roll < 0.88 ? 'indigo' : 'amber';
        const driftAngle = Math.random() * Math.PI * 2;
        const baseSpeed = (0.04 + Math.random() * 0.09) * z;

        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          radius: 0.9 + z * 1.45,
          vx: Math.cos(driftAngle) * baseSpeed,
          vy: Math.sin(driftAngle) * baseSpeed - 0.03 * z,
          baseAlpha: 0.28 + z * 0.52,
          twinkleSpeed: 0.008 + Math.random() * 0.016,
          twinklePhase: Math.random() * Math.PI * 2,
          tone,
        });
      }
      return stars;
    };

    let stars = seedStars(width, height);

    // Smooth lerped pointer coordinates (normalized parallax + screen position for halo reaction)
    const pointer = {
      targetX: width / 2,
      targetY: height / 2,
      smoothX: width / 2,
      smoothY: height / 2,
      active: false,
      strength: 0,
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const nextDpr = Math.min(window.devicePixelRatio || 1, width < 768 ? 1.5 : 2);
      if (nextDpr !== dpr) {
        dpr = nextDpr;
        sprites = createToneSprites(dpr);
      }
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      stars = seedStars(width, height);
    };

    handleResize();

    const drawFrame = (timeMs: number, animateStep: boolean) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      if (animateStep) {
        pointer.smoothX += (pointer.targetX - pointer.smoothX) * 0.065;
        pointer.smoothY += (pointer.targetY - pointer.smoothY) * 0.065;
        const targetStrength = pointer.active && pointerReact ? 1 : 0;
        pointer.strength += (targetStrength - pointer.strength) * 0.06;
      }

      const normPx = (pointer.smoothX / Math.max(width, 1) - 0.5) * 2;
      const normPy = (pointer.smoothY / Math.max(height, 1) - 0.5) * 2;
      const maxReactRadius = 175;
      const t = timeMs * 0.06;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        if (animateStep) {
          s.x += s.vx;
          s.y += s.vy;

          // Seamless wrap around edges
          if (s.x < -16) s.x = width + 16;
          else if (s.x > width + 16) s.x = -16;
          if (s.y < -16) s.y = height + 16;
          else if (s.y > height + 16) s.y = -16;
        }

        // Depth parallax shift when pointer moves smoothly on desktop
        let drawX = s.x;
        let drawY = s.y;
        let glowBoost = 0;

        if (!isReducedMotion && pointerReact && pointer.strength > 0.01) {
          const parallaxScale = 14 * s.z * pointer.strength;
          drawX -= normPx * parallaxScale;
          drawY -= normPy * parallaxScale;

          // Proximity halo swell & gentle radial parting near cursor
          const dx = drawX - pointer.smoothX;
          const dy = drawY - pointer.smoothY;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxReactRadius * maxReactRadius && distSq > 1) {
            const dist = Math.sqrt(distSq);
            const falloff = 1 - dist / maxReactRadius;
            const eased = falloff * falloff;
            glowBoost = eased * 0.55 * pointer.strength;
            const push = eased * 13 * s.z * pointer.strength;
            drawX += (dx / dist) * push;
            drawY += (dy / dist) * push;
          }
        }

        const twinkle = isReducedMotion
          ? 0
          : Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.18;
        const alpha = Math.min(1, Math.max(0.12, s.baseAlpha + twinkle + glowBoost));
        const spriteSize = s.radius * (9.5 + glowBoost * 5.5);

        ctx.globalAlpha = alpha;
        ctx.drawImage(
          sprites[s.tone],
          drawX - spriteSize / 2,
          drawY - spriteSize / 2,
          spriteSize,
          spriteSize
        );
      }

      ctx.globalAlpha = 1;
    };

    // Static clean frame under prefers-reduced-motion
    if (isReducedMotion) {
      drawFrame(0, false);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    let rafId = 0;
    let isVisible = !document.hidden;

    const loop = (now: number) => {
      if (!isVisible) return;
      drawFrame(now, true);
      rafId = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      cancelAnimationFrame(rafId);
      if (isVisible) {
        rafId = requestAnimationFrame(loop);
      }
    };

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        startLoop();
      } else {
        cancelAnimationFrame(rafId);
      }
    };

    // Only react smoothly to fine/mouse pointer so touch scrolling stays natural
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pointer.targetX = e.clientX;
      pointer.targetY = e.clientY;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    startLoop();
    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [showStars, pointerReact, isReducedMotion, density]);

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden midnight-backdrop ${
        isReducedMotion ? 'motion-reduce-forced' : ''
      }`}
      aria-hidden="true"
    >
      {/* 3-Layer Gentle Ambient Radial Glows (2 Cool + 1 Warm Accent) */}
      {showAmbientGlows && (
        <div
          className="absolute inset-0"
          style={
            isReducedMotion
              ? undefined
              : undefined
          }
        >
          <div
            className="midnight-glow-layer midnight-glow-indigo"
            style={isReducedMotion ? { animation: 'none' } : undefined}
          />
          <div
            className="midnight-glow-layer midnight-glow-cyan"
            style={isReducedMotion ? { animation: 'none' } : undefined}
          />
          <div
            className="midnight-glow-layer midnight-glow-amber"
            style={isReducedMotion ? { animation: 'none' } : undefined}
          />
        </div>
      )}

      {/* Hardware-Friendly HTML5 Canvas Starfield */}
      {showStars && <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />}
    </div>
  );
}
