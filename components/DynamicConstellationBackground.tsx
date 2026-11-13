'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuizStore } from '@/lib/quizStore';

export interface DynamicConstellationBackgroundProps {
  /** Optional wrapper classes */
  className?: string;
  /** Override number of constellation clusters (defaults to random 4-6 desktop, 3-4 mobile) */
  clusterCount?: number;
  /** Override number of drifting micro-stars (defaults to 38 desktop, 24 mobile) */
  microStarCount?: number;
  /** Density preset for stars */
  density?: 'low' | 'balanced' | 'rich';
  /** Toggle vivid 3-orb Cosmic Aurora layer */
  showAmbientGlows?: boolean;
  /** Toggle HTML5 Canvas star & constellation rendering */
  showStars?: boolean;
  /** Enable mouse magnetic glow, spotlight, and interactive beams */
  interactive?: boolean;
  /** Show collapsible bottom-left telemetry & control HUD pill */
  showHud?: boolean;
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
    halo: 'rgba(34, 211, 238, 0.65)',
  },
  indigo: {
    hex: '#818cf8',
    rgb: '129, 140, 248',
    core: 'rgba(224, 231, 255, 1)',
    halo: 'rgba(129, 140, 248, 0.65)',
  },
  sky: {
    hex: '#38bdf8',
    rgb: '56, 189, 248',
    core: 'rgba(240, 249, 255, 1)',
    halo: 'rgba(56, 189, 248, 0.62)',
  },
  amber: {
    hex: '#f59e0b',
    rgb: '245, 158, 11',
    core: 'rgba(254, 243, 199, 1)',
    halo: 'rgba(245, 158, 11, 0.68)',
  },
};

const TONE_KEYS: CosmicTone[] = ['cyan', 'indigo', 'sky', 'amber'];

interface ConstellationStar {
  offsetX: number;
  offsetY: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitPhase: number;
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
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
  maxLife: number;
  rgb: string;
}

interface TelemetrySnapshot {
  clusters: number;
  stars: number;
  fps: number;
  dpr: number;
  visible: boolean;
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
      grad.addColorStop(0.2, halo);
      grad.addColorStop(0.5, `rgba(${rgb}, 0.18)`);
      grad.addColorStop(1, `rgba(${rgb}, 0)`);

      octx.fillStyle = grad;
      octx.beginPath();
      octx.arc(half, half, half, 0, Math.PI * 2);
      octx.fill();

      octx.fillStyle = core;
      octx.beginPath();
      octx.arc(half, half, 2.3, 0, Math.PI * 2);
      octx.fill();
    }

    sprites[tone] = offscreen;
  }

  return sprites;
}

/**
 * Procedurally generates stratified constellation clusters so every reload
 * or manual shuffle creates a balanced, distinct sky of connected star graphs.
 */
