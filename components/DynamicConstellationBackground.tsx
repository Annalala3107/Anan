'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuizStore } from '@/lib/quizStore';

export interface DynamicConstellationBackgroundProps {
  /** Optional wrapper classes */
  className?: string;
  /** Override number of constellation clusters (defaults to random 4-6 desktop, 3-4 mobile) */
  clusterCount?: number;
  /** Override number of drifting micro-stars (defaults to 35 desktop, 22 mobile) */
  microStarCount?: number;
  /** Enable mouse magnetic glow and interactive beams */
  interactive?: boolean;
}

type CosmicTone = 'cyan' | 'indigo' | 'sky' | 'amber';

interface ToneStyle {
  hex: string;
  rgb: string;
  core: string;
  halo: string;
}

const TONE_PALETTE: Record<CosmicTone, ToneStyle> = {
  cyan: {
    hex: '#22d3ee',
    rgb: '34, 211, 238',
    core: 'rgba(236, 254, 255, 1)',
    halo: 'rgba(34, 211, 238, 0.58)',
  },
  indigo: {
    hex: '#818cf8',
    rgb: '129, 140, 248',
    core: 'rgba(224, 231, 255, 1)',
    halo: 'rgba(129, 140, 248, 0.6)',
  },
  sky: {
    hex: '#38bdf8',
    rgb: '56, 189, 248',
    core: 'rgba(240, 249, 255, 1)',
    halo: 'rgba(56, 189, 248, 0.56)',
  },
  amber: {
    hex: '#f59e0b',
    rgb: '245, 158, 11',
    core: 'rgba(254, 243, 199, 1)',
    halo: 'rgba(245, 158, 11, 0.62)',
  },
};

const TONE_KEYS: CosmicTone[] = ['cyan', 'indigo', 'sky', 'amber'];

interface ConstellationStar {
  /** Local anchor offset relative to cluster center */
  offsetX: number;
  offsetY: number;
  /** Gentle harmonic orbit amplitude & phase */
  orbitRadius: number;
  orbitSpeed: number;
  orbitPhase: number;
  /** Rendered world position for current frame */
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  tone: CosmicTone;
}

interface ConstellationCluster {
  id: number;
  cx: number;
  cy: number;
  vx: number;
  vy: number;
  tone: CosmicTone;
  glowBoost: number;
  stars: ConstellationStar[];
  /** Pre-computed fallback nearest-neighbor pairs so no star is isolated */
  guaranteedEdges: Array<[number, number]>;
}

interface MicroStar {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  tone: CosmicTone;
}

interface ShootingStar {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
  maxLife: number;
  color: string;
  rgb: string;
}

type ToneSprites = Record<CosmicTone, HTMLCanvasElement>;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

/**
 * Pre-bakes soft radial halo sprites per color tone once per DPR change
 * so per-frame star rendering avoids expensive ctx.shadowBlur calls.
 */
function createToneSprites(dpr: number): ToneSprites {
  const size = 48;
  const half = size / 2;
  const sprites = {} as ToneSprites;

  for (const tone of TONE_KEYS) {
    const offscreen = document.createElement('canvas');
    offscreen.width = Math.round(size * dpr);
    offscreen.height = Math.round(size * dpr);
    const octx = offscreen.getContext('2d');

    if (octx) {
      octx.scale(dpr, dpr);
      const { core, halo, rgb } = TONE_PALETTE[tone];
      const grad = octx.createRadialGradient(half, half, 0, half, half, half);
      grad.addColorStop(0, core);
      grad.addColorStop(0.18, halo);
      grad.addColorStop(0.48, `rgba(${rgb}, 0.14)`);
      grad.addColorStop(1, `rgba(${rgb}, 0)`);

      octx.fillStyle = grad;
      octx.beginPath();
      octx.arc(half, half, half, 0, Math.PI * 2);
      octx.fill();

      octx.fillStyle = core;
      octx.beginPath();
      octx.arc(half, half, 2.2, 0, Math.PI * 2);
      octx.fill();
    }

    sprites[tone] = offscreen;
  }

  return sprites;
}

