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
} from 'lucide-react';
import { hashString } from '@/lib/utils';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';

export interface AIExplanationResult {
  coreConcept: string;
  trapAnalysis: string;
  mnemonic: string;
}

interface AITutorButtonProps {
  question: string;
  options?: string[];
  correctAnswer: string;
  userAnswer?: string;
  subject?: string;
  topic?: string;
  className?: string;
}

const CACHE_STORAGE_KEY = 'ananquiz_ai_explain_cache_v1';
const API_KEY_SESSION_KEY = 'gemini_custom_api_key';
const MAX_CACHE_ENTRIES = 60;
const memoryExplainCache = new Map<string, AIExplanationResult>();

function readCachedExplanation(cacheKey: string): AIExplanationResult | null {
  const mem = memoryExplainCache.get(cacheKey);
  if (mem) return mem;

  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, AIExplanationResult>;
    const hit = parsed?.[cacheKey];
    if (hit && (hit.coreConcept || hit.trapAnalysis || hit.mnemonic)) {
      memoryExplainCache.set(cacheKey, hit);
      return hit;
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

function writeCachedExplanation(cacheKey: string, value: AIExplanationResult): void {
  memoryExplainCache.set(cacheKey, value);
  if (typeof window === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(CACHE_STORAGE_KEY);
    const prev: Record<string, AIExplanationResult> = raw ? JSON.parse(raw) : {};
    const keys = Object.keys(prev);
    if (keys.length >= MAX_CACHE_ENTRIES) {
      delete prev[keys[0]];
    }
    prev[cacheKey] = value;
    sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(prev));
  } catch {
    // Ignore storage quota errors
  }
}

export default function AITutorButton({
  question,
  options,
  correctAnswer,
  userAnswer,
  subject,
  topic,
  className = '',
}: AITutorButtonProps) {
  const optionsSig = useMemo(
    () => (Array.isArray(options) ? options.map((o) => o.trim()).join('|') : ''),
    [options]
  );

  const cacheKey = useMemo(
    () =>
      hashString(
        `${question.trim()}::${optionsSig}::${correctAnswer.trim()}`
      ),
    [question, optionsSig, correctAnswer]
  );

  const [explanation, setExplanation] = useState<AIExplanationResult | null>(() =>
    readCachedExplanation(cacheKey)
  );
  const [isSharedCache, setIsSharedCache] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  useEffect(() => {
    const cached = readCachedExplanation(cacheKey);
    setExplanation(cached);
    setIsSharedCache(false);
    setIsOpen(false);
    setIsLoading(false);
    setError(null);
    setNeedsApiKey(false);
  }, [cacheKey]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(API_KEY_SESSION_KEY);
      if (saved) setTempApiKey(saved);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const fetchExplanation = async (overrideKey?: string) => {
    if (!question.trim() || isLoading) return;

    const cached = readCachedExplanation(cacheKey);
    if (cached) {
      setExplanation(cached);
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
          options,
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
        } else if (
          res.status === 401 ||
          res.status === 403 ||
          res.status === 429
        ) {
          setNeedsApiKey(true);
        }
        throw new Error(data.error || 'Không thể nhận giải thích từ Gemini AI.');
      }

      writeCachedExplanation(cacheKey, data.explanation);
      setExplanation(data.explanation);
      setIsSharedCache(Boolean(data.cached));
      setNeedsApiKey(false);
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
    fetchExplanation();
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
    fetchExplanation(cleaned);
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

  const hasKnownAnswer = Boolean(correctAnswer && correctAnswer.trim());

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
          {isLoading ? (
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
          ) : !hasKnownAnswer ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-cyan-400" />
              <span>🤖 Chưa có đáp án gốc — Bấm để AI Suy Luận &amp; Giảng Bản Chất</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
              <span>✨ Hỏi AI giải thích sâu &amp; mẹo nhớ</span>
            </>
          )}
        </button>
      </div>

      {isOpen && error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/35 border border-rose-200 dark:border-rose-800/70 space-y-2.5 text-xs">
          <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>

          {needsApiKey && (
            <form onSubmit={handleSaveAndRetryKey} className="space-y-2 pt-1">
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
                  placeholder="AQ... hoặc AIza..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        </div>
      )}

      {isOpen && explanation && (
        <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-[#0B1326]/90 border border-indigo-200/90 dark:border-indigo-500/35 space-y-3 text-xs sm:text-sm animate-fade-in">
          {explanation.coreConcept && (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-cyan-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  <span>Bản chất &amp; Đáp án đúng</span>
                </p>
                {isSharedCache && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                    ⚡ Kho lời giải chung
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
              <p className="text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-100 leading-relaxed">
                {explanation.mnemonic}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
