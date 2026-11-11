/**
 * Universal utility functions for question parsing, normalization, and comparison.
 */

/**
 * Strips leading option labels like "A. ", "B) ", "C: " to prevent duplicate badge rendering.
 * e.g. "A. (11000100)2" -> "(11000100)2"
 */
export function cleanOptionText(text?: string): string {
  if (!text) return '';
  return text.replace(/^[A-Da-d][.)\s:]+\s*/, '').trim();
}

/**
 * Extracts the single-letter choice key from an option string if present.
 * e.g. "B. 4" -> "B", "C) Stack" -> "C"
 */
export function extractOptionKey(text?: string): string | null {
  if (!text) return null;
  const match = text.trim().match(/^[A-Da-d](?=[.)\s:])/);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Accurately compares user's choice with the question's correct answer,
 * handling letter keys ('A', 'B'), full options ('A. Option 1'), and clean text ('Option 1').
 */
export function isAnswerMatch(
  userChoice?: string,
  correctWord?: string,
  answerKey?: string
): boolean {
  if (!userChoice) return false;

  const userRaw = userChoice.trim().toLowerCase();
  const correctRaw = (correctWord || '').trim().toLowerCase();
  const keyRaw = (answerKey || '').trim().toLowerCase();

  // 1. Exact raw match
  if (userRaw === correctRaw) return true;

  // 2. Answer key letter match (e.g. user selected "B. 4", answer key is "B")
  const userKey = extractOptionKey(userChoice)?.toLowerCase();
  if (keyRaw && userKey === keyRaw) return true;

  // 3. Extracted key matches correctWord key
  const correctOptionKey = extractOptionKey(correctWord)?.toLowerCase();
  if (userKey && correctOptionKey && userKey === correctOptionKey) return true;

  // 4. Cleaned text match (without A., B., C., D.)
  const userClean = cleanOptionText(userChoice).toLowerCase();
  const correctClean = cleanOptionText(correctWord).toLowerCase();
  if (userClean && correctClean && userClean === correctClean) return true;

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