/**
 * Procedurally generates stratified constellation clusters so every reload
 * creates a balanced, non-overlapping sky of connected star graphs.
 */
function generateConstellations(
  width: number,
  height: number,
  requestedClusterCount?: number
): ConstellationCluster[] {
  const isMobile = width < 768;
  const count =
    requestedClusterCount ?? (isMobile ? randomInt(3, 4) : randomInt(4, 6));
  const cols = isMobile ? 2 : Math.min(3, Math.ceil(Math.sqrt(count * (width / Math.max(height, 1)))));
  const rows = Math.max(1, Math.ceil(count / cols));

  // Build stratified grid cells and shuffle to pick well-spaced centers
  const cells: Array<{ col: number; row: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ col: c, row: r });
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  const marginX = Math.min(130, width * 0.14);
  const marginY = Math.min(120, height * 0.14);
  const usableW = Math.max(120, width - marginX * 2);
  const usableH = Math.max(120, height - marginY * 2);
  const cellW = usableW / cols;
  const cellH = usableH / rows;
  const radiusScale = isMobile ? 0.75 : 1;

  const clusters: ConstellationCluster[] = [];

  for (let idx = 0; idx < count; idx++) {
    const cell = cells[idx % cells.length];
    const cx = marginX + (cell.col + randomBetween(0.22, 0.78)) * cellW;
    const cy = marginY + (cell.row + randomBetween(0.22, 0.78)) * cellH;
    const clusterTone = TONE_KEYS[(idx + randomInt(0, TONE_KEYS.length - 1)) % TONE_KEYS.length];
    const driftAngle = randomBetween(0, Math.PI * 2);
    const driftSpeed = randomBetween(0.035, 0.085);

    const starCount = randomInt(4, 8);
    const stars: ConstellationStar[] = [];

    for (let s = 0; s < starCount; s++) {
      // Distribute around cluster center within 80..160px (scaled on mobile)
      const angle = (s / starCount) * Math.PI * 2 + randomBetween(-0.42, 0.42);
      const dist =
        s === 0
          ? randomBetween(0, 32 * radiusScale) // Anchor near center for clean shape
          : randomBetween(80 * radiusScale, 160 * radiusScale);
      const offsetX = Math.cos(angle) * dist;
      const offsetY = Math.sin(angle) * dist;
      const starTone =
        Math.random() < 0.78 ? clusterTone : TONE_KEYS[randomInt(0, TONE_KEYS.length - 1)];

      stars.push({
        offsetX,
        offsetY,
        orbitRadius: randomBetween(2.5, 6.5),
        orbitSpeed: randomBetween(0.0004, 0.001),
        orbitPhase: randomBetween(0, Math.PI * 2),
        x: cx + offsetX,
        y: cy + offsetY,
        radius: s === 0 ? randomBetween(2.1, 2.8) : randomBetween(1.4, 2.4),
        baseAlpha: randomBetween(0.55, 0.88),
        twinkleSpeed: randomBetween(0.0012, 0.0028),
        twinklePhase: randomBetween(0, Math.PI * 2),
        tone: starTone,
      });
    }

    // Ensure every star connects to at least its nearest neighbor within the cluster
    const edgeSet = new Set<string>();
    const guaranteedEdges: Array<[number, number]> = [];
    for (let i = 0; i < stars.length; i++) {
      let nearestIdx = -1;
      let nearestDistSq = Infinity;
      for (let j = 0; j < stars.length; j++) {
        if (i === j) continue;
        const dx = stars[i].offsetX - stars[j].offsetX;
        const dy = stars[i].offsetY - stars[j].offsetY;
        const dSq = dx * dx + dy * dy;
        if (dSq < nearestDistSq) {
          nearestDistSq = dSq;
          nearestIdx = j;
        }
      }
      if (nearestIdx !== -1) {
        const a = Math.min(i, nearestIdx);
        const b = Math.max(i, nearestIdx);
        const key = `${a}-${b}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          guaranteedEdges.push([a, b]);
        }
      }
    }

    clusters.push({
      id: idx,
      cx,
      cy,
      vx: Math.cos(driftAngle) * driftSpeed,
      vy: Math.sin(driftAngle) * driftSpeed,
      tone: clusterTone,
      glowBoost: 0,
      stars,
      guaranteedEdges,
    });
  }

  return clusters;
}

function generateMicroStars(
  width: number,
  height: number,
  requestedCount?: number
): MicroStar[] {
  const isMobile = width < 768;
  const count = requestedCount ?? (isMobile ? 22 : 35);
  const stars: MicroStar[] = [];

  for (let i = 0; i < count; i++) {
    const z = randomBetween(0.3, 1.0);
    const angle = randomBetween(0, Math.PI * 2);
    const speed = randomBetween(0.03, 0.1) * z;
    const roll = Math.random();
    const tone: CosmicTone =
      roll < 0.38 ? 'sky' : roll < 0.72 ? 'indigo' : roll < 0.9 ? 'cyan' : 'amber';

    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      z,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.015 * z,
      radius: 0.7 + z * 0.95,
      baseAlpha: 0.22 + z * 0.45,
      twinkleSpeed: randomBetween(0.0015, 0.0038),
      twinklePhase: randomBetween(0, Math.PI * 2),
      tone,
    });
  }

  return stars;
}

export default function DynamicConstellationBackground({
  className = '',
  clusterCount,
  microStarCount,
  interactive = true,
}: DynamicConstellationBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isExamActive = useQuizStore((state) => state.isExamActive);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let sprites = createToneSprites(dpr);

    let clusters = generateConstellations(width, height, clusterCount);
    let microStars = generateMicroStars(width, height, microStarCount);

    const pointer = {
      targetX: -1000,
      targetY: -1000,
      smoothX: width / 2,
      smoothY: height / 2,
      active: false,
      strength: 0,
    };

    const shootingStar: ShootingStar = {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      length: 110,
      life: 0,
      maxLife: 45,
      color: '#22d3ee',
      rgb: '34, 211, 238',
    };

    let shootingTimerId: ReturnType<typeof setTimeout> | null = null;

    const spawnShootingStar = () => {
      const fromLeft = Math.random() < 0.65;
      const startX = fromLeft
        ? randomBetween(width * 0.05, width * 0.55)
        : randomBetween(width * 0.45, width * 0.92);
      const startY = randomBetween(height * 0.04, height * 0.35);
      const angle = fromLeft
        ? randomBetween(0.32, 0.62)
        : randomBetween(Math.PI - 0.62, Math.PI - 0.32);
      const speed = randomBetween(11, 16);
      const useAmber = Math.random() < 0.32;

      shootingStar.active = true;
      shootingStar.x = startX;
      shootingStar.y = startY;
      shootingStar.vx = Math.cos(angle) * speed;
      shootingStar.vy = Math.sin(angle) * speed;
      shootingStar.length = randomBetween(95, 145);
      shootingStar.life = 0;
      shootingStar.maxLife = randomInt(38, 55);
      shootingStar.color = useAmber ? '#fbbf24' : '#22d3ee';
      shootingStar.rgb = useAmber ? '251, 191, 36' : '34, 211, 238';
    };

    const scheduleNextShootingStar = (delayMs?: number) => {
      if (shootingTimerId) clearTimeout(shootingTimerId);
      const wait = delayMs ?? randomInt(8000, 16000);
      shootingTimerId = setTimeout(() => {
        if (!document.hidden && !reducedMotion) {
          spawnShootingStar();
        }
        scheduleNextShootingStar();
      }, wait);
    };

    const syncCanvasSize = (reseed: boolean) => {
      const nextWidth = container.clientWidth || window.innerWidth;
      const nextHeight = container.clientHeight || window.innerHeight;
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);

      if (nextWidth === 0 || nextHeight === 0) return;

      width = nextWidth;
      height = nextHeight;

      if (nextDpr !== dpr) {
        dpr = nextDpr;
        sprites = createToneSprites(dpr);
      }

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      if (reseed) {
        clusters = generateConstellations(width, height, clusterCount);
        microStars = generateMicroStars(width, height, microStarCount);
      }
    };

    syncCanvasSize(false);

    const drawFrame = (timeMs: number, stepPhysics: boolean) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      if (stepPhysics) {
        if (pointer.active && interactive) {
          pointer.smoothX += (pointer.targetX - pointer.smoothX) * 0.14;
          pointer.smoothY += (pointer.targetY - pointer.smoothY) * 0.14;
          pointer.strength += (1 - pointer.strength) * 0.1;
        } else {
          pointer.strength += (0 - pointer.strength) * 0.08;
        }
      }

      // 1. Render background drifting micro-stars
      for (let i = 0; i < microStars.length; i++) {
        const m = microStars[i];
        if (stepPhysics) {
          m.x += m.vx;
          m.y += m.vy;
          if (m.x < -12) m.x = width + 12;
          else if (m.x > width + 12) m.x = -12;
          if (m.y < -12) m.y = height + 12;
          else if (m.y > height + 12) m.y = -12;
        }

        const twinkle = reducedMotion
          ? 0
          : Math.sin(timeMs * m.twinkleSpeed + m.twinklePhase) * 0.2;
        const alpha = Math.min(0.95, Math.max(0.08, m.baseAlpha + twinkle));
        const spriteSize = m.radius * 9;

        ctx.globalAlpha = alpha;
        ctx.drawImage(
          sprites[m.tone],
          m.x - spriteSize / 2,
          m.y - spriteSize / 2,
          spriteSize,
          spriteSize
        );
      }

      // 2. Update & render procedural constellations
      const maxEdgeDist = width < 768 ? 92 : 110;
      const maxEdgeDistSq = maxEdgeDist * maxEdgeDist;
      const magnetRadius = 150;
      const magnetRadiusSq = magnetRadius * magnetRadius;

      let globalNearestStar: { x: number; y: number; distSq: number } | null = null;

      for (let c = 0; c < clusters.length; c++) {
        const cluster = clusters[c];

        if (stepPhysics) {
          cluster.cx += cluster.vx;
          cluster.cy += cluster.vy;

          const padX = Math.min(110, width * 0.15);
          const padY = Math.min(110, height * 0.15);
          if (cluster.cx < padX) {
            cluster.cx = padX;
            cluster.vx = Math.abs(cluster.vx);
          } else if (cluster.cx > width - padX) {
            cluster.cx = width - padX;
            cluster.vx = -Math.abs(cluster.vx);
          }
          if (cluster.cy < padY) {
            cluster.cy = padY;
            cluster.vy = Math.abs(cluster.vy);
          } else if (cluster.cy > height - padY) {
            cluster.cy = height - padY;
            cluster.vy = -Math.abs(cluster.vy);
          }
        }

        // Compute world positions for stars & find closest distance to cursor
        let minClusterPointerDistSq = Infinity;

        for (let s = 0; s < cluster.stars.length; s++) {
          const star = cluster.stars[s];
          const orbitX = reducedMotion
            ? 0
            : Math.cos(timeMs * star.orbitSpeed + star.orbitPhase) * star.orbitRadius;
          const orbitY = reducedMotion
            ? 0
            : Math.sin(timeMs * star.orbitSpeed * 0.9 + star.orbitPhase) * star.orbitRadius;

          let wx = cluster.cx + star.offsetX + orbitX;
          let wy = cluster.cy + star.offsetY + orbitY;

          if (!reducedMotion && interactive && pointer.strength > 0.02) {
            const dx = wx - pointer.smoothX;
            const dy = wy - pointer.smoothY;
            const dSq = dx * dx + dy * dy;

            if (dSq < minClusterPointerDistSq) {
              minClusterPointerDistSq = dSq;
            }
            if (!globalNearestStar || dSq < globalNearestStar.distSq) {
              globalNearestStar = { x: wx, y: wy, distSq: dSq };
            }

            // Subtle magnetic parting force near cursor
            if (dSq < magnetRadiusSq && dSq > 1) {
              const dist = Math.sqrt(dSq);
              const falloff = 1 - dist / magnetRadius;
              const push = falloff * falloff * 12 * pointer.strength;
              wx += (dx / dist) * push;
              wy += (dy / dist) * push;
            }
          }

          star.x = wx;
          star.y = wy;
        }

        // Smoothly interpolate cluster glow boost when cursor is within 150px
        let targetBoost = 0;
        if (!reducedMotion && interactive && pointer.strength > 0.02 && minClusterPointerDistSq < magnetRadiusSq) {
          const dist = Math.sqrt(minClusterPointerDistSq);
          targetBoost = (1 - dist / magnetRadius) * pointer.strength;
        }
        cluster.glowBoost += (targetBoost - cluster.glowBoost) * 0.12;

        const clusterToneRgb = TONE_PALETTE[cluster.tone].rgb;
        const boost = cluster.glowBoost;

        // Track drawn pairs so guaranteed edges and distance edges never duplicate
        const drawnPairs = new Set<string>();

        const drawConstellationEdge = (idxA: number, idxB: number, strengthFactor: number) => {
          const lo = Math.min(idxA, idxB);
          const hi = Math.max(idxA, idxB);
          const key = `${lo}-${hi}`;
          if (drawnPairs.has(key)) return;
          drawnPairs.add(key);

          const a = cluster.stars[lo];
          const b = cluster.stars[hi];
          const lineAlpha = Math.min(0.85, (0.14 + strengthFactor * 0.16) + boost * 0.42);

          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle =
            boost > 0.25
              ? `rgba(56, 189, 248, ${lineAlpha})`
              : `rgba(${clusterToneRgb}, ${lineAlpha})`;
          ctx.lineWidth = 0.8 + boost * 0.85;
          ctx.stroke();
        };

        // Draw intra-cluster distance edges (< 110px)
        for (let i = 0; i < cluster.stars.length; i++) {
          for (let j = i + 1; j < cluster.stars.length; j++) {
            const a = cluster.stars[i];
            const b = cluster.stars[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < maxEdgeDistSq) {
              const factor = 1 - Math.sqrt(dSq) / maxEdgeDist;
              drawConstellationEdge(i, j, factor);
            }
          }
        }

        // Draw guaranteed nearest-neighbor edges so every star participates in the constellation
        for (let e = 0; e < cluster.guaranteedEdges.length; e++) {
          const [i, j] = cluster.guaranteedEdges[e];
          drawConstellationEdge(i, j, 0.35);
        }

        // Draw magnetic pointer rays to stars inside the active cluster
        if (!reducedMotion && interactive && pointer.strength > 0.02 && boost > 0.04) {
          for (let s = 0; s < cluster.stars.length; s++) {
            const star = cluster.stars[s];
            const dx = pointer.smoothX - star.x;
            const dy = pointer.smoothY - star.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < magnetRadiusSq) {
              const dist = Math.sqrt(dSq);
              const rayAlpha = (1 - dist / magnetRadius) * 0.48 * pointer.strength;
              ctx.globalAlpha = 1;
              ctx.beginPath();
              ctx.moveTo(pointer.smoothX, pointer.smoothY);
              ctx.lineTo(star.x, star.y);
              ctx.strokeStyle = `rgba(34, 211, 238, ${rayAlpha})`;
              ctx.lineWidth = 1.05;
              ctx.stroke();
            }
          }
        }

        // Draw constellation star nodes with pre-baked glow sprites
        for (let s = 0; s < cluster.stars.length; s++) {
          const star = cluster.stars[s];
          const twinkle = reducedMotion
            ? 0
            : Math.sin(timeMs * star.twinkleSpeed + star.twinklePhase) * 0.14;
          const alpha = Math.min(1, Math.max(0.25, star.baseAlpha + twinkle + boost * 0.45));
          const spriteSize = star.radius * (10 + boost * 6.5);

          ctx.globalAlpha = alpha;
          ctx.drawImage(
            sprites[star.tone],
            star.x - spriteSize / 2,
            star.y - spriteSize / 2,
            spriteSize,
            spriteSize
          );
        }
      }

      // Draw crisp beam from pointer to the single nearest star overall
      if (
        !reducedMotion &&
        interactive &&
        pointer.strength > 0.05 &&
        globalNearestStar &&
        globalNearestStar.distSq < magnetRadiusSq * 1.35
      ) {
        const dist = Math.sqrt(globalNearestStar.distSq);
        const beamAlpha = Math.max(0, 1 - dist / (magnetRadius * 1.16)) * 0.6 * pointer.strength;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(pointer.smoothX, pointer.smoothY);
        ctx.lineTo(globalNearestStar.x, globalNearestStar.y);
        ctx.strokeStyle = `rgba(125, 211, 252, ${beamAlpha})`;
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }

      // 3. Update & render Shooting Star ("Eureka Star")
      if (!reducedMotion && shootingStar.active) {
        if (stepPhysics) {
          shootingStar.x += shootingStar.vx;
          shootingStar.y += shootingStar.vy;
          shootingStar.life += 1;
        }

        const progress = shootingStar.life / shootingStar.maxLife;
        if (progress >= 1) {
          shootingStar.active = false;
        } else {
          // Smooth bell-curve fade in & out
          const fade = Math.sin(progress * Math.PI);
          const speed = Math.hypot(shootingStar.vx, shootingStar.vy) || 1;
          const tailX = shootingStar.x - (shootingStar.vx / speed) * shootingStar.length;
          const tailY = shootingStar.y - (shootingStar.vy / speed) * shootingStar.length;

          const grad = ctx.createLinearGradient(
            tailX,
            tailY,
            shootingStar.x,
            shootingStar.y
          );
          grad.addColorStop(0, `rgba(${shootingStar.rgb}, 0)`);
          grad.addColorStop(0.7, `rgba(${shootingStar.rgb}, ${(fade * 0.55).toFixed(3)})`);
          grad.addColorStop(1, `rgba(255, 255, 255, ${(fade * 0.95).toFixed(3)})`);

          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(shootingStar.x, shootingStar.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.6;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Bright pinpoint head
          ctx.beginPath();
          ctx.arc(shootingStar.x, shootingStar.y, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${fade.toFixed(3)})`;
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
    };

    if (reducedMotion) {
      drawFrame(0, false);
      const handleReducedResize = () => {
        syncCanvasSize(true);
        drawFrame(0, false);
      };
      window.addEventListener('resize', handleReducedResize);
      return () => window.removeEventListener('resize', handleReducedResize);
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

    let resizeDebounce: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeDebounce) clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(() => {
        syncCanvasSize(true);
      }, 120);
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            handleResize();
          })
        : null;
    resizeObserver?.observe(container);

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !interactive) return;
      pointer.targetX = e.clientX;
      pointer.targetY = e.clientY;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    startLoop();
    scheduleNextShootingStar(3200);

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave);
    document.addEventListener('mouseleave', handlePointerLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(rafId);
      if (shootingTimerId) clearTimeout(shootingTimerId);
      if (resizeDebounce) clearTimeout(resizeDebounce);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('mouseleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clusterCount, microStarCount, interactive, reducedMotion]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-50 dark:bg-[#080C14] transition-opacity duration-500 ${
        isExamActive ? 'opacity-40' : 'opacity-100'
      } ${className}`}
      aria-hidden="true"
    >
      {/* Subtle Cosmic Dot-Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 dark:opacity-35" />

      {/* 3 Cosmic Aurora Ambient Orbs (Cyan #06b6d4, Indigo #6366f1, Amber #f59e0b) */}
      <div className="absolute -top-32 -left-24 w-[44vw] h-[44vw] min-w-[300px] min-h-[300px] max-w-[680px] max-h-[680px] rounded-full bg-[#06b6d4] opacity-10 dark:opacity-20 blur-3xl transform-gpu" />
      <div className="absolute top-[22%] -right-24 w-[40vw] h-[40vw] min-w-[280px] min-h-[280px] max-w-[640px] max-h-[640px] rounded-full bg-[#6366f1] opacity-10 dark:opacity-20 blur-3xl transform-gpu" />
      <div className="absolute -bottom-36 left-[28%] w-[38vw] h-[38vw] min-w-[260px] min-h-[260px] max-w-[580px] max-h-[580px] rounded-full bg-[#f59e0b] opacity-[0.07] dark:opacity-[0.16] blur-3xl transform-gpu" />

      {/* Interactive Procedural Constellation Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block w-full h-full opacity-75 dark:opacity-95"
      />
    </div>
  );
}
