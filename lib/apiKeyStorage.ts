export const GOOGLE_AI_STUDIO_KEY_URL = 'https://aistudio.google.com/apikey';
export const GEMINI_SESSION_KEY = 'gemini_custom_api_key';

/**
 * Reads the user's BYOK Gemini API key strictly from sessionStorage
 * and proactively removes any legacy copy from localStorage.
 */
export function getSessionGeminiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    if (localStorage.getItem(GEMINI_SESSION_KEY) !== null) {
      localStorage.removeItem(GEMINI_SESSION_KEY);
    }
    return sessionStorage.getItem(GEMINI_SESSION_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

/**
 * Persists or removes the temporary BYOK Gemini API key in sessionStorage only.
 */
export function setSessionGeminiKey(rawKey: string): void {
  if (typeof window === 'undefined') return;
  const cleaned = rawKey.trim();
  try {
    localStorage.removeItem(GEMINI_SESSION_KEY);
    if (cleaned) {
      sessionStorage.setItem(GEMINI_SESSION_KEY, cleaned);
    } else {
      sessionStorage.removeItem(GEMINI_SESSION_KEY);
    }
  } catch {
    // Ignore storage access errors in restricted private browsing modes
  }
}

/**
 * Clears the BYOK Gemini API key from all browser storage layers.
 */
export function clearSessionGeminiKey(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(GEMINI_SESSION_KEY);
    localStorage.removeItem(GEMINI_SESSION_KEY);
  } catch {
    // Ignore storage access errors
  }
}
