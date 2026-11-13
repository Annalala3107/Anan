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
  /** Toggle static GPU-baked Cosmic Aurora layer */
  showAmbientGlows?: boolean;
  /** Toggle HTML5 Canvas star & constellation rendering */
  showStars?: boolean;
  /** Enable mouse magnetic glow and interactive beams */
  interactive?: boolean;
  /** Show collapsible bottom-left telemetry & control HUD pill */
  showHud?: boolean;
}

const STAR_COLORS = ['#38bdf8', '#818cf8', '#22d3ee', '#fbbf24'] as const;
const TWO_PI = Math.PI * 2;

interface ConstellationStar {
  offsetX: number;
  offsetY: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitPhase: number;
  x: number;
  y: number;
  radius: number;
  colorIdx: 0 | 1 | 2 | 3;
}

interface ConstellationCluster {
  cx: number;
  cy: number;
  vx: number;
  vy: number;
  colorIdx: 0 | 1 | 2 | 3;
  energized: boolean;
  stars: ConstellationStar[];
  /** Pre-computed intra-cluster edges (zero allocations during animation loop) */
  edges: Array<[number, number]>;
}

interface MicroStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  colorIdx: 0 | 1 | 2 | 3;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
  maxLife: number;
  color: string;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

/**
 * Generates stratified constellation clusters with pre-computed intra-cluster
 * edges so the animation loop performs zero topology allocations.
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
  const maxEdgeDistSq = (isMobile ? 95 : 115) ** 2;

  const clusters: ConstellationCluster[] = [];

  for (let idx = 0; idx < count; idx++) {
    const cell = cells[idx % cells.length];
    const cx = marginX + (cell.col + randomBetween(0.22, 0.78)) * cellW;
    const cy = marginY + (cell.row + randomBetween(0.22, 0.78)) * cellH;
    const clusterColorIdx = ((idx + randomInt(0, 3)) % 4) as 0 | 1 | 2 | 3;
    const driftAngle = randomBetween(0, TWO_PI);
    const driftSpeed = randomBetween(0.05, 0.11);

    const starCount = randomInt(4, 8);
    const stars: ConstellationStar[] = [];

    for (let s = 0; s < starCount; s++) {
      const angle = (s / starCount) * TWO_PI + randomBetween(-0.42, 0.42);
      const dist =
        s === 0
          ? randomBetween(0, 32 * radiusScale)
          : randomBetween(80 * radiusScale, 160 * radiusScale);
      const offsetX = Math.cos(angle) * dist;
      const offsetY = Math.sin(angle) * dist;
      const colorIdx =
        Math.random() < 0.78 ? clusterColorIdx : (randomInt(0, 3) as 0 | 1 | 2 | 3);

      stars.push({
        offsetX,
        offsetY,
        orbitRadius: randomBetween(2.5, 6),
        orbitSpeed: randomBetween(0.0005, 0.0012),
        orbitPhase: randomBetween(0, TWO_PI),
        x: cx + offsetX,
        y: cy + offsetY,
        radius: s === 0 ? randomBetween(2.0, 2.6) : randomBetween(1.4, 2.2),
        colorIdx,
      });
    }

    // Pre-compute unique edges once: all pairs < 115px + guaranteed nearest-neighbor
    const edgeSet = new Set<string>();
    const edges: Array<[number, number]> = [];

    const addEdge = (i: number, j: number) => {
      const lo = i < j ? i : j;
      const hi = i < j ? j : i;
      const key = `${lo}-${hi}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([lo, hi]);
      }
    };

    for (let i = 0; i < stars.length; i++) {
      let nearestIdx = -1;
      let nearestDistSq = Infinity;
      for (let j = 0; j < stars.length; j++) {
        if (i === j) continue;
        const dx = stars[i].offsetX - stars[j].offsetX;
        const dy = stars[i].offsetY - stars[j].offsetY;
        const dSq = dx * dx + dy * dy;
        if (dSq < maxEdgeDistSq && i < j) {
          addEdge(i, j);
        }
        if (dSq < nearestDistSq) {
          nearestDistSq = dSq;
          nearestIdx = j;
        }
      }
      if (nearestIdx !== -1) {
        addEdge(i, nearestIdx);
      }
    }

    clusters.push({
      cx,
      cy,
      vx: Math.cos(driftAngle) * driftSpeed,
      vy: Math.sin(driftAngle) * driftSpeed,
      colorIdx: clusterColorIdx,
      energized: false,
      stars,
      edges,
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
    const z = randomBetween(0.35, 1.0);
    const angle = randomBetween(0, TWO_PI);
    const speed = randomBetween(0.05, 0.14) * z;
    const roll = Math.random();
    const colorIdx: 0 | 1 | 2 | 3 =
      roll < 0.36 ? 0 : roll < 0.7 ? 1 : roll < 0.9 ? 2 : 3;

    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.015 * z,
      radius: 0.8 + z * 0.95,
      colorIdx,
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
  const speed = randomBetween(13, 18);

  return {
    x: startX,
    y: startY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    length: randomBetween(140, 210),
    life: 0,
    maxLife: randomInt(40, 56),
    color: Math.random() < 0.36 ? '#fbbf24' : '#22d3ee',
  };
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
  const countsRef = useRef<HTMLSpanElement | null>(null);
  const fpsRef = useRef<HTMLSpanElement | null>(null);
  const collapsedFpsRef = useRef<HTMLSpanElement | null>(null);

  const spawnShootingStarRef = useRef<(() => void) | null>(null);
  const regenerateRef = useRef<(() => void) | null>(null);

  const isExamActive = useQuizStore((state) => state.isExamActive);
  const [hudCollapsed, setHudCollapsed] = useState(false);

  const handleRegenerate = useCallback(() => {
    regenerateRef.current?.();
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

    let clusters = generateConstellations(width, height, clusterCount);
    let microStars = generateMicroStars(width, height, microStarCount, density);
    const shootingStars: ShootingStar[] = [];

    // Pre-allocated color buckets (reused every frame to avoid GC pressure)
    const starBuckets: Array<Array<{ x: number; y: number; r: number }>> = [
      [],
      [],
      [],
      [],
    ];

    const syncHudCounts = () => {
      let totalStars = microStars.length;
      for (let i = 0; i < clusters.length; i++) {
        totalStars += clusters[i].stars.length;
      }
      if (countsRef.current) {
        countsRef.current.textContent = `✦ ${clusters.length} Chòm sao · ${totalStars} Sao`;
      }
    };

    const syncHudFps = (fpsText: string) => {
      if (fpsRef.current) fpsRef.current.textContent = fpsText;
      if (collapsedFpsRef.current) collapsedFpsRef.current.textContent = fpsText;
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
      syncHudCounts();
    };

    const scheduleNextShootingStar = (delayMs?: number) => {
      if (shootingTimerId) clearTimeout(shootingTimerId);
      const wait = delayMs ?? randomInt(3800, 7200);
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
      if (nextWidth === 0 || nextHeight === 0) return;

      width = nextWidth;
      height = nextHeight;

      // Native 1x resolution matching ThinkingLab for maximum GPU fill throughput
      canvas.width = width;
      canvas.height = height;

      if (reseed) {
        clusters = generateConstellations(width, height, clusterCount);
        microStars = generateMicroStars(width, height, microStarCount, density);
      }
      syncHudCounts();
    };

    syncCanvasSize(false);

    const drawFrame = (timeMs: number) => {
      ctx.clearRect(0, 0, width, height);

      if (pointer.active && interactive) {
        pointer.smoothX += (pointer.targetX - pointer.smoothX) * 0.18;
        pointer.smoothY += (pointer.targetY - pointer.smoothY) * 0.18;
        pointer.strength += (1 - pointer.strength) * 0.14;
      } else {
        pointer.strength += (0 - pointer.strength) * 0.08;
      }

      const pointerOn = interactive && pointer.strength > 0.02;
      const magnetRadius = 180;
      const magnetRadiusSq = magnetRadius * magnetRadius;

      // Clear reusable buckets without reallocating outer arrays
      starBuckets[0].length = 0;
      starBuckets[1].length = 0;
      starBuckets[2].length = 0;
      starBuckets[3].length = 0;

      // 1. Update micro-stars and push into color buckets
      for (let i = 0; i < microStars.length; i++) {
        const m = microStars[i];
        m.x += m.vx;
        m.y += m.vy;
        if (m.x < -10) m.x = width + 10;
        else if (m.x > width + 10) m.x = -10;
        if (m.y < -10) m.y = height + 10;
        else if (m.y > height + 10) m.y = -10;

        starBuckets[m.colorIdx].push({ x: m.x, y: m.y, r: m.radius });
      }

      // 2. Update constellations, detect cursor proximity, and push stars into buckets
      let nearestStarX = 0;
      let nearestStarY = 0;
      let nearestStarDistSq = Infinity;

      const padX = Math.min(110, width * 0.15);
      const padY = Math.min(110, height * 0.15);

      for (let c = 0; c < clusters.length; c++) {
        const cluster = clusters[c];

        cluster.cx += cluster.vx;
        cluster.cy += cluster.vy;
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

        let clusterNear = false;

        for (let s = 0; s < cluster.stars.length; s++) {
          const star = cluster.stars[s];
          const orbitX = Math.cos(timeMs * star.orbitSpeed + star.orbitPhase) * star.orbitRadius;
          const orbitY =
            Math.sin(timeMs * star.orbitSpeed * 0.9 + star.orbitPhase) * star.orbitRadius;

          let wx = cluster.cx + star.offsetX + orbitX;
          let wy = cluster.cy + star.offsetY + orbitY;

          if (pointerOn) {
            const dx = wx - pointer.smoothX;
            const dy = wy - pointer.smoothY;
            const dSq = dx * dx + dy * dy;

            if (dSq < magnetRadiusSq) {
              clusterNear = true;
              if (dSq > 1) {
                const dist = Math.sqrt(dSq);
                const falloff = 1 - dist / magnetRadius;
                const push = falloff * falloff * 13 * pointer.strength;
                wx += (dx / dist) * push;
                wy += (dy / dist) * push;
              }
            }

            if (dSq < nearestStarDistSq) {
              nearestStarDistSq = dSq;
              nearestStarX = wx;
              nearestStarY = wy;
            }
          }

          star.x = wx;
          star.y = wy;
          starBuckets[star.colorIdx].push({
            x: wx,
            y: wy,
            r: clusterNear ? star.radius * 1.25 : star.radius,
          });
        }

        cluster.energized = clusterNear;
      }

      // BATCH 1: Draw all base constellation edges in ONE stroke() call
      ctx.globalAlpha = 1;
      ctx.beginPath();
      for (let c = 0; c < clusters.length; c++) {
        const cluster = clusters[c];
        const stars = cluster.stars;
        const edges = cluster.edges;
        for (let e = 0; e < edges.length; e++) {
          const a = stars[edges[e][0]];
          const b = stars[edges[e][1]];
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
      }
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.24)';
      ctx.lineWidth = 0.85;
      ctx.stroke();

      // BATCH 2: Draw energized constellation edges + cursor synapse beams in ONE stroke() call
      if (pointerOn) {
        let hasActiveGlow = false;
        ctx.beginPath();

        for (let c = 0; c < clusters.length; c++) {
          const cluster = clusters[c];
          if (!cluster.energized) continue;
          hasActiveGlow = true;

          const stars = cluster.stars;
          const edges = cluster.edges;
          for (let e = 0; e < edges.length; e++) {
            const a = stars[edges[e][0]];
            const b = stars[edges[e][1]];
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
          }

          for (let s = 0; s < stars.length; s++) {
            const star = stars[s];
            const dx = pointer.smoothX - star.x;
            const dy = pointer.smoothY - star.y;
            if (dx * dx + dy * dy < magnetRadiusSq) {
              ctx.moveTo(pointer.smoothX, pointer.smoothY);
              ctx.lineTo(star.x, star.y);
            }
          }
        }

        // Also highlight nearest star lock-on beam & ring if within extended range
        if (nearestStarDistSq < magnetRadiusSq * 1.4) {
          hasActiveGlow = true;
          ctx.moveTo(pointer.smoothX, pointer.smoothY);
          ctx.lineTo(nearestStarX, nearestStarY);
          ctx.moveTo(nearestStarX + 7, nearestStarY);
          ctx.arc(nearestStarX, nearestStarY, 7, 0, TWO_PI);
        }

        if (hasActiveGlow) {
          ctx.strokeStyle = `rgba(34, 211, 238, ${(0.62 * pointer.strength).toFixed(2)})`;
          ctx.lineWidth = 1.35;
          ctx.stroke();
        }
      }

      // BATCH 3: Draw all stars & halos grouped by 4 colors (8 fill() calls total)
      for (let colorIdx = 0; colorIdx < 4; colorIdx++) {
        const list = starBuckets[colorIdx];
        if (list.length === 0) continue;

        ctx.fillStyle = STAR_COLORS[colorIdx];

        // Outer soft halos
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        for (let i = 0; i < list.length; i++) {
          const st = list[i];
          const haloR = st.r * 2.5;
          ctx.moveTo(st.x + haloR, st.y);
          ctx.arc(st.x, st.y, haloR, 0, TWO_PI);
        }
        ctx.fill();

        // Crisp bright star cores
        ctx.globalAlpha = 0.88;
        ctx.beginPath();
        for (let i = 0; i < list.length; i++) {
          const st = list[i];
          ctx.moveTo(st.x + st.r, st.y);
          ctx.arc(st.x, st.y, st.r, 0, TWO_PI);
        }
        ctx.fill();
      }

      // BATCH 4: Zero-gradient shooting stars (2 fast strokes + 1 head dot)
      if (shootingStars.length > 0) {
        ctx.lineCap = 'round';
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
          const nx = s.vx / speed;
          const ny = s.vy / speed;
          const tailX = s.x - nx * s.length;
          const tailY = s.y - ny * s.length;
          const midX = s.x - nx * (s.length * 0.42);
          const midY = s.y - ny * (s.length * 0.42);

          // Colored tail segment
          ctx.globalAlpha = fade * 0.55;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(midX, midY);
          ctx.stroke();

          // Bright white-hot leading segment
          ctx.globalAlpha = fade * 0.95;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(midX, midY);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();

          // Head point
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(s.x, s.y, 2.1, 0, TWO_PI);
          ctx.fill();
        }
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
        syncHudFps(`${measuredFps} FPS`);
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
        startLoop();
      } else {
        cancelAnimationFrame(rafId);
        syncHudFps('Paused');
      }
    };

    let resizeDebounce: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeDebounce) clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(() => {
        syncCanvasSize(true);
      }, 140);
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
    scheduleNextShootingStar(1200);

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
  }, [clusterCount, microStarCount, density, showStars, interactive]);

  return (
    <>
      <div
        ref={containerRef}
        className={`fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-50 dark:bg-[#080C14] transition-opacity duration-500 ${
          isExamActive ? 'opacity-40' : 'opacity-100'
        } ${className}`}
        aria-hidden="true"
      >
        {/* Static GPU-Baked Cosmic Aurora Layer (Zero per-frame blur recalculation) */}
        {showAmbientGlows && (
          <div
            className="absolute inset-0 opacity-30 dark:opacity-100 pointer-events-none"
            style={{
              transform: 'translate3d(0, 0, 0)',
              backgroundImage: [
                'radial-gradient(46% 42% at 14% 16%, rgba(6, 182, 212, 0.24) 0%, rgba(6, 182, 212, 0.06) 45%, transparent 74%)',
                'radial-gradient(44% 44% at 86% 24%, rgba(99, 102, 241, 0.26) 0%, rgba(99, 102, 241, 0.07) 46%, transparent 75%)',
                'radial-gradient(40% 38% at 48% 88%, rgba(245, 158, 11, 0.16) 0%, rgba(245, 158, 11, 0.04) 44%, transparent 72%)',
              ].join(', '),
            }}
          />
        )}

        {/* Subtle Cosmic Dot-Grid Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 dark:opacity-30" />

        {/* 1x Single-Batch Interactive Constellation Canvas */}
        {showStars && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 block w-full h-full opacity-85 dark:opacity-100"
          />
        )}
      </div>

      {/* Collapsible Telemetry & Interactive Control HUD Pill (Zero-React-Rerender FPS DOM updates) */}
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
              <span ref={collapsedFpsRef} className="font-mono">
                60 FPS
              </span>
            </button>
          ) : (
            <div className="glass-pill flex flex-wrap items-center gap-2 px-3 py-2 rounded-2xl sm:rounded-full border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.45)] text-[11px] sm:text-xs text-slate-200">
              <span className="inline-flex items-center gap-1.5 font-mono text-cyan-300 font-semibold">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span ref={countsRef}>✦ 5 Chòm sao · 65 Sao</span>
                <span className="text-slate-500">·</span>
                <span ref={fpsRef}>60 FPS</span>
                <span className="text-slate-500">·</span>
                <span>1x Batch</span>
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
