import { Redis } from '@upstash/redis';
import {
  AiOptionTrap,
  CachedAiExplanation,
  CachedAiSolve,
  buildAiExplainCacheKeyV1,
  buildAiExplainCacheKeyV2,
  buildAiSolveCacheKeyV1,
  buildAiSolveCacheKeyV2,
} from '@/lib/aiCacheKey';

export type { AiOptionTrap, CachedAiExplanation, CachedAiSolve };
export {
  buildAiExplainCacheKeyV1,
  buildAiExplainCacheKeyV2,
  buildAiSolveCacheKeyV1,
  buildAiSolveCacheKeyV2,
};

export const buildAiExplainCacheKey = buildAiExplainCacheKeyV2;
export const buildAiSolveCacheKey = buildAiSolveCacheKeyV2;

const RATE_WINDOW_MS = 3600_000;
const MAX_MEMORY_RL_KEYS = 1000;
const inMemoryRateLimits = new Map<string, { count: number; resetAt: number }>();

function getRedisUrl(): string {
  return (
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim() ||
    ''
  );
}

/**
 * Returns a read/write Upstash Redis client when REST URL and write token are configured.
 */
export function getRedisWriteClient(): Redis | null {
  const url = getRedisUrl();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim() ||
    '';

  if (!url || !token) return null;
  return new Redis({ url, token });
}

/**
 * Returns a Redis client capable of reads (falls back to read-only token if write token is absent).
 */
export function getRedisReadClient(): Redis | null {
  const writeClient = getRedisWriteClient();
  if (writeClient) return writeClient;

  const url = getRedisUrl();
  const readOnlyToken = process.env.KV_REST_API_READ_ONLY_TOKEN?.trim() || '';
  if (!url || !readOnlyToken) return null;
  return new Redis({ url, token: readOnlyToken });
}

function sanitizeCachedExplanation(
  rawParsed: Partial<CachedAiExplanation> | null | undefined
): CachedAiExplanation | null {
  if (!rawParsed || typeof rawParsed.coreConcept !== 'string') return null;

  const coreConcept = rawParsed.coreConcept.trim();
  const trapAnalysis =
    typeof rawParsed.trapAnalysis === 'string' ? rawParsed.trapAnalysis.trim() : '';
  const mnemonic =
    typeof rawParsed.mnemonic === 'string' ? rawParsed.mnemonic.trim() : '';

  if (!coreConcept && !trapAnalysis && !mnemonic) return null;

  const optionTraps = Array.isArray(rawParsed.optionTraps)
    ? rawParsed.optionTraps
        .filter(
          (item): item is AiOptionTrap =>
            Boolean(item) &&
            typeof item.optionText === 'string' &&
            typeof item.reason === 'string' &&
            item.optionText.trim().length > 0 &&
            item.reason.trim().length > 0
        )
        .slice(0, 8)
        .map((item) => ({
          optionText: item.optionText.trim(),
          reason: item.reason.trim(),
        }))
    : undefined;

  const inferredAnswerTexts = Array.isArray(rawParsed.inferredAnswerTexts)
    ? rawParsed.inferredAnswerTexts
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim())
        .slice(0, 8)
    : undefined;

  return {
    coreConcept,
    trapAnalysis,
    mnemonic,
    ...(optionTraps && optionTraps.length > 0 ? { optionTraps } : {}),
    ...(inferredAnswerTexts && inferredAnswerTexts.length > 0
      ? { inferredAnswerTexts }
      : {}),
  };
}

export async function getPermanentAiExplanation(
  cacheKeyV2: string,
  fallbackV1Key?: string
): Promise<CachedAiExplanation | null> {
  const redis = getRedisReadClient();
  if (!redis) return null;

  const tryRead = async (key: string): Promise<CachedAiExplanation | null> => {
    try {
      const raw = await redis.get<CachedAiExplanation | string>(key);
      if (!raw) return null;
      const parsed =
        typeof raw === 'string'
          ? (JSON.parse(raw) as Partial<CachedAiExplanation>)
          : (raw as Partial<CachedAiExplanation>);
      return sanitizeCachedExplanation(parsed);
    } catch {
      return null;
    }
  };

  const v2Hit = await tryRead(cacheKeyV2);
  if (v2Hit) return v2Hit;

  if (fallbackV1Key && fallbackV1Key !== cacheKeyV2) {
    const v1Hit = await tryRead(fallbackV1Key);
    if (v1Hit) {
      void savePermanentAiExplanation(cacheKeyV2, v1Hit);
      return v1Hit;
    }
  }

  return null;
}

