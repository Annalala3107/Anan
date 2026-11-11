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
 * Generates an infallible, collision-resistant unique key for SRS progress tracking.
 * Prevents questions with identical short answers (e.g. "B. 4" or "True") from overwriting each other.
 */
export function getQuestionKey(item: {
  id?: string;
  question?: string;
  word?: string;
  correctWord?: string;
}): string {
  if (item.id && item.id.trim()) {
    return item.id.trim();
  }

  if (item.question && item.question.trim()) {
    // Generate deterministic hash slug from question text
    const slug = item.question
      .trim()
      .slice(0, 60)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_');
    return `q_${slug}`;
  }

  if (item.word && item.word.trim()) {
    return `w_${item.word.trim().toLowerCase()}`;
  }

  return `item_${Math.random().toString(36).substring(2, 9)}`;
}
