import {
  cleanOptionText,
  extractOptionKey,
  hashString,
  parseAnswerKeys,
  splitCorrectChoices,
} from '@/lib/utils';

export interface AiOptionTrap {
  optionText: string;
  reason: string;
}

export interface CachedAiExplanation {
  coreConcept: string;
  trapAnalysis: string;
  mnemonic: string;
  optionTraps?: AiOptionTrap[];
  inferredAnswerTexts?: string[];
}

export interface CachedAiSolve {
  answer: string;
  explanation: string;
  correctOptionTexts?: string[];
}

/**
 * Normalizes a cache text segment by trimming, lowercasing, and collapsing whitespace.
 */
export function normalizeCacheText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Strips leading option labels and sorts options canonically so shuffled variants map to one key.
 */
export function canonicalizeOptions(options: string[]): string[] {
  return (options || [])
    .map((opt) => normalizeCacheText(cleanOptionText(opt) || opt))
    .filter(Boolean)
    .sort();
}

/**
 * Resolves clean option text(s) corresponding to an answer key string ("A" or "A, C") against options.
 */
export function extractOptionTextsFromAnswer(
  answerStr: string,
  options: string[]
): string[] {
  if (!answerStr || !options || options.length === 0) return [];
  const { keys } = parseAnswerKeys(answerStr);
  if (keys.length === 0) return [];

  const seen = new Set<string>();
  const resolved: string[] = [];

  for (const k of keys) {
    let matchedOpt = options.find((opt) => extractOptionKey(opt) === k);
    if (!matchedOpt) {
      const idx = k.charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length) {
        matchedOpt = options[idx];
      }
    }
    if (!matchedOpt) continue;

    const cleaned = (cleanOptionText(matchedOpt) || matchedOpt).trim();
    const norm = normalizeCacheText(cleaned);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      resolved.push(cleaned);
    }
  }

  return resolved;
}

/**
 * Produces canonical sorted normalized answer texts from either option letters or full answer strings.
 */
export function resolveCanonicalAnswerTexts(
  correctAnswer: string,
  options: string[]
): string[] {
  const raw = (correctAnswer || '').trim();
  if (!raw) return [];

  const rawTokens = raw
    .split(/[,/;\s]+/)
    .map((t) => t.trim())
    .filter((t) => t && !/^(?:hoặc|or)$/i.test(t));

  const isLetterList =
    rawTokens.length > 0 && rawTokens.every((t) => /^[A-Ha-h]$/.test(t));

  const rawChoices =
    isLetterList && options.length > 0
      ? extractOptionTextsFromAnswer(raw, options)
      : splitCorrectChoices(raw, undefined, options);

  const seen = new Set<string>();
  const canonical: string[] = [];

  for (const choice of rawChoices) {
    const cleaned = (cleanOptionText(choice) || choice).trim();
    const norm = normalizeCacheText(cleaned);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      canonical.push(norm);
    }
  }

  return canonical.sort();
}

export function buildAiExplainCacheKeyV1(
  question: string,
  options: string[],
  correctAnswer: string
): string {
  const normQ = normalizeCacheText(question);
  const normOpts = options.map(normalizeCacheText).join('|');
  const normAns = normalizeCacheText(correctAnswer);
  return `ananquiz:ai:explain:v1:${hashString(`${normQ}::${normOpts}::${normAns}`)}`;
}

export function buildAiExplainCacheKeyV2(
  question: string,
  options: string[],
  correctAnswer: string
): string {
  const normQ = normalizeCacheText(question);
  const sortedOpts = canonicalizeOptions(options).join('|');
  const sortedAns = resolveCanonicalAnswerTexts(correctAnswer, options).join('|');
  return `ananquiz:ai:explain:v2:${hashString(`${normQ}::${sortedOpts}::${sortedAns}`)}`;
}

export function buildAiSolveCacheKeyV1(
  question: string,
  options: string[]
): string {
  const normQ = normalizeCacheText(question);
  const normOpts = options.map(normalizeCacheText).join('|');
  return `ananquiz:ai:solve:v1:${hashString(`${normQ}::${normOpts}`)}`;
}

export function buildAiSolveCacheKeyV2(
  question: string,
  options: string[]
): string {
  const normQ = normalizeCacheText(question);
  const sortedOpts = canonicalizeOptions(options).join('|');
  return `ananquiz:ai:solve:v2:${hashString(`${normQ}::${sortedOpts}`)}`;
}

/**
 * Remaps stored canonical correct option texts back to caller's option letters ("A", "A, C").
 */
export function remapSolvedAnswerLetters(
  correctOptionTexts: string[],
  callerOptions: string[]
): string | null {
  if (!correctOptionTexts?.length || !callerOptions?.length) return null;

  const normCaller = callerOptions.map((opt) =>
    normalizeCacheText(cleanOptionText(opt) || opt)
  );
  const usedIndices = new Set<number>();

  for (const target of correctOptionTexts) {
    const normTarget = normalizeCacheText(cleanOptionText(target) || target);
    if (!normTarget) return null;

    const matchIdx = normCaller.findIndex(
      (optNorm, idx) => !usedIndices.has(idx) && optNorm === normTarget
    );
    if (matchIdx === -1) return null;
    usedIndices.add(matchIdx);
  }

  const letters = Array.from(usedIndices)
    .sort((a, b) => a - b)
    .filter((idx) => idx >= 0 && idx < 26)
    .map((idx) => String.fromCharCode(65 + idx));

  return letters.length > 0 ? letters.join(', ') : null;
}
