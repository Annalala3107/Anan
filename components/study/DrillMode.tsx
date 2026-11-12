'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Word, WordProgress } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import { getQuestionKey, cleanOptionText, isAnswerMatch } from '@/lib/utils';
import { soundFx } from '@/lib/sound';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  Zap,
  RotateCcw,
  Trophy,
  HelpCircle,
  Layers,
  Flame,
  AlertTriangle,
  Shuffle,
  Check,
  Sparkles,
  BookOpen,
  Play,
  ListChecks,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DrillModeProps {
  words: Word[];
  onExit: () => void;
}

interface PartQuestionItem {
  id: string;
  originalNumber: number; // 1-based index in the full deck
  sentence: string;
  correctWord: string;
  options: string[];
  explanation: string;
  answerKey?: string;
}

interface CheckpointPart {
  id: string;
  index: number; // 0-based part index, or -1 / -2 for special smart parts
  title: string;
  subtitle: string;
  items: PartQuestionItem[];
  masteredCount: number;
  learningCount: number;
  mistakeCount: number;
  isSpecial?: 'unmastered' | 'mistakes';
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function DrillMode({ words, onExit }: DrillModeProps) {
  // Configuration & Checkpoint State
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [partSize, setPartSize] = useState<number>(20);
  const [retryMistakesAtEnd, setRetryMistakesAtEnd] = useState<boolean>(true);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(false);
  const [autoAdvanceCorrect, setAutoAdvanceCorrect] = useState<boolean>(false);
  const [progressMap, setProgressMap] = useState<Record<string, WordProgress>>({});

  // Active Session State
  const [activePart, setActivePart] = useState<CheckpointPart | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<PartQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [firstTryScore, setFirstTryScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isRetryPhase, setIsRetryPhase] = useState(false);
  const [retryQueue, setRetryQueue] = useState<PartQuestionItem[]>([]);
  const [totalMistakesMade, setTotalMistakesMade] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshProgress = useCallback(() => {
    setProgressMap(StorageEngine.getWordProgress());
  }, []);

  useEffect(() => {
    refreshProgress();
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, [refreshProgress]);

  // Convert raw words into deterministic sequential PartQuestionItems
  const allItems: PartQuestionItem[] = useMemo(() => {
    if (!words || words.length === 0) return [];
    return words
      .filter((w) => Boolean((w.question && w.options?.length) || w.word))
      .map((target, idx) => {
        const key = String(target.id || getQuestionKey(target));
        if (target.question && target.options && target.options.length > 0) {
          return {
            id: key,
            originalNumber: idx + 1,
            sentence: target.question,
            correctWord: target.correctWord || target.options[0],
            options: target.options,
            explanation:
              target.explanation || `Answer: ${target.answer || target.options[0]}`,
            answerKey: target.answer,
          };
        }
        const sentence =
          target.simple_examples?.[0] ||
          target.advanced_example ||
          `Khái niệm hoặc thuật ngữ nào sau đây tương ứng với: "${target.vi || target.word}"?`;
        const otherWords = words
          .filter((w) => w.word && w.word.toLowerCase() !== target.word.toLowerCase())
          .slice(0, 3)
          .map((w) => w.word);
        const options = [target.word, ...otherWords];
        return {
          id: key,
          originalNumber: idx + 1,
          sentence,
          correctWord: target.word,
          options: options.length >= 2 ? options : [target.word, 'Đáp án khác'],
          explanation: `${target.word}: ${target.vi || 'Đáp án chính xác'}`,
        };
      });
  }, [words]);

  // Build sequential Checkpoints (Chặng 1, Chặng 2, ...) + Smart Checkpoints
  const { sequentialParts, unmasteredPart, mistakesPart, totalMastered } = useMemo(() => {
    const chunk = partSize <= 0 ? allItems.length || 20 : partSize;
    const parts: CheckpointPart[] = [];
    const unmasteredItems: PartQuestionItem[] = [];
    const mistakeItems: PartQuestionItem[] = [];
    let masteredTotal = 0;

    allItems.forEach((item) => {
      const p = progressMap[item.id];
      if (p?.status === 'mastered') {
        masteredTotal++;
      } else {
        unmasteredItems.push(item);
      }
      if (p && ((p.mistakesCount || 0) > 0 || (p.wrongStreak || 0) > 0)) {
        mistakeItems.push(item);
      }
    });

    for (let i = 0; i < allItems.length; i += chunk) {
      const slice = allItems.slice(i, i + chunk);
      const startNum = slice[0]?.originalNumber || i + 1;
      const endNum = slice[slice.length - 1]?.originalNumber || i + slice.length;
      const partIdx = Math.floor(i / chunk);

      let mCount = 0;
      let lCount = 0;
      let errCount = 0;
      slice.forEach((it) => {
        const p = progressMap[it.id];
        if (p?.status === 'mastered') mCount++;
        else if (p && p.seenCount > 0) lCount++;
        if (p && ((p.mistakesCount || 0) > 0 || (p.wrongStreak || 0) > 0)) errCount++;
      });

      parts.push({
        id: `part_${partIdx}`,
        index: partIdx,
        title: chunk >= allItems.length ? 'Toàn Bộ Đề' : `Chặng ${partIdx + 1}`,
        subtitle: `Câu ${startNum} – ${endNum} (${slice.length} câu)`,
        items: slice,
        masteredCount: mCount,
        learningCount: lCount,
        mistakeCount: errCount,
      });
    }

    const unmastered: CheckpointPart | null =
      unmasteredItems.length > 0 && unmasteredItems.length < allItems.length
        ? {
            id: 'special_unmastered',
            index: -1,
            title: 'Quét Sạch Câu Chưa Thuộc',
            subtitle: `${unmasteredItems.length} câu lẻ chưa đạt Mastered`,
            items: unmasteredItems,
            masteredCount: 0,
            learningCount: unmasteredItems.length,
            mistakeCount: mistakeItems.length,
            isSpecial: 'unmastered',
          }
        : null;

    const mistakes: CheckpointPart | null =
      mistakeItems.length > 0
        ? {
            id: 'special_mistakes',
            index: -2,
            title: 'Khắc Phục Câu Từng Sai',
            subtitle: `${mistakeItems.length} câu đã làm sai trong bộ đề này`,
            items: mistakeItems,
            masteredCount: 0,
            learningCount: mistakeItems.length,
            mistakeCount: mistakeItems.length,
            isSpecial: 'mistakes',
          }
        : null;

    return {
      sequentialParts: parts,
      unmasteredPart: unmastered,
      mistakesPart: mistakes,
      totalMastered: masteredTotal,
    };
  }, [allItems, partSize, progressMap]);

  const prepareQuestionOptions = useCallback(
    (items: PartQuestionItem[]): PartQuestionItem[] => {
      if (!shuffleOptions) return items;
      return items.map((q) => ({
        ...q,
        options: shuffleArray(q.options),
      }));
    },
    [shuffleOptions]
  );

  const handleStartPart = useCallback(
    (part: CheckpointPart) => {
      if (!part || part.items.length === 0) return;
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);

      const prepared = prepareQuestionOptions(part.items);
      setActivePart(part);
      setSessionQuestions(prepared);
      setCurrentIndex(0);
      setSelectedWord(null);
      setFirstTryScore(0);
      setStreak(0);
      setIsRetryPhase(false);
      setRetryQueue([]);
      setTotalMistakesMade(0);
      setIsCompleted(false);
      setIsConfiguring(false);
      soundFx.playClick();
    },
    [prepareQuestionOptions]
  );

  const currentQ = sessionQuestions[currentIndex];

  const isOptionCorrect = useCallback(
    (opt: string, q: PartQuestionItem) => {
      if (shuffleOptions) {
        return isAnswerMatch(opt, q.correctWord);
      }
      return isAnswerMatch(opt, q.correctWord, q.answerKey);
    },
    [shuffleOptions]
  );

  const handleNext = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (isCompleted) return;

    if (currentIndex < sessionQuestions.length - 1) {
      soundFx.playClick();
      setSelectedWord(null);
      setCurrentIndex((i) => i + 1);
      return;
    }

    // Reached the end of current pass — check if there are mistakes to retry!
    if (retryMistakesAtEnd && retryQueue.length > 0) {
      soundFx.playClick();
      const nextRetryBatch = prepareQuestionOptions(retryQueue);
      setIsRetryPhase(true);
      setSessionQuestions(nextRetryBatch);
      setRetryQueue([]);
      setCurrentIndex(0);
      setSelectedWord(null);
      return;
    }

    // Completed the entire Checkpoint!
    refreshProgress();
    setIsCompleted(true);
    soundFx.playCelebration();
    const totalCount = activePart?.items.length || sessionQuestions.length || 1;
    StorageEngine.recordActivity('drill', Math.round((firstTryScore / totalCount) * 100));
    confetti({
      particleCount: 110,
      spread: 65,
      origin: { y: 0.6 },
    });
  }, [
    isCompleted,
    currentIndex,
    sessionQuestions.length,
    retryMistakesAtEnd,
    retryQueue,
    prepareQuestionOptions,
    refreshProgress,
    activePart,
    firstTryScore,
  ]);

  const handleNextRef = useRef(handleNext);
  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  const handleSelect = useCallback(
    (choice: string) => {
      if (selectedWord || !currentQ) return;
      setSelectedWord(choice);

      const isCorrect = isOptionCorrect(choice, currentQ);

      if (isCorrect) {
        soundFx.playCorrect();
        if (!isRetryPhase) {
          setFirstTryScore((s) => s + 1);
        }
        setStreak((s) => s + 1);
        StorageEngine.updateWordProgress(currentQ.id, isRetryPhase ? 4 : 5);

        if (autoAdvanceCorrect) {
          if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
          autoAdvanceTimerRef.current = setTimeout(() => {
            handleNextRef.current();
          }, 1100);
        }
      } else {
        soundFx.playWrong();
        setStreak(0);
        setTotalMistakesMade((m) => m + 1);
        StorageEngine.recordMistakeOnly(currentQ.id);

        if (retryMistakesAtEnd) {
          setRetryQueue((prev) => {
            if (prev.some((item) => item.id === currentQ.id)) return prev;
            return [...prev, currentQ];
          });
        }
      }
    },
    [selectedWord, currentQ, isOptionCorrect, isRetryPhase, autoAdvanceCorrect, retryMistakesAtEnd]
  );

  // Find next sequential part if available
  const nextSequentialPart = useMemo(() => {
    if (!activePart || activePart.index < 0) return null;
    return sequentialParts.find((p) => p.index === activePart.index + 1) || null;
  }, [activePart, sequentialParts]);

  // Global keyboard shortcuts: 1-6 / A-F to answer, Enter / Space to advance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isConfiguring) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (isCompleted) {
        if (e.key === 'Enter' && nextSequentialPart) {
          e.preventDefault();
          handleStartPart(nextSequentialPart);
        }
        return;
      }

      if (!currentQ) return;

      if (!selectedWord) {
        if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
          e.preventDefault();
          const idx = parseInt(e.key, 10) - 1;
          if (currentQ.options[idx]) {
            handleSelect(currentQ.options[idx]);
          }
          return;
        }

        const upper = e.key.toUpperCase();
        if (['A', 'B', 'C', 'D', 'E', 'F'].includes(upper)) {
          e.preventDefault();
          const idx = upper.charCodeAt(0) - 65;
          if (currentQ.options[idx]) {
            handleSelect(currentQ.options[idx]);
          }
        }
      } else {
        if (e.key === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isConfiguring,
    isCompleted,
    currentQ,
    selectedWord,
    nextSequentialPart,
    handleSelect,
    handleNext,
    handleStartPart,
  ]);

  if (!allItems || allItems.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500">
        Đang chuẩn bị ngân hàng câu hỏi theo chặng...
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: CHECKPOINT / PART SELECTOR SCREEN
  // =========================================================================
  if (isConfiguring) {
    const overallPercent = Math.round((totalMastered / allItems.length) * 100);

    return (
      <div className="w-full max-w-5xl xl:max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-8 animate-fade-in">
        <div className="p-5 sm:p-8 md:p-10 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-7">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-lg shrink-0">
                <ListChecks className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    🎯 Chia Chặng Không Sót Câu • Giải Thích Sâu
                  </span>
                  <span className="text-xs text-slate-400 font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                    {words[0]?.subject || 'Bộ đề ôn tập'} • {allItems.length} câu
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                  Luyện Theo Chặng & Hiểu Bản Chất (Checkpoint Tutor)
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={onExit}
              className="self-start sm:self-center px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Quay lại
            </button>
          </div>

          {/* Overall Deck Mastery Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-2.5">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
              <span className="text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-500" />
                Tiến độ phá đảo toàn bộ đề này:
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                Đã thuộc {totalMastered} / {allItems.length} câu ({overallPercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(overallPercent, totalMastered > 0 ? 4 : 0)}%` }}
              />
            </div>
          </div>

          {/* Smart Special Checkpoints (Unmastered & Mistakes) */}
          {(unmasteredPart || mistakesPart) && (
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> Chặng Thông Minh (Gom câu lẻ & Câu sai)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {unmasteredPart && (
                  <button
                    type="button"
                    onClick={() => handleStartPart(unmasteredPart)}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-indigo-500/40 hover:border-indigo-500 bg-indigo-500/5 dark:bg-indigo-950/30 text-left transition-all flex items-center justify-between gap-4 group cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-600 text-white">
                          Khuyên dùng
                        </span>
                        <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-indigo-400 transition-colors">
                          🔥 {unmasteredPart.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {unmasteredPart.subtitle} — Học dứt điểm không trùng câu đã thuộc.
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-md">
                      <Play className="w-4 h-4 fill-white" />
                    </div>
                  </button>
                )}

                {mistakesPart && (
                  <button
                    type="button"
                    onClick={() => handleStartPart(mistakesPart)}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-rose-500/40 hover:border-rose-500 bg-rose-500/5 dark:bg-rose-950/30 text-left transition-all flex items-center justify-between gap-4 group cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-600 text-white">
                          Cấp tốc
                        </span>
                        <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-rose-400 transition-colors">
                          🛠️ {mistakesPart.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {mistakesPart.subtitle} — Xóa bỏ hoàn toàn các lỗ hổng hay nhầm.
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-md">
                      <Play className="w-4 h-4 fill-white" />
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Part Size + Sequential Checkpoints Grid */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" /> Chọn Chặng theo thứ tự đề (Không bao giờ sót câu lẻ)
              </label>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">Chia mỗi chặng:</span>
                {[
                  { label: '15 câu', val: 15 },
                  { label: '20 câu', val: 20 },
                  { label: '30 câu', val: 30 },
                  { label: `Tất cả (${allItems.length})`, val: allItems.length },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setPartSize(opt.val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      partSize === opt.val
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {sequentialParts.map((part) => {
                const pct = Math.round((part.masteredCount / part.items.length) * 100);
                const isDone = part.masteredCount === part.items.length;
                const isStarted = part.masteredCount > 0 || part.learningCount > 0;

                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => handleStartPart(part)}
                    className={`p-4 sm:p-5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between group cursor-pointer ${
                      isDone
                        ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/50 hover:border-emerald-500'
                        : isStarted
                        ? 'bg-indigo-500/5 dark:bg-indigo-950/20 border-indigo-500/40 hover:border-indigo-500'
                        : 'bg-white/60 dark:bg-[#131D31]/70 border-slate-200 dark:border-slate-800 hover:border-emerald-500/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-black text-base text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                          {part.title}
                        </span>
                        {isDone ? (
                          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Đã phá đảo
                          </span>
                        ) : isStarted ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                            Đang cày ({pct}%)
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                            Chưa học
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                        {part.subtitle}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-500 dark:text-slate-400">
                          Đã thuộc: {part.masteredCount}/{part.items.length}
                        </span>
                        {part.mistakeCount > 0 ? (
                          <span className="text-rose-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {part.mistakeCount} câu từng sai
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">Bắt đầu &rarr;</span>
                        )}
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isDone ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${Math.max(pct, isStarted ? 6 : 0)}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tutor Mode Settings Toggles */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">
              Cấu hình hỗ trợ học sâu trong chặng
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setRetryMistakesAtEnd((v) => !v)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  retryMistakesAtEnd
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-slate-900 dark:text-white'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                <RotateCcw className={`w-4 h-4 mt-0.5 shrink-0 ${retryMistakesAtEnd ? 'text-emerald-500' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-extrabold">Ép làm lại câu sai cuối chặng</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Sai câu nào sẽ được hỏi lại ở cuối chặng đến khi đúng 100%.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setShuffleOptions((v) => !v)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  shuffleOptions
                    ? 'bg-indigo-500/10 border-indigo-500/50 text-slate-900 dark:text-white'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                <Shuffle className={`w-4 h-4 mt-0.5 shrink-0 ${shuffleOptions ? 'text-indigo-500' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-extrabold">Đảo vị trí đáp án A/B/C/D</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Chống học vẹt vị trí đáp án khi ôn đi ôn lại nhiều lần.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAutoAdvanceCorrect((v) => !v)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  autoAdvanceCorrect
                    ? 'bg-amber-500/10 border-amber-500/50 text-slate-900 dark:text-white'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                <Zap className={`w-4 h-4 mt-0.5 shrink-0 ${autoAdvanceCorrect ? 'text-amber-500' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-extrabold">Tự qua câu khi ĐÚNG (1.1s)</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tắt để tự bấm Enter sau khi đọc kỹ giải thích chi tiết.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: CHECKPOINT COMPLETED SCREEN
  // =========================================================================
  if (isCompleted && activePart) {
    const totalInPart = activePart.items.length || 1;
    const accuracy = Math.round((firstTryScore / totalInPart) * 100);

    return (
      <div className="max-w-lg mx-auto text-center py-10 px-6 animate-fade-in">
        <div className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-5 shadow-glow">
            <Trophy className="w-10 h-10 animate-bounce" />
          </div>

          <span className="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            Hoàn thành {activePart.title}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-3 mb-1">
            {activePart.subtitle}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-xs sm:text-sm">
            {totalMistakesMade > 0 && retryMistakesAtEnd
              ? `Bạn đã khắc phục xong toàn bộ ${totalMistakesMade} lượt sai để nắm chắc 100% chặng này!`
              : 'Tuyệt vời! Bạn đã nắm vững toàn bộ kiến thức của chặng này.'}
          </p>

          <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 mb-7 grid grid-cols-3 gap-2 items-center">
            <div>
              <p className="text-[11px] text-slate-500 font-bold uppercase">Đúng ngay lượt 1</p>
              <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {firstTryScore}/{totalInPart}
              </p>
            </div>
            <div className="border-x border-slate-300 dark:border-slate-700 px-2">
              <p className="text-[11px] text-slate-500 font-bold uppercase">Tỉ lệ lượt 1</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-500">{accuracy}%</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-bold uppercase">Đã sửa sai</p>
              <p className="text-2xl sm:text-3xl font-black text-amber-500">{totalMistakesMade}</p>
            </div>
          </div>

          <div className="space-y-3">
            {nextSequentialPart && (
              <button
                type="button"
                onClick={() => handleStartPart(nextSequentialPart)}
                className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  🚀 Học tiếp {nextSequentialPart.title} ({nextSequentialPart.subtitle}) [Enter]
                </span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                refreshProgress();
                setIsConfiguring(true);
              }}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all cursor-pointer"
            >
              📋 Chọn chặng khác ({totalMastered}/{allItems.length} câu đã thuộc)
            </button>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleStartPart(activePart)}
                className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                🔄 Làm lại chặng này
              </button>
              <button
                type="button"
                onClick={onExit}
                className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                Về Trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  // =========================================================================
  // VIEW 3: ACTIVE TUTOR QUESTION & INSTANT EXPLANATION VIEW
  // =========================================================================
  const isAnswered = Boolean(selectedWord);
  const wasAnsweredCorrect = selectedWord ? isOptionCorrect(selectedWord, currentQ) : false;

  return (
    <div className="w-full max-w-4xl mx-auto py-5 px-4 sm:px-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              refreshProgress();
              setIsConfiguring(true);
            }}
            className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            &larr; Đổi chặng
          </button>

          <span
            className={`text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-xl border ${
              isRetryPhase
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            }`}
          >
            {isRetryPhase
              ? `🔁 Vòng Sửa Câu Sai (${currentIndex + 1}/${sessionQuestions.length})`
              : `${activePart?.title} • ${activePart?.subtitle}`}
          </span>

          {streak >= 3 && (
            <span className="flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
              <Zap className="w-3.5 h-3.5 fill-amber-500" /> {streak} liên tiếp!
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {retryMistakesAtEnd && retryQueue.length > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Cần làm lại cuối chặng: {retryQueue.length}
            </span>
          )}
          <span className="text-sm font-black text-slate-700 dark:text-slate-300 font-mono">
            {currentIndex + 1} / {sessionQuestions.length}
          </span>
          <button
            type="button"
            onClick={onExit}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            Thoát
          </button>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full mb-6 overflow-hidden">
        <div
          className={`h-full transition-[width] duration-300 ease-out transform-gpu ${
            isRetryPhase ? 'bg-rose-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${((currentIndex + 1) / sessionQuestions.length) * 100}%` }}
        />
      </div>

      {/* Question & Choices Animated Container */}
      <div key={`${isRetryPhase ? 'retry' : 'main'}_${currentIndex}`} className="animate-question-enter transform-gpu">
        {/* Question Card */}
        <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 shadow-xl mb-5">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>Câu #{currentQ.originalNumber} trong đề</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              Phím tắt: [1–{currentQ.options.length}] hoặc [A–{String.fromCharCode(64 + currentQ.options.length)}]
            </span>
          </div>
          <CodeQuestionRenderer
            content={currentQ.sentence}
            className="text-base sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed"
          />
        </div>

        {/* Choices */}
        <div className="space-y-2.5 sm:space-y-3 mb-5">
          {currentQ.options.map((opt, idx) => {
            const isSelected = selectedWord === opt;
            const isTarget = isOptionCorrect(opt, currentQ);
            let style =
              'w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl font-semibold border text-left transition-[transform,background-color,border-color,opacity] duration-150 flex items-center justify-between active:scale-[0.99] touch-manipulation select-none transform-gpu ';

            if (!selectedWord) {
              style +=
                'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-900 dark:text-white cursor-pointer';
            } else if (isTarget) {
              style +=
                'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-glow-success font-bold animate-pop-correct';
            } else if (isSelected && !isTarget) {
              style +=
                'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 font-bold animate-shake';
            } else {
              style +=
                'opacity-40 bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500';
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isAnswered}
                onClick={() => handleSelect(opt)}
                className={style}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-700/80 text-xs flex items-center justify-center font-mono font-bold text-slate-600 dark:text-slate-300 shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm sm:text-base">{cleanOptionText(opt)}</span>
                </div>
                {isAnswered && isTarget && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 ml-2" />
                )}
                {isAnswered && isSelected && !isTarget && (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Explanation Banner */}
      {isAnswered && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border mb-5 animate-slide-up ${
            wasAnsweredCorrect
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300/70 dark:border-emerald-800/70'
              : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300/70 dark:border-rose-800/70'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p
              className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                wasAnsweredCorrect
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>
                {wasAnsweredCorrect
                  ? 'Chính xác! Giải thích chi tiết:'
                  : 'Chưa đúng! Hãy đọc kỹ giải thích:'}
              </span>
            </p>
            {!wasAnsweredCorrect && retryMistakesAtEnd && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-600 dark:text-rose-300">
                📌 Đã thêm vào vòng làm lại cuối chặng
              </span>
            )}
          </div>
          <p className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
            {currentQ.explanation}
          </p>
        </div>
      )}

      {/* Continue Button */}
      {isAnswered && (
        <button
          type="button"
          onClick={handleNext}
          className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-glow-success transition-all active:scale-[0.99] cursor-pointer"
        >
          <span>
            {currentIndex < sessionQuestions.length - 1
              ? 'Câu tiếp theo [Enter / Space]'
              : retryMistakesAtEnd && retryQueue.length > 0
              ? `Vào vòng sửa ${retryQueue.length} câu sai [Enter]`
              : 'Hoàn thành chặng [Enter]'}
          </span>
          <ArrowRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
