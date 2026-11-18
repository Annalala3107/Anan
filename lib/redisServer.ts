import { Redis } from '@upstash/redis';
import { hashString } from '@/lib/utils';

export interface CachedAiExplanation {
  coreConcept: string;
  trapAnalysis: string;
  mnemonic: string;
}

export interface CachedAiSolve {
  answer: string;
  explanation: string;
}

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

function normalizeCacheSegment(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function buildAiExplainCacheKey(
  question: string,
  options: string[],
  correctAnswer: string
): string {
  const normQ = normalizeCacheSegment(question);
  const normOpts = options.map(normalizeCacheSegment).join('|');
  const normAns = normalizeCacheSegment(correctAnswer);
  return `ananquiz:ai:explain:v1:${hashString(`${normQ}::${normOpts}::${normAns}`)}`;
}

export function buildAiSolveCacheKey(question: string, options: string[]): string {
  const normQ = normalizeCacheSegment(question);
  const normOpts = options.map(normalizeCacheSegment).join('|');
  return `ananquiz:ai:solve:v1:${hashString(`${normQ}::${normOpts}`)}`;
}

export async function getPermanentAiExplanation(
  cacheKey: string
): Promise<CachedAiExplanation | null> {
  const redis = getRedisReadClient();
  if (!redis) return null;

  try {
    const raw = await redis.get<CachedAiExplanation | string>(cacheKey);
    if (!raw) return null;
    const parsed =
      typeof raw === 'string'
        ? (JSON.parse(raw) as Partial<CachedAiExplanation>)
        : (raw as Partial<CachedAiExplanation>);

    if (
      parsed &&
      typeof parsed.coreConcept === 'string' &&
      (parsed.coreConcept || parsed.trapAnalysis || parsed.mnemonic)
    ) {
      return {
        coreConcept: parsed.coreConcept || '',
        trapAnalysis: parsed.trapAnalysis || '',
        mnemonic: parsed.mnemonic || '',
      };
    }
  } catch {
    // Cache read failure must never break AI endpoint
  }
  return null;
}

/**
 * Persists an explanation globally without TTL so subsequent learners get instant 0-quota answers.
 */
export async function savePermanentAiExplanation(
  cacheKey: string,
  value: CachedAiExplanation
): Promise<void> {
  const redis = getRedisWriteClient();
  if (!redis) return;

  try {
    await redis.set(cacheKey, value);
  } catch {
    // Ignore storage quota or transient Redis errors
  }
}

export async function getPermanentAiSolve(
  cacheKey: string
): Promise<CachedAiSolve | null> {
  const redis = getRedisReadClient();
  if (!redis) return null;

  try {
    const raw = await redis.get<CachedAiSolve | string>(cacheKey);
    if (!raw) return null;
    const parsed =
      typeof raw === 'string'
        ? (JSON.parse(raw) as Partial<CachedAiSolve>)
        : (raw as Partial<CachedAiSolve>);

    if (parsed && typeof parsed.answer === 'string' && parsed.answer.trim()) {
      return {
        answer: parsed.answer.trim(),
        explanation:
          typeof parsed.explanation === 'string' ? parsed.explanation.trim() : '',
      };
    }
  } catch {
    // Ignore cache read failures
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

/**
 * Fair hourly rate limiter for uncached server-key Gemini requests.
 * Cache hits bypass this limit completely.
 */
export async function checkAiRateLimit(
  ip: string,
  maxPerHour = 35
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedisWriteClient();
  if (!redis) {
    return { allowed: true, remaining: maxPerHour };
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
    return { allowed: true, remaining: maxPerHour };
  }
}
