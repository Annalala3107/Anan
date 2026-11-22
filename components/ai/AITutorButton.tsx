'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  Loader2,
  Key,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Target,
  AlertTriangle,
  Zap,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import {
  cleanOptionText,
  hashString,
  splitCorrectChoices,
} from '@/lib/utils';
import {
  AiOptionTrap,
  CachedAiExplanation,
  buildAiExplainCacheKeyV2,
  normalizeCacheText,
  resolveCanonicalAnswerTexts,
} from '@/lib/aiCacheKey';
import {
  getCachedAiExplanationAsync,
  getCachedAiExplanationSync,
  setCachedAiExplanation,
} from '@/lib/aiClientCache';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';

export type AIExplanationResult = CachedAiExplanation;

interface AITutorButtonProps {
  question: string;
  options?: string[];
  correctAnswer: string;
  userAnswer?: string;
  subject?: string;
  topic?: string;
  className?: string;
}

const API_KEY_SESSION_KEY = 'gemini_custom_api_key';

export default function AITutorButton({
  question,
  options,
  correctAnswer,
  userAnswer,
  subject,
  topic,
  className = '',
}: AITutorButtonProps) {
  const safeOptions = useMemo(
    () => (Array.isArray(options) ? options : []),
    [options]
  );

  const optionsSig = useMemo(
    () => safeOptions.map((o) => o.trim()).join('|'),
    [safeOptions]
  );

  const cacheKey = useMemo(
    () => buildAiExplainCacheKeyV2(question, safeOptions, correctAnswer),
    [question, safeOptions, correctAnswer]
  );

  const legacyClientKey = useMemo(
    () =>
      hashString(
        `${question.trim()}::${optionsSig}::${correctAnswer.trim()}`
      ),
    [question, optionsSig, correctAnswer]
  );

  const [explanation, setExplanation] = useState<AIExplanationResult | null>(null);
  const [cacheBadge, setCacheBadge] = useState<'shared' | 'persisted' | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  useEffect(() => {
    let cancelled = false;

    const syncHit = getCachedAiExplanationSync(cacheKey, legacyClientKey);
    setExplanation(syncHit);
    setCacheBadge(syncHit ? 'shared' : null);
    setIsOpen(false);
    setIsLoading(false);
    setError(null);
    setNeedsApiKey(false);

    void getCachedAiExplanationAsync(cacheKey, legacyClientKey).then((asyncHit) => {
      if (cancelled || !asyncHit) return;
      setExplanation(asyncHit);
      setCacheBadge('shared');
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, legacyClientKey]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(API_KEY_SESSION_KEY);
      if (saved) setTempApiKey(saved);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const hasKnownAnswer = Boolean(correctAnswer && correctAnswer.trim());

  const resolvedInferredLabels = useMemo(() => {
    if (hasKnownAnswer || !explanation?.inferredAnswerTexts?.length) return [];
    const normOptions = safeOptions.map((opt) =>
      normalizeCacheText(cleanOptionText(opt) || opt)
    );

    return explanation.inferredAnswerTexts.map((rawText) => {
      const cleaned = (cleanOptionText(rawText) || rawText).trim();
      const targetNorm = normalizeCacheText(cleaned);
      const idx = normOptions.findIndex((o) => o === targetNorm);
      if (idx >= 0 && idx < 26) {
        const displayClean = (cleanOptionText(safeOptions[idx]) || safeOptions[idx]).trim();
        return `${String.fromCharCode(65 + idx)}. ${displayClean}`;
      }
      return cleaned;
    });
  }, [hasKnownAnswer, explanation, safeOptions]);

  const userChoiceDiagnostics = useMemo(() => {
    if (!explanation || !userAnswer || !userAnswer.trim()) return null;

    const userChoicesRaw = splitCorrectChoices(userAnswer, undefined, safeOptions);
    const seen = new Set<string>();
    const cleanUserChoices: Array<{ norm: string; display: string }> = [];

    for (const c of userChoicesRaw) {
      const display = (cleanOptionText(c) || c).trim();
      const norm = normalizeCacheText(display);
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        cleanUserChoices.push({ norm, display });
      }
    }

    if (cleanUserChoices.length === 0) return null;

    const correctNormSet = new Set<string>(
      hasKnownAnswer
        ? resolveCanonicalAnswerTexts(correctAnswer, safeOptions)
        : (explanation.inferredAnswerTexts || [])
            .map((t) => normalizeCacheText(cleanOptionText(t) || t))
            .filter(Boolean)
    );

    const wrongChoices =
      correctNormSet.size > 0
        ? cleanUserChoices.filter((c) => !correctNormSet.has(c.norm))
        : cleanUserChoices;

    if (
      !hasKnownAnswer &&
      correctNormSet.size > 0 &&
      wrongChoices.length === 0 &&
      cleanUserChoices.length === correctNormSet.size
    ) {
      return { status: 'matched_inferred' as const, traps: [] as AiOptionTrap[] };
    }

    if (correctNormSet.size > 0 && wrongChoices.length === 0) {
      return null;
    }

    const trapMap = new Map<string, AiOptionTrap>();
    for (const trap of explanation.optionTraps || []) {
      const trapNorm = normalizeCacheText(
        cleanOptionText(trap.optionText) || trap.optionText
      );
      if (trapNorm && !trapMap.has(trapNorm)) {
        trapMap.set(trapNorm, trap);
      }
    }

    const matchedTraps: AiOptionTrap[] = [];
    for (const choice of wrongChoices) {
      const matched = trapMap.get(choice.norm);
      if (matched) {
        matchedTraps.push({
          optionText: choice.display,
          reason: matched.reason,
        });
      }
    }

    if (matchedTraps.length === 0) return null;
    return { status: 'wrong_traps' as const, traps: matchedTraps };
  }, [explanation, userAnswer, safeOptions, hasKnownAnswer, correctAnswer]);

  const fetchExplanation = async (overrideKey?: string) => {
    if (!question.trim() || isLoading) return;

    const cached = await getCachedAiExplanationAsync(cacheKey, legacyClientKey);
    if (cached) {
      setExplanation(cached);
      setCacheBadge('shared');
      setIsOpen(true);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let storedKey = '';
      try {
        storedKey = sessionStorage.getItem(API_KEY_SESSION_KEY)?.trim() || '';
      } catch {
        storedKey = '';
      }
      const keyToUse = (overrideKey !== undefined ? overrideKey : storedKey).trim();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (keyToUse) {
        headers['x-goog-api-key'] = keyToUse;
      }

      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question,
          options: safeOptions,
          correctAnswer,
          userAnswer,
          subject,
          topic,
        }),
      });

      const rawText = await res.text();
      let data: {
        success?: boolean;
        cached?: boolean;
        persisted?: boolean;
        error?: string;
        explanation?: AIExplanationResult;
      } = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }

      if (!res.ok || !data.success || !data.explanation) {
        if (
          res.status === 400 &&
          (data.error?.includes('GEMINI_API_KEY') || data.error?.includes('API'))
        ) {
          setNeedsApiKey(true);
          setShowKeyInput(true);
        } else if (
          res.status === 401 ||
          res.status === 403 ||
          res.status === 429
        ) {
          setNeedsApiKey(true);
          setShowKeyInput(true);
        }
        throw new Error(data.error || 'Không thể nhận giải thích từ Gemini AI.');
      }

      void setCachedAiExplanation(cacheKey, data.explanation);
      setExplanation(data.explanation);
      setCacheBadge(data.cached ? 'shared' : data.persisted ? 'persisted' : 'shared');
      setNeedsApiKey(false);
      setShowKeyInput(false);
      setIsOpen(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi gọi AI trợ lý.';
      setError(msg);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (explanation) {
      setIsOpen((prev) => !prev);
      return;
    }
    void fetchExplanation();
  };

  const handleSaveAndRetryKey = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cleaned = tempApiKey.trim();
    if (!cleaned) return;
    try {
      sessionStorage.setItem(API_KEY_SESSION_KEY, cleaned);
    } catch {
      // Ignore storage errors
    }
    void fetchExplanation(cleaned);
  };

  const handleClearKey = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempApiKey('');
    try {
      sessionStorage.removeItem(API_KEY_SESSION_KEY);
    } catch {
      // Ignore
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`space-y-2.5 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleToggleClick}
          disabled={isLoading}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600/15 via-purple-600/15 to-cyan-500/15 hover:from-indigo-600/25 hover:to-cyan-500/25 text-indigo-700 dark:text-cyan-300 border transition-all cursor-pointer disabled:opacity-60 active:scale-[0.99] ${
            !hasKnownAnswer && !explanation
              ? 'border-amber-400/50 dark:border-cyan-400/50 shadow-sm'
              : 'border-indigo-400/35 dark:border-cyan-400/35'
          }`}
        >
          {!hasKnownAnswer && !explanation && !isLoading ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-cyan-400" />
              <span>🤖 Chưa có đáp án gốc — Bấm để AI Suy Luận &amp; Giảng Bản Chất</span>
            </>
          ) : isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>AI đang phân tích câu hỏi...</span>
            </>
          ) : explanation ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
              <span>{isOpen ? 'Thu gọn giải thích AI' : 'Xem giải thích AI đã lưu'}</span>
              {isOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
              <span>✨ Hỏi AI giải thích sâu &amp; mẹo nhớ</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowKeyInput((prev) => !prev);
          }}
          title="Nhập hoặc đổi Gemini API Key cá nhân (BYOK)"
          className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            showKeyInput || tempApiKey.trim()
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/45'
              : 'bg-white/70 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-indigo-400/40'
          }`}
        >
          <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>{tempApiKey.trim() ? 'Key riêng: Đang bật' : 'Key riêng'}</span>
        </button>
      </div>

      {isOpen && error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/35 border border-rose-200 dark:border-rose-800/70 text-xs">
          <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {(showKeyInput || (isOpen && needsApiKey)) && (
        <form
          onSubmit={handleSaveAndRetryKey}
          className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 space-y-2 text-xs animate-fade-in"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Key className="w-3 h-3 text-amber-500 shrink-0" />
              <span>
                Nhập Gemini API Key cá nhân (chỉ lưu tạm ở <code>sessionStorage</code>):
              </span>
            </p>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-indigo-600 dark:text-cyan-400 hover:underline"
            >
              Lấy key miễn phí tại Google AI Studio ↗
            </a>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="password"
              autoComplete="off"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="AIza..."
              className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!tempApiKey.trim() || isLoading}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs disabled:opacity-50 cursor-pointer shrink-0"
            >
              Lưu &amp; Giải thích
            </button>
            {tempApiKey && (
              <button
                type="button"
                onClick={handleClearKey}
                title="Xóa API Key"
                className="p-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>
      )}

      {isOpen && explanation && (
        <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-[#0B1326]/90 border border-indigo-200/90 dark:border-indigo-500/35 space-y-3 text-xs sm:text-sm animate-fade-in">
          {resolvedInferredLabels.length > 0 && (
            <div className="px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs font-bold text-cyan-800 dark:text-cyan-200 flex flex-wrap items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span>Đáp án AI suy luận cho bộ lựa chọn hiện tại:</span>
              <span className="font-mono text-indigo-700 dark:text-cyan-300">
                {resolvedInferredLabels.join(' | ')}
              </span>
            </div>
          )}

          {userChoiceDiagnostics?.status === 'matched_inferred' && (
            <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Lựa chọn của bạn khớp hoàn toàn với đáp án AI suy luận!</span>
            </div>
          )}

          {userChoiceDiagnostics?.status === 'wrong_traps' && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Vì sao lựa chọn của bạn dễ nhầm</span>
              </p>
              <div className="space-y-1.5">
                {userChoiceDiagnostics.traps.map((trap, tIdx) => (
                  <div
                    key={tIdx}
                    className="text-xs text-rose-950 dark:text-rose-100 space-y-0.5"
                  >
                    <p className="font-bold text-rose-700 dark:text-rose-300">
                      • Phương án &ldquo;{trap.optionText}&rdquo;:
                    </p>
                    <CodeQuestionRenderer
                      content={trap.reason}
                      className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed pl-3"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {explanation.coreConcept && (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-cyan-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  <span>Bản chất &amp; Đáp án đúng</span>
                </p>
                {cacheBadge === 'shared' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                    ⚡ Kho lời giải chung (0 tốn lượt AI)
                  </span>
                )}
                {cacheBadge === 'persisted' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
                    ✓ Đã lưu vĩnh viễn vào Kho chung
                  </span>
                )}
              </div>
              <CodeQuestionRenderer
                content={explanation.coreConcept}
                className="text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-relaxed"
              />
            </div>
          )}

          {explanation.trapAnalysis && (
            <div className="space-y-1 pt-2 border-t border-indigo-200/70 dark:border-white/10">
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Phân tích bẫy đáp án nhiễu</span>
              </p>
              <CodeQuestionRenderer
                content={explanation.trapAnalysis}
                className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed"
              />
            </div>
          )}

          {explanation.mnemonic && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Mẹo nhớ nhanh 3 giây</span>
              </p>
              <CodeQuestionRenderer
                content={explanation.mnemonic}
                className="text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-100 leading-relaxed"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
