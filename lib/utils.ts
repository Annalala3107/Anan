/**
 * Universal utility functions for question parsing, normalization, and comparison.
 */

/**
 * Strips leading option labels like "A. ", "B) ", "C: " to prevent duplicate badge rendering.
 * e.g. "A. (11000100)2" -> "(11000100)2"
 */
export function cleanOptionText(text?: string): string {
  if (!text) return '';
  return text.replace(/^[A-Fa-f][.)\s:]+\s*/, '').trim();
}

/**
 * Extracts the single-letter choice key from an option string if present.
 * e.g. "B. 4" -> "B", "C) Stack" -> "C"
 */
export function extractOptionKey(text?: string): string | null {
  if (!text) return null;
  const match = text.trim().match(/^[A-Fa-f](?=[.)\s:])/);
  return match ? match[0].toUpperCase() : null;
}

export interface ParsedAnswerKeys {
  keys: string[];
  isOrMode: boolean;
}

export interface QuestionAnswerMeta {
  isMultiSelect: boolean;
  requiredCount: number;
  correctChoices: string[];
  answerKeys: string[];
  isOrMode: boolean;
}

/**
 * Parses an answer key string (e.g. "B", "A, B, C", "B hoặc C") into normalized uppercase keys
 * and detects whether the keys represent an OR choice ("hoặc" / "or") vs a multi-select AND choice.
 */
export function parseAnswerKeys(answerKey?: string): ParsedAnswerKeys {
  if (!answerKey || !answerKey.trim()) {
    return { keys: [], isOrMode: false };
  }

  const raw = answerKey.trim();
  const isOrMode = /(?:^|[\s,/;|])(?:hoặc|or)(?=[\s,/;|]|$)/i.test(raw);

  const tokens = raw
    .split(/[,/;\s]+/)
    .map((t) => t.trim().toUpperCase())
    .filter((t) => /^[A-F]$/.test(t));

  const keys = Array.from(new Set(tokens));
  return { keys, isOrMode };
}

/**
 * Splits a single or pipe-delimited multi-answer correctWord string into individual choices,
 * without breaking logical OR operators ("||") inside programming questions.
 */
export function splitCorrectChoices(
  correctWord?: string,
  answerKey?: string,
  options?: string[]
): string[] {
  const raw = (correctWord || '').trim();
  let parts: string[] = [];

  if (raw) {
    // Prefer splitting before an explicit option prefix (" | B. ..."), otherwise split on single spaced pipe (" | ") not adjacent to another "|"
    if (/\s+\|\s+(?=[A-Fa-f][.)\s:])/.test(raw)) {
      parts = raw
        .split(/\s+\|\s+(?=[A-Fa-f][.)\s:])/)
        .map((p) => p.trim())
        .filter(Boolean);
    } else if (/(?<!\|)\s+\|\s+(?!\|)/.test(raw)) {
      parts = raw
        .split(/(?<!\|)\s+\|\s+(?!\|)/)
        .map((p) => p.trim())
        .filter(Boolean);
    } else {
      parts = [raw];
    }
  }

  // Fallback: if answerKey lists multiple keys (e.g. "A, B") and options are available,
  // resolve any missing choices from options directly.
  if (options && options.length > 0 && answerKey) {
    const { keys, isOrMode } = parseAnswerKeys(answerKey);
    if (!isOrMode && keys.length > parts.length) {
      const resolved = options.filter((opt) => {
        const k = extractOptionKey(opt);
        return k ? keys.includes(k) : false;
      });
      if (resolved.length > parts.length) {
        parts = resolved;
      }
    }
  }

  return parts;
}

/**
 * Computes multi-select metadata and normalized target list for a question.
 */
export function getQuestionAnswerMeta(
  correctWord?: string,
  answerKey?: string,
  options?: string[],
  explicitCorrectOptions?: string[]
): QuestionAnswerMeta {
  const { keys: answerKeys, isOrMode } = parseAnswerKeys(answerKey);
  const rawChoices =
    explicitCorrectOptions && explicitCorrectOptions.length > 0
      ? explicitCorrectOptions.filter(Boolean)
      : splitCorrectChoices(correctWord, answerKey, options);

  // Deduplicate choices by normalized cleaned text (or raw lowercase if clean is empty)
  const seen = new Set<string>();
  const correctChoices: string[] = [];
  for (const choice of rawChoices) {
    const norm = (cleanOptionText(choice) || choice).trim().toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      correctChoices.push(choice);
    }
  }

  const isMultiSelect = !isOrMode && (correctChoices.length > 1 || answerKeys.length > 1);
  const requiredCount = isMultiSelect
    ? Math.max(correctChoices.length, answerKeys.length)
    : 1;

  return {
    isMultiSelect,
    requiredCount,
    correctChoices,
    answerKeys,
    isOrMode,
  };
}

