/**
 * Shared server-side Gemini REST caller with multi-key resolution
 * (`GEMINI_API_KEY`, `GEMINI_API_KEYS`, `GEMINI_API_KEY1..10`) and active model fallback.
 */

export const ACTIVE_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
] as const;

export function sanitizeErrorMessages(msg: string, keys: string[]): string {
  if (!msg) return 'Không thể xử lý phản hồi từ Gemini API.';
  let safe = msg;
  for (const key of keys) {
    if (key) {
      safe = safe.split(key).join('[REDACTED]');
    }
  }
  return safe;
}

export function stripJsonFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '');
  else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '');
  if (cleaned.endsWith('```')) cleaned = cleaned.replace(/```$/, '');
  return cleaned.trim();
}

export function resolveGeminiApiKeys(headerKey?: string | null, bodyKey?: unknown): string[] {
  const clientKey =
    (typeof headerKey === 'string' ? headerKey.trim() : '') ||
    (typeof bodyKey === 'string' ? bodyKey.trim() : '');

  if (clientKey) {
    return [clientKey];
  }

  const keys: string[] = [];
  const pushUnique = (raw?: string) => {
    const cleaned = raw?.trim();
    if (cleaned && !keys.includes(cleaned)) {
      keys.push(cleaned);
    }
  };

  pushUnique(process.env.GEMINI_API_KEY);

  if (process.env.GEMINI_API_KEYS) {
    for (const part of process.env.GEMINI_API_KEYS.split(/[\s,;]+/)) {
      pushUnique(part);
    }
  }

  for (let i = 1; i <= 10; i++) {
    pushUnique(process.env[`GEMINI_API_KEY${i}`]);
  }

  return keys;
}

export async function callGeminiStructured(params: {
  apiKeys: string[];
  systemText: string;
  userText: string;
  temperature: number;
  responseSchema: Record<string, unknown>;
  totalDeadlineMs?: number;
  perAttemptTimeoutMs?: number;
}): Promise<{ text?: string; error?: string; status?: number }> {
  const totalDeadlineMs = params.totalDeadlineMs ?? 28_000;
  const perAttemptTimeoutMs = params.perAttemptTimeoutMs ?? 18_000;
  const deadline = Date.now() + totalDeadlineMs;

  let lastError = '';
  let lastStatus = 502;

  for (let keyIdx = 0; keyIdx < params.apiKeys.length; keyIdx++) {
    if (Date.now() + 2500 >= deadline) break;
    const apiKey = params.apiKeys[keyIdx];
    const hasNextKey = keyIdx < params.apiKeys.length - 1;

    for (const model of ACTIVE_GEMINI_MODELS) {
      const remaining = deadline - Date.now();
      if (remaining <= 2500) break;

      const timeoutMs = Math.min(perAttemptTimeoutMs, remaining);

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            signal: AbortSignal.timeout(timeoutMs),
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: params.systemText }],
              },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: params.userText }],
                },
              ],
              generationConfig: {
                temperature: params.temperature,
                responseMimeType: 'application/json',
                responseSchema: params.responseSchema,
              },
            }),
          }
        );

        const rawResponseText = await response.text();
        let data: {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          error?: { message?: string };
        } | null = null;

        try {
          data = rawResponseText ? JSON.parse(rawResponseText) : null;
        } catch {
          data = null;
        }

        if (!response.ok) {
          lastStatus =
            response.status === 429
              ? 429
              : response.status >= 400 && response.status < 500
              ? response.status
              : 502;
          lastError = sanitizeErrorMessages(
            data?.error?.message ||
              `Google Gemini API trả về mã lỗi HTTP ${response.status}.`,
            params.apiKeys
          );

          // Invalid request payload cannot be solved by trying other keys/models
          if (response.status === 400) {
            return { error: lastError, status: response.status };
          }
          // Auth failure on this key: move immediately to next key if available
          if (response.status === 401 || response.status === 403) {
            if (hasNextKey) break;
            return { error: lastError, status: response.status };
          }
          // 429 (model quota reached), 404, or 5xx:
          // try remaining fallback model(s) on the SAME key first before advancing to next key
          continue;
        }

        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          return { text: candidateText };
        }

        lastError = sanitizeErrorMessages(
          data?.error?.message || 'Gemini API không trả về nội dung hợp lệ.',
          params.apiKeys
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi kết nối tới Gemini API.';
        lastError = sanitizeErrorMessages(msg, params.apiKeys);
        lastStatus = 504;
      }
    }
  }

  return {
    error:
      lastError ||
      'Không thể kết nối tới Gemini API trong thời gian cho phép. Vui lòng thử lại sau.',
    status: lastStatus,
  };
}
