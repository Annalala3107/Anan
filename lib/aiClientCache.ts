import { CachedAiExplanation } from '@/lib/aiCacheKey';
import { idbGet, idbSet } from '@/lib/idbStorage';

const IDB_AI_CACHE_KEY = 'ananquiz_ai_explain_cache_v2';
const LEGACY_SESSION_CACHE_KEY = 'ananquiz_ai_explain_cache_v1';
const MAX_CLIENT_AI_CACHE_ENTRIES = 250;
const FALLBACK_SESSION_MAX = 60;

const memoryCache = new Map<string, CachedAiExplanation>();
let hydrationPromise: Promise<void> | null = null;
let isHydrated = false;

function isValidExplanation(val: unknown): val is CachedAiExplanation {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Partial<CachedAiExplanation>;
  return Boolean(
    (typeof obj.coreConcept === 'string' && obj.coreConcept.trim()) ||
      (typeof obj.trapAnalysis === 'string' && obj.trapAnalysis.trim()) ||
      (typeof obj.mnemonic === 'string' && obj.mnemonic.trim())
  );
}

function enforceLruLimit(limit: number): void {
  while (memoryCache.size > limit) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey === undefined) break;
    memoryCache.delete(oldestKey);
  }
}

function touchMemoryCache(key: string, value: CachedAiExplanation): void {
  if (memoryCache.has(key)) {
    memoryCache.delete(key);
  }
  memoryCache.set(key, value);
  enforceLruLimit(MAX_CLIENT_AI_CACHE_ENTRIES);
}

function readLegacySessionEntry(legacyKey?: string): CachedAiExplanation | null {
  if (typeof window === 'undefined' || !legacyKey) return null;
  try {
    const raw = sessionStorage.getItem(LEGACY_SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const hit = parsed?.[legacyKey];
    return isValidExplanation(hit) ? hit : null;
  } catch {
    return null;
  }
}

function readV2SessionEntry(v2Key: string): CachedAiExplanation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(IDB_AI_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const hit = parsed?.[v2Key];
    return isValidExplanation(hit) ? hit : null;
  } catch {
    return null;
  }
}

function writeFallbackSession(v2Key: string, value: CachedAiExplanation): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(IDB_AI_CACHE_KEY);
    const prev: Record<string, CachedAiExplanation> = raw ? JSON.parse(raw) : {};
    const keys = Object.keys(prev);
    if (keys.length >= FALLBACK_SESSION_MAX) {
      delete prev[keys[0]];
    }
    prev[v2Key] = value;
    sessionStorage.setItem(IDB_AI_CACHE_KEY, JSON.stringify(prev));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Hydrates L1 memory cache once per session from IndexedDB without overwriting fresher writes.
 */
async function hydrateCacheFromIdb(): Promise<void> {
  if (isHydrated || typeof window === 'undefined') return;
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      const stored = await idbGet<
        Array<[string, CachedAiExplanation]> | Record<string, CachedAiExplanation>
      >(IDB_AI_CACHE_KEY);

      if (stored) {
        const entries: Array<[string, CachedAiExplanation]> = Array.isArray(stored)
          ? stored
          : Object.entries(stored);

        const freshOverrides = new Map(memoryCache);
        memoryCache.clear();
        for (const [k, v] of entries) {
          if (typeof k === 'string' && isValidExplanation(v)) {
            memoryCache.set(k, v);
          }
        }
        freshOverrides.forEach((v, k) => {
          touchMemoryCache(k, v);
        });
        enforceLruLimit(MAX_CLIENT_AI_CACHE_ENTRIES);
      }
    } catch {
      // Ignore IDB hydration errors
    } finally {
      isHydrated = true;
    }
  })();

  return hydrationPromise;
}

/**
 * Synchronous L1 lookup (useful during initial component mount before async IDB hydration completes).
 */
export function getCachedAiExplanationSync(
  v2Key: string,
  legacyV1Key?: string
): CachedAiExplanation | null {
  const memHit = memoryCache.get(v2Key);
  if (memHit) return memHit;

  const v2SessionHit = readV2SessionEntry(v2Key);
  if (v2SessionHit) {
    touchMemoryCache(v2Key, v2SessionHit);
    return v2SessionHit;
  }

  const legacyHit = readLegacySessionEntry(legacyV1Key);
  if (legacyHit) {
    touchMemoryCache(v2Key, legacyHit);
    return legacyHit;
  }

  return null;
}

/**
 * Asynchronous L1 + IndexedDB LRU lookup with lazy migration from legacy sessionStorage.
 */
export async function getCachedAiExplanationAsync(
  v2Key: string,
  legacyV1Key?: string
): Promise<CachedAiExplanation | null> {
  await hydrateCacheFromIdb();

  const hit = memoryCache.get(v2Key) || readV2SessionEntry(v2Key);
  if (hit) {
    touchMemoryCache(v2Key, hit);
    return hit;
  }

  const legacyHit = readLegacySessionEntry(legacyV1Key);
  if (legacyHit) {
    await setCachedAiExplanation(v2Key, legacyHit);
    return legacyHit;
  }

  return null;
}

/**
 * Persists an explanation to L1 memory + IndexedDB LRU cache (up to 250 entries).
 */
export async function setCachedAiExplanation(
  v2Key: string,
  value: CachedAiExplanation
): Promise<void> {
  if (!isValidExplanation(value)) return;

  await hydrateCacheFromIdb();
  touchMemoryCache(v2Key, value);

  if (typeof window === 'undefined') return;
  try {
    await idbSet(IDB_AI_CACHE_KEY, Array.from(memoryCache.entries()));
  } catch {
    writeFallbackSession(v2Key, value);
  }
  writeFallbackSession(v2Key, value);
}