/**
 * Checks whether a single choice matches a single target option string.
 */
function isSingleOptionMatch(userChoice: string, targetChoice: string): boolean {
  const userRaw = userChoice.trim().toLowerCase();
  const targetRaw = targetChoice.trim().toLowerCase();
  if (!userRaw || !targetRaw) return false;
  if (userRaw === targetRaw) return true;

  const userKey = extractOptionKey(userChoice)?.toLowerCase();
  const targetKey = extractOptionKey(targetChoice)?.toLowerCase();
  if (userKey && targetKey && userKey === targetKey) return true;

  const userClean = cleanOptionText(userChoice).toLowerCase();
  const targetClean = cleanOptionText(targetChoice).toLowerCase();
  if (userClean && targetClean && userClean === targetClean) return true;

  return false;
}

function consumeBalancedParentheses(str: string): string {
  if (!str.startsWith('(')) return str;
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') {
      depth--;
      if (depth === 0) {
        return str.slice(i + 1);
      }
    }
  }
  return str;
}

/**
 * Rewrites stale leading answer letters (e.g. "Đáp án đúng: A, B, C (A. FIFO | ...)")
 * to match the currently displayed option order when shuffleChoices is enabled,
 * while preserving any trailing explanatory notes.
 */
export function formatExplanationForCurrentOptions(
  explanation: string | undefined,
  currentOptions: string[] | undefined,
  correctWord: string | undefined,
  answerKey: string | undefined,
  isShuffled: boolean,
  explicitCorrectOptions?: string[]
): string {
  const raw = (explanation || '').trim();
  if (!raw || !isShuffled || !currentOptions || currentOptions.length === 0) {
    return raw;
  }

  const matched: { letter: string; text: string }[] = [];
  currentOptions.forEach((opt, idx) => {
    if (isAnswerMatch(opt, correctWord, undefined, explicitCorrectOptions)) {
      matched.push({
        letter: String.fromCharCode(65 + idx),
        text: cleanOptionText(opt) || opt,
      });
    }
  });

  if (matched.length === 0) {
    return raw;
  }

  const lettersSummary = matched.map((m) => m.letter).join(', ');
  const detailsSummary = matched.map((m) => `${m.letter}. ${m.text}`).join(' | ');
  const currentHeader = `Đáp án đúng (vị trí hiện tại): ${lettersSummary} (${detailsSummary})`;

  const headerRegex =
    /^(?:Đáp\s*án(?:\s*đúng)?|Answer)\s*[:=]?\s*[A-Fa-f](?:\s*(?:,|hoặc|or|and|và|\/)\s*[A-Fa-f])*(?:\s*[.)]|\b)\s*/i;
  const headerMatch = raw.match(headerRegex);
  if (!headerMatch) {
    return raw;
  }

  let remainder = raw.slice(headerMatch[0].length).trim();

  if (/^\(\s*[A-Fa-f][.)\s:]/.test(remainder)) {
    remainder = consumeBalancedParentheses(remainder).trim();
  }

  remainder = remainder.replace(/^[.\-–—:;]+\s*/, '').trim();
  return remainder ? `${currentHeader} — ${remainder}` : currentHeader;
}

/**
 * Formats a list of choices with their displayed A-F letter positions in `currentOptions`.
 */
export function formatChoicesWithDisplayLetters(
  choices: string[],
  currentOptions?: string[],
  isShuffled?: boolean
): string[] {
  if (!choices || choices.length === 0) return [];
  if (!isShuffled || !currentOptions || currentOptions.length === 0) {
    return choices;
  }

  return choices.map((choice) => {
    let idx = currentOptions.indexOf(choice);
    if (idx === -1) {
      idx = currentOptions.findIndex((opt) => isSingleOptionMatch(choice, opt));
    }
    const clean = cleanOptionText(choice) || choice;
    return idx >= 0 ? `${String.fromCharCode(65 + idx)}. ${clean}` : clean;
  });
}

/**
 * Accurately compares a single user choice against the question's correct answer(s),
 * supporting single answers ("B"), OR answers ("B hoặc C"), and multi-answers ("A. X | B. Y").
 */