function generateConstellations(
  width: number,
  height: number,
  requestedClusterCount?: number
): ConstellationCluster[] {
  const isMobile = width < 768;
  const count =
    requestedClusterCount ?? (isMobile ? randomInt(3, 4) : randomInt(4, 6));
  const cols = isMobile
    ? 2
    : Math.min(3, Math.ceil(Math.sqrt(count * (width / Math.max(height, 1)))));
  const rows = Math.max(1, Math.ceil(count / cols));

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
    const clusterTone =
      TONE_KEYS[(idx + randomInt(0, TONE_KEYS.length - 1)) % TONE_KEYS.length];
    const driftAngle = randomBetween(0, Math.PI * 2);
    const driftSpeed = randomBetween(0.05, 0.12);

    const starCount = randomInt(4, 8);
    const stars: ConstellationStar[] = [];

    for (let s = 0; s < starCount; s++) {
      const angle = (s / starCount) * Math.PI * 2 + randomBetween(-0.42, 0.42);
      const dist =
        s === 0
          ? randomBetween(0, 34 * radiusScale)
          : randomBetween(80 * radiusScale, 160 * radiusScale);
      const offsetX = Math.cos(angle) * dist;
      const offsetY = Math.sin(angle) * dist;
      const starTone =
        Math.random() < 0.78
          ? clusterTone
          : TONE_KEYS[randomInt(0, TONE_KEYS.length - 1)];

      stars.push({
        offsetX,
        offsetY,
        orbitRadius: randomBetween(3, 7.5),
        orbitSpeed: randomBetween(0.0005, 0.0012),
        orbitPhase: randomBetween(0, Math.PI * 2),
        x: cx + offsetX,
        y: cy + offsetY,
        radius: s === 0 ? randomBetween(2.3, 3.0) : randomBetween(1.6, 2.6),
        baseAlpha: randomBetween(0.62, 0.94),
        twinkleSpeed: randomBetween(0.0015, 0.0032),
        twinklePhase: randomBetween(0, Math.PI * 2),
        tone: starTone,
      });
    }

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
  requestedCount?: number,
  density: 'low' | 'balanced' | 'rich' = 'balanced'
): MicroStar[] {
  const isMobile = width < 768;
  const densityMultiplier = density === 'low' ? 0.65 : density === 'rich' ? 1.45 : 1;
  const baseCount = isMobile ? 24 : 38;
  const count = requestedCount ?? Math.round(baseCount * densityMultiplier);
  const stars: MicroStar[] = [];

  for (let i = 0; i < count; i++) {
    const z = randomBetween(0.3, 1.0);
    const angle = randomBetween(0, Math.PI * 2);
    const speed = randomBetween(0.04, 0.13) * z;
    const roll = Math.random();
    const tone: CosmicTone =
      roll < 0.36 ? 'sky' : roll < 0.7 ? 'indigo' : roll < 0.9 ? 'cyan' : 'amber';

    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      z,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.018 * z,
      radius: 0.75 + z * 1.0,
      baseAlpha: 0.25 + z * 0.48,
      twinkleSpeed: randomBetween(0.0018, 0.0042),
      twinklePhase: randomBetween(0, Math.PI * 2),
      tone,
    });
  }

  return stars;
}

function createShootingStar(width: number, height: number): ShootingStar {
  const fromLeft = Math.random() < 0.6;
  const startX = fromLeft
    ? randomBetween(width * 0.05, width * 0.55)
    : randomBetween(width * 0.45, width * 0.92);
  const startY = randomBetween(height * 0.04, height * 0.34);
  const angle = fromLeft
    ? randomBetween(0.32, 0.62)
    : randomBetween(Math.PI - 0.62, Math.PI - 0.32);
  const speed = randomBetween(13, 19);
  const useAmber = Math.random() < 0.36;

  return {
    x: startX,
    y: startY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    length: randomBetween(170, 240),
    life: 0,
    maxLife: randomInt(44, 62),
    rgb: useAmber ? '251, 191, 36' : '34, 211, 238',
  };
}