/**
 * Persists an explanation globally without TTL so subsequent learners get instant 0-quota answers.
 */
export async function savePermanentAiExplanation(
  cacheKey: string,
  value: CachedAiExplanation
): Promise<boolean> {
  const redis = getRedisWriteClient();
  if (!redis) return false;

  try {
    await redis.set(cacheKey, value);
    return true;
  } catch {
    return false;
  }
}

export async function getPermanentAiSolve(
  cacheKeyV2: string,
  fallbackV1Key?: string
): Promise<{ data: CachedAiSolve; version: 'v2' | 'v1' } | null> {
  const redis = getRedisReadClient();
  if (!redis) return null;

  const tryRead = async (key: string): Promise<CachedAiSolve | null> => {
    try {
      const raw = await redis.get<CachedAiSolve | string>(key);
      if (!raw) return null;
      const parsed =
        typeof raw === 'string'
          ? (JSON.parse(raw) as Partial<CachedAiSolve>)
          : (raw as Partial<CachedAiSolve>);

      if (parsed && typeof parsed.answer === 'string' && parsed.answer.trim()) {
        const correctOptionTexts = Array.isArray(parsed.correctOptionTexts)
          ? parsed.correctOptionTexts
              .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
              .map((t) => t.trim())
          : undefined;
        return {
          answer: parsed.answer.trim(),
          explanation:
            typeof parsed.explanation === 'string' ? parsed.explanation.trim() : '',
          ...(correctOptionTexts && correctOptionTexts.length > 0
            ? { correctOptionTexts }
            : {}),
        };
      }
    } catch {
      // Ignore cache read failures
    }
    return null;
  };

  const v2Hit = await tryRead(cacheKeyV2);
  if (v2Hit) {
    return { data: v2Hit, version: 'v2' };
  }

  if (fallbackV1Key && fallbackV1Key !== cacheKeyV2) {
    const v1Hit = await tryRead(fallbackV1Key);
    if (v1Hit) {
      return { data: v1Hit, version: 'v1' };
    }
  }

  return null;
}

/**
 * Persists a solved unanswered-quiz result permanently without TTL.
 */
export async function savePermanentAiSolve(
  cacheKey: string,
  value: CachedAiSolve
): Promise<void> {
  const redis = getRedisWriteClient();
  if (!redis) return;

  try {
    await redis.set(cacheKey, value);
  } catch {
    // Ignore storage quota or transient Redis errors
  }
}

function checkInMemoryRateLimit(
  ip: string,
  maxPerHour: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const key = ip || 'anon';

  if (inMemoryRateLimits.size >= MAX_MEMORY_RL_KEYS) {
    inMemoryRateLimits.forEach((entry, k) => {
      if (now >= entry.resetAt) {
        inMemoryRateLimits.delete(k);
      }
    });
    if (inMemoryRateLimits.size >= MAX_MEMORY_RL_KEYS) {
      const oldestKey = inMemoryRateLimits.keys().next().value;
      if (oldestKey !== undefined) {
        inMemoryRateLimits.delete(oldestKey);
      }
    }
  }

  const existing = inMemoryRateLimits.get(key);
  if (!existing || now >= existing.resetAt) {
    inMemoryRateLimits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: Math.max(0, maxPerHour - 1) };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= maxPerHour,
    remaining: Math.max(0, maxPerHour - existing.count),
  };
}

/**
 * Fair hourly rate limiter for uncached server-key Gemini requests.
 * Cache hits bypass this limit completely. Falls back to bounded in-memory limiter if Redis is absent.
 */
export async function checkAiRateLimit(
  ip: string,
  maxPerHour = 35
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedisWriteClient();
  if (!redis) {
    return checkInMemoryRateLimit(ip, maxPerHour);
  }

  try {
    const key = `ananquiz:rl:ai:${ip || 'anon'}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 3600);
    }
    return {
      allowed: count <= maxPerHour,
      remaining: Math.max(0, maxPerHour - count),
    };
  } catch {
    return checkInMemoryRateLimit(ip, maxPerHour);
  }
}