export function isAnswerMatch(
  userChoice?: string,
  correctWord?: string,
  answerKey?: string,
  explicitCorrectOptions?: string[]
): boolean {
  if (!userChoice) return false;

  const { keys: validKeys } = parseAnswerKeys(answerKey);
  const userKey = extractOptionKey(userChoice);
  if (validKeys.length > 0 && userKey && validKeys.includes(userKey)) {
    return true;
  }

  const targetChoices =
    explicitCorrectOptions && explicitCorrectOptions.length > 0
      ? explicitCorrectOptions
      : splitCorrectChoices(correctWord, answerKey);

  for (const target of targetChoices) {
    if (isSingleOptionMatch(userChoice, target)) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates a user's full selection for both single-choice and multi-select questions.
 * - Single-choice: passes when the chosen option matches any valid answer (supports "B hoặc C").
 * - Multi-select: passes only when the user selects all required correct answers with no extras or misses.
 */
export function isQuestionAnsweredCorrectly(
  userSelection: string | string[] | undefined,
  correctWord?: string,
  answerKey?: string,
  explicitCorrectOptions?: string[]
): boolean {
  const selected = Array.isArray(userSelection)
    ? userSelection.filter(Boolean)
    : userSelection
    ? [userSelection]
    : [];

  if (selected.length === 0) return false;

  const meta = getQuestionAnswerMeta(correctWord, answerKey, undefined, explicitCorrectOptions);

  if (!meta.isMultiSelect) {
    return (
      selected.length === 1 &&
      isAnswerMatch(selected[0], correctWord, answerKey, meta.correctChoices)
    );
  }

  if (selected.length !== meta.requiredCount) {
    return false;
  }

  // Match against explicit/parsed target choices when we have all of them
  if (meta.correctChoices.length >= meta.requiredCount) {
    const matchedTargetIndices = new Set<number>();
    for (const choice of selected) {
      let matchedAny = false;
      for (let i = 0; i < meta.correctChoices.length; i++) {
        if (!matchedTargetIndices.has(i) && isSingleOptionMatch(choice, meta.correctChoices[i])) {
          matchedTargetIndices.add(i);
          matchedAny = true;
          break;
        }
      }
      if (!matchedAny) return false;
    }
    return matchedTargetIndices.size === meta.requiredCount;
  }

  // Fallback when only answerKeys are available (unshuffled)
  if (meta.answerKeys.length >= meta.requiredCount) {
    const matchedKeys = new Set<string>();
    for (const choice of selected) {
      const k = extractOptionKey(choice);
      if (!k || !meta.answerKeys.includes(k) || matchedKeys.has(k)) {
        return false;
      }
      matchedKeys.add(k);
    }
    return matchedKeys.size === meta.requiredCount;
  }

  return false;
}

/**
 * Fast, deterministic 32-bit FNV-1a hash algorithm.
 * Converts any arbitrary text string into a clean, collision-resistant 8-char hex hash.
 */
export function hashString(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Generates an infallible, collision-resistant unique key for SRS progress tracking.
 * Combines question stem, options signature, and answer/definition to prevent collisions
 * across questions with identical starting prompts or short answer keys.
 */
export function getQuestionKey(item: {
  id?: string | number;
  question?: string;
  word?: string;
  options?: string[];
  correctWord?: string;
  answer?: string;
}): string {
  if (item.id !== undefined && item.id !== null && String(item.id).trim() !== '') {
    return String(item.id).trim();
  }

  // If question exists, create a deterministic composite signature
  if (item.question && item.question.trim()) {
    const qText = item.question.trim();
    const optSignature = Array.isArray(item.options) ? item.options.join('|') : '';
    const answerSig = item.correctWord || item.answer || item.word || '';
    const composite = `${qText}::${optSignature}::${answerSig}`;

    // Create readable slug prefix + deterministic hash suffix
    const slugPrefix = qText
      .slice(0, 32)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    return `q_${slugPrefix || 'mcq'}_${hashString(composite)}`;
  }

  if (item.word && item.word.trim()) {
    return `w_${hashString(item.word.trim().toLowerCase())}`;
  }

  return `item_${hashString(JSON.stringify(item))}`;
}

/**
 * Fisher-Yates unbiased shuffle.
 * When `forceChange` is true and the array has > 1 item, rotates by 1 if shuffle leaves order unchanged.
 */
export function shuffleArray<T>(arr: T[], forceChange = false): T[] {
  if (arr.length <= 1) return [...arr];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  if (forceChange && copy.every((val, idx) => val === arr[idx])) {
    const first = copy.shift()!;
    copy.push(first);
  }
  return copy;
}