/** Paints soft drifting Aurora radial gradients directly onto the canvas layer */
function drawCanvasAurora(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number
) {
  const t = timeMs * 0.00025;
  const orbs = [
    {
      x: width * (0.18 + Math.sin(t) * 0.06),
      y: height * (0.2 + Math.cos(t * 0.9) * 0.05),
      r: Math.max(width, height) * 0.42,
      rgb: '6, 182, 212', // Cyan #06b6d4
      alpha: 0.14,
    },
    {
      x: width * (0.82 + Math.cos(t * 0.85) * 0.06),
      y: height * (0.34 + Math.sin(t * 1.1) * 0.06),
      r: Math.max(width, height) * 0.4,
      rgb: '99, 102, 241', // Indigo #6366f1
      alpha: 0.16,
    },
    {
      x: width * (0.48 + Math.sin(t * 0.7 + 1.5) * 0.08),
      y: height * (0.82 + Math.cos(t * 0.8) * 0.05),
      r: Math.max(width, height) * 0.36,
      rgb: '245, 158, 11', // Amber #f59e0b
      alpha: 0.09,
    },
  ];

  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i];
    const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
    grad.addColorStop(0, `rgba(${o.rgb}, ${o.alpha})`);
    grad.addColorStop(0.5, `rgba(${o.rgb}, ${(o.alpha * 0.35).toFixed(3)})`);
    grad.addColorStop(1, `rgba(${o.rgb}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default function DynamicConstellationBackground({
  className = '',
  clusterCount,
  microStarCount,
  density = 'balanced',
  showAmbientGlows = true,
  showStars = true,
  interactive = true,
  showHud = true,
}: DynamicConstellationBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spawnShootingStarRef = useRef<(() => void) | null>(null);
  const regenerateRef = useRef<(() => void) | null>(null);

  const isExamActive = useQuizStore((state) => state.isExamActive);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [pulseFlash, setPulseFlash] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>({
    clusters: 5,
    stars: 65,
    fps: 60,
    dpr: 1,
    visible: true,
  });

  const handleRegenerate = useCallback(() => {
    regenerateRef.current?.();
    setPulseFlash(true);
    setTimeout(() => setPulseFlash(false), 380);
  }, []);

  const handleSpawnShootingStar = useCallback(() => {
    spawnShootingStarRef.current?.();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || !showStars) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let sprites = createToneSprites(dpr);

    let clusters = generateConstellations(width, height, clusterCount);
    let microStars = generateMicroStars(width, height, microStarCount, density);
    const shootingStars: ShootingStar[] = [];

    const updateTelemetrySnapshot = (fps: number, visible: boolean) => {
      const constellationStars = clusters.reduce((sum, c) => sum + c.stars.length, 0);
      setTelemetry({
        clusters: clusters.length,
        stars: constellationStars + microStars.length,
        fps,
        dpr: Number(dpr.toFixed(2)),
        visible,
      });
    };

    const pointer = {
      targetX: -1000,
      targetY: -1000,
      smoothX: width / 2,
      smoothY: height / 2,
      active: false,
      strength: 0,
    };

    let shootingTimerId: ReturnType<typeof setTimeout> | null = null;

    const pushShootingStar = () => {
      shootingStars.push(createShootingStar(width, height));
    };

    spawnShootingStarRef.current = pushShootingStar;

    regenerateRef.current = () => {
      clusters = generateConstellations(width, height, clusterCount);
      microStars = generateMicroStars(width, height, microStarCount, density);
      updateTelemetrySnapshot(telemetry.fps, !document.hidden);
    };

    const scheduleNextShootingStar = (delayMs?: number) => {
      if (shootingTimerId) clearTimeout(shootingTimerId);
      const wait = delayMs ?? randomInt(3500, 6500);
      shootingTimerId = setTimeout(() => {
        if (!document.hidden) {
          pushShootingStar();
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
        microStars = generateMicroStars(width, height, microStarCount, density);
      }
      updateTelemetrySnapshot(60, !document.hidden);
    };

    syncCanvasSize(false);

    const drawFrame = (timeMs: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // 0. Organic Cosmic Aurora wash inside Canvas when enabled
      if (showAmbientGlows) {
        drawCanvasAurora(ctx, width, height, timeMs);
      }

      // Smooth pointer interpolation
      if (pointer.active && interactive) {
        pointer.smoothX += (pointer.targetX - pointer.smoothX) * 0.16;
        pointer.smoothY += (pointer.targetY - pointer.smoothY) * 0.16;
        pointer.strength += (1 - pointer.strength) * 0.12;
      } else {
        pointer.strength += (0 - pointer.strength) * 0.08;
      }

      // Cursor Magnetic Spotlight
      if (interactive && pointer.strength > 0.02) {
        const spotRadius = 210;
        const spotGrad = ctx.createRadialGradient(
          pointer.smoothX,
          pointer.smoothY,
          0,
          pointer.smoothX,
          pointer.smoothY,
          spotRadius
        );
        spotGrad.addColorStop(0, `rgba(56, 189, 248, ${(0.18 * pointer.strength).toFixed(3)})`);
        spotGrad.addColorStop(0.45, `rgba(99, 102, 241, ${(0.08 * pointer.strength).toFixed(3)})`);
        spotGrad.addColorStop(1, 'rgba(8, 12, 20, 0)');
        ctx.fillStyle = spotGrad;
        ctx.beginPath();
        ctx.arc(pointer.smoothX, pointer.smoothY, spotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 1. Drifting & twinkling micro-stars
      for (let i = 0; i < microStars.length; i++) {
        const m = microStars[i];
        m.x += m.vx;
        m.y += m.vy;
        if (m.x < -12) m.x = width + 12;
        else if (m.x > width + 12) m.x = -12;
        if (m.y < -12) m.y = height + 12;
        else if (m.y > height + 12) m.y = -12;

        const twinkle = Math.sin(timeMs * m.twinkleSpeed + m.twinklePhase) * 0.22;
        const alpha = Math.min(0.98, Math.max(0.1, m.baseAlpha + twinkle));
        const spriteSize = m.radius * 9.5;

        ctx.globalAlpha = alpha;
        ctx.drawImage(
          sprites[m.tone],
          m.x - spriteSize / 2,
          m.y - spriteSize / 2,
          spriteSize,
          spriteSize
        );
      }

      // 2. Procedural Constellation Clusters
      const maxEdgeDist = width < 768 ? 95 : 115;
      const maxEdgeDistSq = maxEdgeDist * maxEdgeDist;
      const magnetRadius = 210;
      const magnetRadiusSq = magnetRadius * magnetRadius;

      let globalNearestStar: { x: number; y: number; distSq: number } | null = null;

      for (let c = 0; c < clusters.length; c++) {
        const cluster = clusters[c];

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

        let minClusterPointerDistSq = Infinity;

        for (let s = 0; s < cluster.stars.length; s++) {
          const star = cluster.stars[s];
          const orbitX = Math.cos(timeMs * star.orbitSpeed + star.orbitPhase) * star.orbitRadius;
          const orbitY =
            Math.sin(timeMs * star.orbitSpeed * 0.9 + star.orbitPhase) * star.orbitRadius;

          let wx = cluster.cx + star.offsetX + orbitX;
          let wy = cluster.cy + star.offsetY + orbitY;

          if (interactive && pointer.strength > 0.02) {
            const dx = wx - pointer.smoothX;
            const dy = wy - pointer.smoothY;
            const dSq = dx * dx + dy * dy;

            if (dSq < minClusterPointerDistSq) {
              minClusterPointerDistSq = dSq;
            }
            if (!globalNearestStar || dSq < globalNearestStar.distSq) {
              globalNearestStar = { x: wx, y: wy, distSq: dSq };
            }

            if (dSq < magnetRadiusSq && dSq > 1) {
              const dist = Math.sqrt(dSq);
              const falloff = 1 - dist / magnetRadius;
              const push = falloff * falloff * 14 * pointer.strength;
              wx += (dx / dist) * push;
              wy += (dy / dist) * push;
            }
          }

          star.x = wx;
          star.y = wy;
        }

        let targetBoost = 0;
        if (interactive && pointer.strength > 0.02 && minClusterPointerDistSq < magnetRadiusSq) {
          const dist = Math.sqrt(minClusterPointerDistSq);
          targetBoost = (1 - dist / magnetRadius) * pointer.strength;
        }
        cluster.glowBoost += (targetBoost - cluster.glowBoost) * 0.14;

        const clusterToneRgb = TONE_PALETTE[cluster.tone].rgb;
        const boost = cluster.glowBoost;

        // Soft glowing nebula bloom around active constellation center
        if (boost > 0.05) {
          const bloomGrad = ctx.createRadialGradient(
            cluster.cx,
            cluster.cy,
            0,
            cluster.cx,
            cluster.cy,
            185
          );
          bloomGrad.addColorStop(0, `rgba(56, 189, 248, ${(boost * 0.22).toFixed(3)})`);
          bloomGrad.addColorStop(0.55, `rgba(${clusterToneRgb}, ${(boost * 0.09).toFixed(3)})`);
          bloomGrad.addColorStop(1, 'rgba(8, 12, 20, 0)');
          ctx.globalAlpha = 1;
          ctx.fillStyle = bloomGrad;
          ctx.beginPath();
          ctx.arc(cluster.cx, cluster.cy, 185, 0, Math.PI * 2);
          ctx.fill();
        }

        const drawnPairs = new Set<string>();

        const drawConstellationEdge = (idxA: number, idxB: number, strengthFactor: number) => {
          const lo = Math.min(idxA, idxB);
          const hi = Math.max(idxA, idxB);
          const key = `${lo}-${hi}`;
          if (drawnPairs.has(key)) return;
          drawnPairs.add(key);

          const a = cluster.stars[lo];
          const b = cluster.stars[hi];
          const coreAlpha = Math.min(0.92, 0.18 + strengthFactor * 0.18 + boost * 0.56);

          ctx.globalAlpha = 1;

          // Double-pass neon outer glow when cursor energizes the constellation
          if (boost > 0.12) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(34, 211, 238, ${(boost * 0.28).toFixed(3)})`;
            ctx.lineWidth = 3.5;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle =
            boost > 0.2
              ? `rgba(125, 211, 252, ${coreAlpha.toFixed(3)})`
              : `rgba(${clusterToneRgb}, ${coreAlpha.toFixed(3)})`;
          ctx.lineWidth = 0.85 + boost * 0.65;
          ctx.stroke();
        };

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

        for (let e = 0; e < cluster.guaranteedEdges.length; e++) {
          const [i, j] = cluster.guaranteedEdges[e];
          drawConstellationEdge(i, j, 0.42);
        }

        // Magnetic synapse rays from cursor to stars within 210px
        if (interactive && pointer.strength > 0.02) {
          for (let s = 0; s < cluster.stars.length; s++) {
            const star = cluster.stars[s];
            const dx = pointer.smoothX - star.x;
            const dy = pointer.smoothY - star.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < magnetRadiusSq) {
              const dist = Math.sqrt(dSq);
              const rayAlpha = (1 - dist / magnetRadius) * 0.62 * pointer.strength;
              ctx.globalAlpha = 1;
              ctx.beginPath();
              ctx.moveTo(pointer.smoothX, pointer.smoothY);
              ctx.lineTo(star.x, star.y);
              ctx.strokeStyle = `rgba(34, 211, 238, ${rayAlpha.toFixed(3)})`;
              ctx.lineWidth = 1.25;
              ctx.stroke();
            }
          }
        }

        // Render cluster stars
        for (let s = 0; s < cluster.stars.length; s++) {
          const star = cluster.stars[s];
          const twinkle = Math.sin(timeMs * star.twinkleSpeed + star.twinklePhase) * 0.14;
          const alpha = Math.min(1, Math.max(0.32, star.baseAlpha + twinkle + boost * 0.45));
          const spriteSize = star.radius * (10.5 + boost * 7);

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

      // Primary lock-on beam & target ring on the nearest star to cursor
      if (
        interactive &&
        pointer.strength > 0.05 &&
        globalNearestStar &&
        globalNearestStar.distSq < magnetRadiusSq * 1.45
      ) {
        const dist = Math.sqrt(globalNearestStar.distSq);
        const beamAlpha = Math.max(0, 1 - dist / (magnetRadius * 1.2)) * 0.85 * pointer.strength;

        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(pointer.smoothX, pointer.smoothY);
        ctx.lineTo(globalNearestStar.x, globalNearestStar.y);
        ctx.strokeStyle = `rgba(186, 230, 253, ${beamAlpha.toFixed(3)})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Crisp pulsing lock-on ring around nearest star
        const ringRadius = 7 + Math.sin(timeMs * 0.008) * 2;
        ctx.beginPath();
        ctx.arc(globalNearestStar.x, globalNearestStar.y, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34, 211, 238, ${(beamAlpha * 0.85).toFixed(3)})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      // 3. Shooting Stars ("Eureka Stars")
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life += 1;

        const progress = s.life / s.maxLife;
        if (progress >= 1) {
          shootingStars.splice(i, 1);
          continue;
        }

        const fade = Math.sin(progress * Math.PI);
        const speed = Math.hypot(s.vx, s.vy) || 1;
        const tailX = s.x - (s.vx / speed) * s.length;
        const tailY = s.y - (s.vy / speed) * s.length;

        ctx.globalAlpha = 1;
        ctx.lineCap = 'round';

        // Outer luminous tail pass
        const outerGrad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        outerGrad.addColorStop(0, `rgba(${s.rgb}, 0)`);
        outerGrad.addColorStop(0.65, `rgba(${s.rgb}, ${(fade * 0.32).toFixed(3)})`);
        outerGrad.addColorStop(1, `rgba(${s.rgb}, ${(fade * 0.72).toFixed(3)})`);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = outerGrad;
        ctx.lineWidth = 5;
        ctx.stroke();

        // Crisp core tail pass
        const coreGrad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        coreGrad.addColorStop(0, `rgba(${s.rgb}, 0)`);
        coreGrad.addColorStop(0.7, `rgba(${s.rgb}, ${(fade * 0.75).toFixed(3)})`);
        coreGrad.addColorStop(1, `rgba(255, 255, 255, ${(fade * 0.98).toFixed(3)})`);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.strokeStyle = coreGrad;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 4-point star flare at the head
        const flareSize = 6.5 * fade;
        ctx.fillStyle = `rgba(255, 255, 255, ${fade.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(s.x - flareSize, s.y);
        ctx.lineTo(s.x + flareSize, s.y);
        ctx.moveTo(s.x, s.y - flareSize);
        ctx.lineTo(s.x, s.y + flareSize);
        ctx.strokeStyle = `rgba(255, 255, 255, ${(fade * 0.9).toFixed(3)})`;
        ctx.lineWidth = 1.25;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };

    let rafId = 0;
    let isVisible = !document.hidden;
    let frameCount = 0;
    let lastFpsCheck = performance.now();

    const loop = (now: number) => {
      if (!isVisible) return;
      drawFrame(now);

      frameCount += 1;
      if (now - lastFpsCheck >= 1000) {
        const measuredFps = Math.round((frameCount * 1000) / (now - lastFpsCheck));
        frameCount = 0;
        lastFpsCheck = now;
        updateTelemetrySnapshot(measuredFps, true);
      }

      rafId = requestAnimationFrame(loop);
    };

    const startLoop = () => {
      cancelAnimationFrame(rafId);
      if (isVisible) {
        lastFpsCheck = performance.now();
        frameCount = 0;
        rafId = requestAnimationFrame(loop);
      }
    };

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        updateTelemetrySnapshot(telemetry.fps, true);
        startLoop();
      } else {
        cancelAnimationFrame(rafId);
        updateTelemetrySnapshot(0, false);
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
      if (!interactive) return;
      pointer.targetX = e.clientX;
      pointer.targetY = e.clientY;
      pointer.active = true;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      pointer.targetX = e.clientX;
      pointer.targetY = e.clientY;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    startLoop();
    scheduleNextShootingStar(1000);

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
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
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('mouseleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      spawnShootingStarRef.current = null;
      regenerateRef.current = null;
    };
  }, [clusterCount, microStarCount, density, showAmbientGlows, showStars, interactive]);

  return (
    <>
      <div
        ref={containerRef}
        className={`fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-50 dark:bg-[#080C14] transition-opacity duration-500 ${
          isExamActive ? 'opacity-40' : 'opacity-100'
        } ${className}`}
        aria-hidden="true"
      >
        {/* Subtle Cosmic Dot-Grid Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 dark:opacity-30" />

        {/* Feature 3: Vivid 3-Orb Cosmic Aurora Ambient Layer (Cyan, Indigo, Amber) */}
        {showAmbientGlows && (
          <div
            className={`absolute inset-0 transition-opacity duration-500 ${
              pulseFlash ? 'opacity-90' : 'opacity-100'
            }`}
          >
            <div
              className="absolute -top-28 -left-24 w-[48vw] h-[48vw] min-w-[320px] min-h-[320px] max-w-[740px] max-h-[740px] rounded-full opacity-35 dark:opacity-55 animate-pulse-slow transform-gpu"
              style={{
                background:
                  'radial-gradient(circle, rgba(6, 182, 212, 0.52) 0%, rgba(6, 182, 212, 0.14) 48%, transparent 72%)',
                filter: 'blur(80px)',
              }}
            />
            <div
              className="absolute top-[16%] -right-24 w-[44vw] h-[44vw] min-w-[300px] min-h-[300px] max-w-[700px] max-h-[700px] rounded-full opacity-35 dark:opacity-55 animate-float transform-gpu"
              style={{
                background:
                  'radial-gradient(circle, rgba(99, 102, 241, 0.55) 0%, rgba(99, 102, 241, 0.16) 48%, transparent 72%)',
                filter: 'blur(80px)',
              }}
            />
            <div
              className="absolute -bottom-32 left-[24%] w-[42vw] h-[42vw] min-w-[280px] min-h-[280px] max-w-[640px] max-h-[640px] rounded-full opacity-25 dark:opacity-45 animate-pulse-slow transform-gpu"
              style={{
                background:
                  'radial-gradient(circle, rgba(245, 158, 11, 0.42) 0%, rgba(245, 158, 11, 0.1) 48%, transparent 72%)',
                filter: 'blur(80px)',
              }}
            />
          </div>
        )}

        {/* Feature 1 & 2: Interactive Procedural Constellation & Shooting Star Canvas */}
        {showStars && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 block w-full h-full opacity-85 dark:opacity-100"
          />
        )}
      </div>

      {/* Feature 4: Collapsible Telemetry & Interactive Control HUD Pill */}
      {showHud && !isExamActive && (
        <div className="fixed bottom-20 md:bottom-5 left-4 z-30 max-w-[calc(100vw-2rem)] pointer-events-auto">
          {hudCollapsed ? (
            <button
              type="button"
              onClick={() => setHudCollapsed(false)}
              title="Mở bảng điều khiển chòm sao & thông số hiệu năng"
              className="glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-cyan-300 border border-cyan-400/30 hover:border-cyan-400/70 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all cursor-pointer"
            >
              <span>✦</span>
              <span className="font-mono">{telemetry.fps} FPS</span>
            </button>
          ) : (
            <div className="glass-pill flex flex-wrap items-center gap-2 px-3 py-2 rounded-2xl sm:rounded-full border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.45)] text-[11px] sm:text-xs text-slate-200">
              <span className="inline-flex items-center gap-1.5 font-mono text-cyan-300 font-semibold">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ✦ {telemetry.clusters} Chòm sao · {telemetry.stars} Sao · {telemetry.fps} FPS · DPR{' '}
                {telemetry.dpr}x
              </span>

              <span className="hidden sm:inline text-slate-500">|</span>

              <button
                type="button"
                onClick={handleRegenerate}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/40 text-indigo-100 font-semibold transition-colors cursor-pointer"
              >
                🎲 Tạo chòm sao mới
              </button>

              <button
                type="button"
                onClick={handleSpawnShootingStar}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 text-cyan-100 font-semibold transition-colors cursor-pointer"
              >
                ☄️ Sao băng
              </button>

              <button
                type="button"
                onClick={() => setHudCollapsed(true)}
                aria-label="Thu gọn HUD nền"
                title="Thu gọn"
                className="w-6 h-6 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
