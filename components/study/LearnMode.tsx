'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Word } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import { isAnswerMatch } from '@/lib/utils';
import { soundFx } from '@/lib/sound';
import { buildStandardQuestions, StandardQuestion } from '@/lib/quizHelpers';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import FlashcardView from './FlashcardView';
import {
  Zap,
  Trophy,
  RotateCcw,
  ArrowRight,
  Flame,
  Check,
  X,
  Target,
  Sparkles,
  Layers,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LearnModeProps {
  words: Word[];
  onExit: () => void;
}

interface CardItem {
  id: string;
  question: StandardQuestion;
  correctStreak: number; // 0 .. streakTarget -> graduates when correctStreak >= streakTarget
  mistakes: number;
  attempts: number;
}

// Active working pool size (Quizlet-style mini-round rotation)
const ACTIVE_POOL_SIZE = 5;

export default function LearnMode({ words, onExit }: LearnModeProps) {
  // Setup State
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [studyMethod, setStudyMethod] = useState<'flashcard' | 'rapid'>('flashcard');
  const [isFlipped, setIsFlipped] = useState(false);
  const [batchSize, setBatchSize] = useState(15);
  const [streakTarget, setStreakTarget] = useState(2); // 1 = Speed run, 2 = Ironclad memory

  // Active Session State (Immutable Card Dictionary + Sliding Active Pool Queue)
  const [cards, setCards] = useState<CardItem[]>([]);
  const [activeQueue, setActiveQueue] = useState<string[]>([]);
  const [nextReserveIndex, setNextReserveIndex] = useState<number>(0);
  const [turnCount, setTurnCount] = useState<number>(0);

  // Interaction State
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [isCompleted, setIsCompleted] = useState(false);

  // Performance & Gamification Metrics
  const [startTime, setStartTime] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [sessionCombo, setSessionCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [problemQuestions, setProblemQuestions] = useState<StandardQuestion[]>([]);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending timer on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  // Start the Rapid Recall / Flashcard session
  const handleStartSession = useCallback(() => {
    if (!words || words.length === 0) return;

    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    const count = Math.min(words.length, batchSize);
    const standardList = buildStandardQuestions(words, count);

    const initialCards: CardItem[] = standardList.map((q, idx) => ({
      id: `card_${idx}_${q.id}`,
      question: q,
      correctStreak: 0,
      mistakes: 0,
      attempts: 0,
    }));

    const initialPoolCount = Math.min(ACTIVE_POOL_SIZE, initialCards.length);
    const initialActiveQueue = initialCards.slice(0, initialPoolCount).map((c) => c.id);

    setCards(initialCards);
    setActiveQueue(initialActiveQueue);
    setNextReserveIndex(initialPoolCount);
    setTurnCount(0);
    setSelectedOpt(null);
    setFeedbackState('idle');
    setIsFlipped(false);
    setIsConfiguring(false);
    setIsCompleted(false);
    setStartTime(Date.now());
    setTotalAttempts(0);
    setCorrectAttempts(0);
    setSessionCombo(0);
    setMaxCombo(0);
    setProblemQuestions([]);
    soundFx.playClick();
  }, [words, batchSize]);

  const currentCardId = activeQueue[0];
  const currentItem = cards.find((c) => c.id === currentCardId);
  const currentQ = currentItem?.question;

  const finishSession = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setIsCompleted(true);
    soundFx.playCelebration();
    confetti({
      particleCount: 160,
      spread: 80,
      origin: { y: 0.6 },
    });
    StorageEngine.recordActivity('learn', 100);
  }, []);

  // Rotate active pool queue to the next question
  const advanceNext = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    setSelectedOpt(null);
    setFeedbackState('idle');
    setIsFlipped(false);
    setTurnCount((t) => t + 1);

    if (activeQueue.length === 0 || !currentItem) {
      finishSession();
      return;
    }

    // Check if all cards have graduated
    const allGraduated = cards.length > 0 && cards.every((c) => c.correctStreak >= streakTarget);
    if (allGraduated) {
      finishSession();
      return;
    }

    const activeId = activeQueue[0];
    const restQueue = activeQueue.slice(1);
    const isCurrentGraduated = currentItem.correctStreak >= streakTarget;

    if (isCurrentGraduated) {
      // Current card graduated! Pull a new unseen card from reserve if available
      let nextQueue = [...restQueue];
      let nextReserve = nextReserveIndex;

      while (nextQueue.length < ACTIVE_POOL_SIZE && nextReserve < cards.length) {
        nextQueue.push(cards[nextReserve].id);
        nextReserve++;
      }

      // Fallback: if queue is empty, find any ungraduated card left
      if (nextQueue.length === 0) {
        const remaining = cards.filter((c) => c.correctStreak < streakTarget).map((c) => c.id);
        if (remaining.length === 0) {
          finishSession();
          return;
        }
        nextQueue = remaining.slice(0, ACTIVE_POOL_SIZE);
      }

      setActiveQueue(nextQueue);
      setNextReserveIndex(nextReserve);
    } else {
      // Current card not yet graduated -> keep it rotating inside the active pool
      if (restQueue.length === 0) {
        // Only 1 card left in the pool; keep it on screen for the next rep
        setActiveQueue([activeId]);
      } else if (feedbackState === 'wrong') {
        // Wrong answer: re-show after 2-3 cards in the active pool
        const insertPos = Math.min(restQueue.length, 3);
        const nextQueue = [...restQueue];
        nextQueue.splice(insertPos, 0, activeId);
        setActiveQueue(nextQueue);
      } else {
        // Correct answer (1/2): push to the back of the 5-card active pool
        // Ensure we don't ask the exact same card back-to-back if reserve still has cards
        let nextQueue = [...restQueue, activeId];
        setActiveQueue(nextQueue);
      }
    }
  }, [activeQueue, cards, currentItem, feedbackState, finishSession, nextReserveIndex, streakTarget]);

  // Keep a ref to latest advanceNext so setTimeout never suffers from stale closures
  const advanceNextRef = useRef(advanceNext);
  useEffect(() => {
    advanceNextRef.current = advanceNext;
  }, [advanceNext]);

  // Handle Option Selection in Rapid MCQ mode
  const handleSelectOption = useCallback(
    (optText: string) => {
      if (feedbackState !== 'idle' || !currentItem || !currentQ) return;

      setSelectedOpt(optText);
      const isCorrect = isAnswerMatch(optText, currentQ.correctWord, currentQ.answerKey);

      setTotalAttempts((prev) => prev + 1);

      if (isCorrect) {
        soundFx.playCorrect();
        setFeedbackState('correct');
        setCorrectAttempts((prev) => prev + 1);
        setSessionCombo((prev) => {
          const next = prev + 1;
          setMaxCombo((m) => Math.max(m, next));
          return next;
        });

        const newStreak = Math.min(streakTarget, currentItem.correctStreak + 1);

        // Immutable update of the card's streak so progress bar & HUD update immediately
        setCards((prevCards) =>
          prevCards.map((c) =>
            c.id === currentItem.id
              ? { ...c, correctStreak: newStreak, attempts: c.attempts + 1 }
              : c
          )
        );

        // Record progress in SRS engine
        StorageEngine.updateWordProgress(currentQ.id, 5);

        // Auto-advance quickly after 420ms for rapid muscle memory conditioning
        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = setTimeout(() => {
          advanceNextRef.current();
        }, 420);
      } else {
        soundFx.playWrong();
        setFeedbackState('wrong');
        setSessionCombo(0);

        // Immutable reset of this card's streak & increment mistakes
        setCards((prevCards) =>
          prevCards.map((c) =>
            c.id === currentItem.id
              ? { ...c, correctStreak: 0, mistakes: c.mistakes + 1, attempts: c.attempts + 1 }
              : c
          )
        );

        // Track as problem question
        setProblemQuestions((prev) => {
          if (!prev.some((pq) => pq.id === currentQ.id)) {
            return [...prev, currentQ];
          }
          return prev;
        });

        // Record mistake in SRS
        StorageEngine.recordMistakeOnly(currentQ.id);
      }
    },
    [feedbackState, currentItem, currentQ, streakTarget]
  );

  // Flashcard Self-Rating (SM-2 Quality 1, 3, 5)
  const handleRateFlashcard = useCallback(
    (quality: 1 | 3 | 5) => {
      if (!currentItem || !currentQ) return;
      setTotalAttempts((prev) => prev + 1);

      const activeId = currentItem.id;
      const restQueue = activeQueue.slice(1);

      if (quality >= 3) {
        soundFx.playCorrect();
        setCorrectAttempts((prev) => prev + 1);
        setSessionCombo((prev) => {
          const next = prev + 1;
          setMaxCombo((m) => Math.max(m, next));
          return next;
        });

        const newStreak =
          quality === 5 ? streakTarget : Math.min(streakTarget, currentItem.correctStreak + 1);
        const didGraduate = newStreak >= streakTarget;

        const updatedCards = cards.map((c) =>
          c.id === activeId
            ? { ...c, correctStreak: newStreak, attempts: c.attempts + 1 }
            : c
        );
        setCards(updatedCards);
        StorageEngine.updateWordProgress(currentQ.id, quality);

        if (updatedCards.every((c) => c.correctStreak >= streakTarget)) {
          finishSession();
          return;
        }

        if (didGraduate) {
          let nextQueue = [...restQueue];
          let nextReserve = nextReserveIndex;
          while (nextQueue.length < ACTIVE_POOL_SIZE && nextReserve < updatedCards.length) {
            nextQueue.push(updatedCards[nextReserve].id);
            nextReserve++;
          }
          if (nextQueue.length === 0) {
            const remaining = updatedCards
              .filter((c) => c.correctStreak < streakTarget)
              .map((c) => c.id);
            nextQueue = remaining.slice(0, ACTIVE_POOL_SIZE);
          }
          setActiveQueue(nextQueue);
          setNextReserveIndex(nextReserve);
        } else {
          setActiveQueue(restQueue.length > 0 ? [...restQueue, activeId] : [activeId]);
        }
      } else {
        soundFx.playWrong();
        setSessionCombo(0);

        setCards((prevCards) =>
          prevCards.map((c) =>
            c.id === activeId
              ? { ...c, correctStreak: 0, mistakes: c.mistakes + 1, attempts: c.attempts + 1 }
              : c
          )
        );

        setProblemQuestions((prev) => {
          if (!prev.some((pq) => pq.id === currentQ.id)) {
            return [...prev, currentQ];
          }
          return prev;
        });

        StorageEngine.recordMistakeOnly(currentQ.id);

        if (restQueue.length === 0) {
          setActiveQueue([activeId]);
        } else {
          const insertPos = Math.min(restQueue.length, 3);
          const nextQueue = [...restQueue];
          nextQueue.splice(insertPos, 0, activeId);
          setActiveQueue(nextQueue);
        }
      }

      setIsFlipped(false);
      setTurnCount((t) => t + 1);
    },
    [activeQueue, cards, currentItem, currentQ, finishSession, nextReserveIndex, streakTarget]
  );

  // Global Keyboard listener: Flashcard Space / 1-3, Rapid Recall 1-4 / A-D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isConfiguring || isCompleted || !currentQ) return;

      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      // FLASHCARD MODE HOTKEYS
      if (studyMethod === 'flashcard') {
        if (e.code === 'Space') {
          e.preventDefault();
          setIsFlipped((f) => !f);
          soundFx.playClick();
          return;
        }

        if (isFlipped) {
          if (e.key === '1') {
            e.preventDefault();
            handleRateFlashcard(1);
          } else if (e.key === '2') {
            e.preventDefault();
            handleRateFlashcard(3);
          } else if (e.key === '3') {
            e.preventDefault();
            handleRateFlashcard(5);
          }
        }
        return;
      }

      // RAPID RECALL MODE HOTKEYS
      // When wrong feedback is showing: press Space / Enter to advance
      if (feedbackState === 'wrong') {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          advanceNext();
        }
        return;
      }

      if (feedbackState !== 'idle') return;

      // Hotkey 1, 2, 3, 4, 5, 6
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        e.preventDefault();
        const idx = Number(e.key) - 1;
        if (currentQ.options && currentQ.options[idx]) {
          handleSelectOption(currentQ.options[idx]);
        }
      }

      // Hotkey A, B, C, D, E, F
      const keyUpper = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D', 'E', 'F'].includes(keyUpper)) {
        e.preventDefault();
        const optLetterIdx = keyUpper.charCodeAt(0) - 65;
        if (currentQ.options && currentQ.options[optLetterIdx]) {
          handleSelectOption(currentQ.options[optLetterIdx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isConfiguring,
    isCompleted,
    studyMethod,
    isFlipped,
    feedbackState,
    currentQ,
    handleRateFlashcard,
    handleSelectOption,
    advanceNext,
  ]);

  // =========================================================================
  // VIEW 1: SETUP SCREEN
  // =========================================================================
  if (isConfiguring) {
    const availableCount = words.length;

    return (
      <div className="w-full max-w-5xl xl:max-w-6xl mx-auto py-8 px-4 sm:px-8 animate-fade-in">
        <div className="p-6 sm:p-8 md:p-10 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-7">
          <div className="flex items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-glow shrink-0">
              <Zap className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 whitespace-nowrap">
                  ⚡ Tốc độ cao • Không giải thích dông dài
                </span>
                <span className="text-xs text-slate-400 font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 whitespace-nowrap">
                  {words[0]?.subject || 'Ngân hàng câu hỏi'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                Chế Độ Cày Phản Xạ (Rapid Muscle Memory)
              </h1>
            </div>
          </div>

          {/* Core Philosophy explanation */}
          <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
            <p className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 text-sm sm:text-base">
              <Target className="w-4 h-4 shrink-0 text-indigo-500" /> Phương pháp học tập Spaced Repetition:
            </p>
            <p className="pl-6">
              • <strong>Thẻ Lật 3D</strong>: Đọc câu hỏi, lật mặt sau ngẫm nghĩ và tự đánh giá độ nhớ [1-3] theo thuật toán SM-2 giúp ghi nhớ sâu bản chất.
            </p>
            <p className="pl-6">
              • <strong>Cày Phản Xạ</strong>: Bấm đáp án A-D tốc độ cao, đúng tự lướt qua trong 0.4s, sai bị ép làm lại sau 3 câu.
            </p>
          </div>

          {/* Method Selector: Flashcard 3D vs Speed MCQ */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" /> Chọn hình thức học đợt này
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setStudyMethod('flashcard')}
                className={`p-5 rounded-2xl border-2 text-left transition-all relative cursor-pointer ${
                  studyMethod === 'flashcard'
                    ? 'bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.25)] text-slate-900 dark:text-white scale-[1.01]'
                    : 'bg-white/60 dark:bg-[#0F172A]/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#131D31]'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className={`font-black text-sm sm:text-base flex items-center gap-2 ${
                    studyMethod === 'flashcard' ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    <BookOpen className="w-4 h-4 text-indigo-500" /> Thẻ Lật 3D (Khuyên dùng)
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                    studyMethod === 'flashcard'
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    Chuẩn SRS SM-2
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                  Lật thẻ 3D, đọc giải thích chi tiết và tự đánh giá [1-3]. Giúp hiểu sâu bản chất và ghi nhớ bền vững vào trí nhớ dài hạn.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStudyMethod('rapid')}
                className={`p-5 rounded-2xl border-2 text-left transition-all relative cursor-pointer ${
                  studyMethod === 'rapid'
                    ? 'bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.25)] text-slate-900 dark:text-white scale-[1.01]'
                    : 'bg-white/60 dark:bg-[#0F172A]/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#131D31]'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className={`font-black text-sm sm:text-base flex items-center gap-2 ${
                    studyMethod === 'rapid' ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    <Zap className="w-4 h-4 text-amber-500" /> Cày Phản Xạ Trắc Nghiệm
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                    studyMethod === 'rapid'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    Tốc độ 0.4s
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                  Chọn nhanh 1-4, đúng tự lướt qua trong 0.4s, sai bị ép làm lại sau 3 câu để rèn phản xạ nhanh trước kỳ thi.
                </p>
              </button>
            </div>
          </div>

          {/* Batch Size Selector */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" /> Chọn số lượng câu muốn cày đợt này
              </span>
              <span className="text-indigo-500 font-bold font-mono text-sm">
                {Math.min(batchSize, availableCount)} / {availableCount} câu khả dụng
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[10, 15, 25, 50].map((num) => {
                const disabled = num > availableCount && availableCount >= 10;
                const isSelected = batchSize === num;
                return (
                  <button
                    key={num}
                    type="button"
                    disabled={disabled}
                    onClick={() => setBatchSize(num)}
                    className={`p-4 rounded-2xl border-2 font-bold transition-all text-center cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-500/15 dark:bg-indigo-950/50 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.02]'
                        : disabled
                        ? 'opacity-30 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed bg-slate-50 dark:bg-slate-900/30'
                        : 'bg-white/60 dark:bg-[#0F172A]/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#131D31]'
                    }`}
                  >
                    <span className={`text-2xl sm:text-3xl font-black block ${
                      isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'
                    }`}>{num}</span>
                    <span className={`text-xs font-semibold mt-1 block whitespace-nowrap ${
                      isSelected ? 'text-indigo-600 dark:text-indigo-300 font-bold' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {num === 10 ? 'Cực nhanh (5p)' : num === 15 ? 'Chuẩn đợt học' : num === 25 ? 'Chuyên sâu' : 'Cày marathon'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mastery Threshold Selector */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" /> Tiêu chuẩn tốt nghiệp mỗi câu
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setStreakTarget(2)}
                className={`p-4 sm:p-5 rounded-2xl border-2 text-left transition-all relative cursor-pointer touch-manipulation select-none active:scale-[0.99] ${
                  streakTarget === 2
                    ? 'bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.25)] text-slate-900 dark:text-white scale-[1.01]'
                    : 'bg-white/60 dark:bg-[#0F172A]/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#131D31]'
                }`}
              >
                <div className="flex items-start sm:items-center justify-between gap-2 mb-1.5">
                  <span className={`font-black text-sm sm:text-base ${
                    streakTarget === 2 ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {studyMethod === 'flashcard' ? 'Chuẩn ghi nhớ sâu (Khuyên dùng)' : 'Chuẩn ghi nhớ sắt đá (Khuyên dùng)'}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                    streakTarget === 2
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    2 chu kỳ
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                  {studyMethod === 'flashcard'
                    ? 'Đạt đánh giá [Đã thuộc lầu] hoặc tự tin nhớ đúng qua 2 lượt ôn ngắt quãng.'
                    : 'Phải chọn đúng 2 lần liên tiếp mới tính là thuộc lầu lầu. Khắc phục triệt để đoán mò.'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStreakTarget(1)}
                className={`p-4 sm:p-5 rounded-2xl border-2 text-left transition-all relative cursor-pointer touch-manipulation select-none active:scale-[0.99] ${
                  streakTarget === 1
                    ? 'bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.25)] text-slate-900 dark:text-white scale-[1.01]'
                    : 'bg-white/60 dark:bg-[#0F172A]/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#131D31]'
                }`}
              >
                <div className="flex items-start sm:items-center justify-between gap-2 mb-1.5">
                  <span className={`font-black text-sm sm:text-base ${
                    streakTarget === 1 ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    Speed Run (Lướt nhanh)
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                    streakTarget === 1
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    1 chu kỳ
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                  {studyMethod === 'flashcard'
                    ? 'Đạt đánh giá [Đã thuộc lầu] 1 lần là hoàn thành câu ngay. Dành cho người đã ôn trước.'
                    : 'Bấm đúng 1 lần là qua luôn. Dành cho người đã ôn sơ qua và cần kiểm tra lại tốc độ.'}
                </p>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center gap-3 sm:gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onExit}
              className="w-full sm:w-auto py-3.5 sm:py-4 px-6 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm active:scale-95 touch-manipulation"
            >
              Quay lại
            </button>
            <button
              type="button"
              onClick={handleStartSession}
              className="w-full sm:flex-1 py-4 px-6 sm:px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black flex items-center justify-center gap-2.5 shadow-glow text-sm sm:text-base transition-all active:scale-95 touch-manipulation select-none"
            >
              {studyMethod === 'flashcard' ? (
                <>
                  <BookOpen className="w-5 h-5" />
                  <span className="sm:hidden">BẮT ĐẦU HỌC THẺ 3D</span>
                  <span className="hidden sm:inline">BẮT ĐẦU HỌC THẺ LẬT 3D [Enter]</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-current" />
                  <span className="sm:hidden">BẮT ĐẦU CÀY PHẢN XẠ</span>
                  <span className="hidden sm:inline">BẮT ĐẦU CÀY PHẢN XẠ [Enter]</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalInitialCount = cards.length;
  const graduatedCount = cards.filter((c) => c.correctStreak >= streakTarget).length;
  const learningCount = cards.filter(
    (c) => c.correctStreak > 0 && c.correctStreak < streakTarget
  ).length;

  // =========================================================================
  // VIEW 2: COMPLETION SCREEN
  // =========================================================================
  if (isCompleted) {
    const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
    const avgSecsPerQ = totalAttempts > 0 ? (elapsedSeconds / totalAttempts).toFixed(1) : '1.5';
    const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100;

    return (
      <div className="w-full max-w-5xl xl:max-w-6xl mx-auto py-8 px-4 sm:px-8 animate-fade-in space-y-6">
        <div className="text-center p-8 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white mx-auto flex items-center justify-center mb-4 shadow-glow-success">
            <Trophy className="w-8 h-8 animate-bounce" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            ĐÃ THUỘC LẦU LẦU 100%!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-lg mx-auto">
            Toàn bộ {totalInitialCount} câu hỏi đã được in sâu vào phản xạ cơ bắp. Bạn sẵn sàng xử đẹp bất kỳ bài kiểm tra nào!
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 max-w-2xl mx-auto">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Đã thành thạo</p>
              <p className="text-2xl font-black text-emerald-500 mt-0.5">
                {totalInitialCount} câu
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Combo kỷ lục</p>
              <p className="text-2xl font-black text-amber-500 mt-0.5">
                🔥 {maxCombo}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tốc độ phản xạ</p>
              <p className="text-2xl font-black text-indigo-500 mt-0.5">
                {avgSecsPerQ}s <span className="text-xs font-normal text-slate-400">/câu</span>
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Độ chuẩn xác</p>
              <p className="text-2xl font-black text-purple-500 mt-0.5">
                {accuracy}%
              </p>
            </div>
          </div>

          {/* Problem questions list (if any) */}
          {problemQuestions.length > 0 && (
            <div className="text-left mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Các câu từng bị bấm nhầm ({problemQuestions.length} câu đã sửa thành công):
                </h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {problemQuestions.map((pq, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs flex items-center justify-between gap-3"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1 flex-1">
                      {pq.sentence}
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      ✓ {pq.correctWord}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setIsConfiguring(true);
                soundFx.playClick();
              }}
              className="w-full sm:flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-glow text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Cày tiếp đợt khác
            </button>
            <button
              onClick={onExit}
              className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
            >
              Về Trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: ACTIVE RAPID RECALL BATTLE
  // =========================================================================
  if (!currentItem || !currentQ) {
    return <div className="text-center py-20 text-slate-500">Đang chuẩn bị câu hỏi phản xạ...</div>;
  }

  const graduatedPercent =
    totalInitialCount > 0 ? (graduatedCount / totalInitialCount) * 100 : 0;
  const learningPercent =
    totalInitialCount > 0 ? (learningCount / totalInitialCount) * 100 : 0;

  return (
    <div className="w-full max-w-5xl xl:max-w-6xl mx-auto py-4 sm:py-6 px-3 sm:px-8 animate-fade-in space-y-3 sm:space-y-5">
      {/* Top HUD Bar */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            {studyMethod === 'flashcard' ? <Sparkles className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {studyMethod === 'flashcard' ? 'Thẻ Ghi Nhớ 3D' : 'Phản xạ xoay tua 5 câu'}
              </span>
              <span className="hidden md:inline text-[10px] font-medium text-slate-400">
                • {studyMethod === 'flashcard' ? 'Phím: [Space] Lật thẻ, [1/2/3] Đánh giá' : 'Phím: [1-4] hoặc [A-D]'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-bold text-slate-900 dark:text-white flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Đã thuộc: <strong className="text-emerald-500">{graduatedCount}</strong>/{totalInitialCount}
              </span>
              {streakTarget > 1 && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    Đang nhớ (1/{streakTarget}): <strong>{learningCount}</strong>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Session Combo Streak */}
          {sessionCombo > 0 && (
            <div
              className="px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-fade-in"
              title="Chuỗi trả lời đúng liên tiếp trong phiên này"
            >
              <Flame className="w-3.5 h-3.5 fill-current text-amber-500" />
              <span>Combo: {sessionCombo}</span>
            </div>
          )}

          {/* Current card mastery progress dots */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 border transition-colors ${
              currentItem.correctStreak >= streakTarget
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                : currentItem.correctStreak > 0
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
            title={`Mỗi câu trong nhóm 5 câu cần đúng ${streakTarget} lần để tốt nghiệp`}
          >
            <span className="flex items-center gap-1">
              {Array.from({ length: streakTarget }).map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i < currentItem.correctStreak
                      ? currentItem.correctStreak >= streakTarget
                        ? 'bg-white scale-110'
                        : 'bg-amber-500 scale-110'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              ))}
            </span>
            <span>
              {currentItem.correctStreak >= streakTarget
                ? 'Đã thuộc!'
                : `Độ thuộc câu này: ${currentItem.correctStreak}/${streakTarget}`}
            </span>
          </div>

          <button
            onClick={onExit}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Thoát
          </button>
        </div>
      </div>

      {/* Multi-segment Graduation & Learning Progress Bar */}
      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex p-0.5 gap-0.5">
        {graduatedPercent > 0 && (
          <div
            className="h-full bg-emerald-500 rounded-l-full first:rounded-l-full last:rounded-r-full transition-[width] duration-300 ease-out transform-gpu"
            style={{ width: `${graduatedPercent}%` }}
            title={`Đã thuộc: ${graduatedCount}/${totalInitialCount}`}
          />
        )}
        {learningPercent > 0 && (
          <div
            className="h-full bg-amber-400 first:rounded-l-full last:rounded-r-full transition-[width] duration-300 ease-out transform-gpu"
            style={{ width: `${learningPercent}%` }}
            title={`Đang nhớ (1/${streakTarget}): ${learningCount} câu`}
          />
        )}
      </div>

      {/* Main Study Arena: 3D Flashcard or Rapid MCQ */}
      {studyMethod === 'flashcard' ? (
        <FlashcardView
          currentQ={currentQ}
          questionIndex={graduatedCount}
          totalCount={totalInitialCount}
          streak={currentItem.correctStreak}
          streakTarget={streakTarget}
          isFlipped={isFlipped}
          onToggleFlip={() => {
            setIsFlipped((f) => !f);
            soundFx.playClick();
          }}
          onRate={handleRateFlashcard}
        />
      ) : (
        /* Main Flash Question Arena (Rapid Drill) */
        <div
          key={`${currentItem.id}_${turnCount}`}
          className={`p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0F172A] border transition-[transform,border-color,box-shadow] duration-200 shadow-xl relative transform-gpu animate-question-enter ${
            feedbackState === 'correct'
              ? 'border-emerald-500/80 shadow-glow-success animate-pop-correct'
              : feedbackState === 'wrong'
              ? 'border-rose-500/80 shadow-glow-danger animate-shake'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          {/* Topic Tag */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              {currentQ.topic || currentQ.subject || 'Câu hỏi'}
            </span>

            {currentItem.mistakes > 0 && (
              <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                Đã bấm sai {currentItem.mistakes} lần
              </span>
            )}
          </div>

          {/* Question Content (With Syntax Highlighting for C code) */}
          <div className="mb-6">
            <CodeQuestionRenderer
              content={currentQ.sentence}
              className="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-white leading-relaxed"
            />
          </div>

          {/* 4 Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {currentQ.options &&
              currentQ.options.map((opt, idx) => {
                const isSelected = selectedOpt === opt;
                const isTrueAnswer = isAnswerMatch(opt, currentQ.correctWord, currentQ.answerKey);

                let optionStyle =
                  'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30';

                if (feedbackState === 'correct' && isSelected) {
                  optionStyle =
                    'bg-emerald-500 text-white border-emerald-500 shadow-glow font-bold scale-[1.01]';
                } else if (feedbackState === 'wrong') {
                  if (isSelected) {
                    optionStyle =
                      'bg-rose-500 text-white border-rose-500 shadow-glow line-through opacity-90';
                  } else if (isTrueAnswer) {
                    // VISUAL ANCHOR: The true answer GLOWS GREEN boldly!
                    optionStyle =
                      'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 shadow-glow-success font-black ring-2 ring-emerald-500/40 animate-pop-correct';
                  } else {
                    optionStyle =
                      'opacity-30 border-slate-200 dark:border-slate-800 text-slate-400';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={feedbackState !== 'idle'}
                    onClick={() => handleSelectOption(opt)}
                    className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border text-left text-sm sm:text-base transition-[transform,background-color,border-color,opacity] duration-150 flex items-start gap-3 sm:gap-3.5 group relative active:scale-[0.98] touch-manipulation select-none transform-gpu ${optionStyle}`}
                  >
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
                        feedbackState === 'correct' && isSelected
                          ? 'bg-white/20 text-white'
                          : feedbackState === 'wrong' && isTrueAnswer
                          ? 'bg-emerald-500 text-white'
                          : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <span className="flex-1 font-medium leading-relaxed">
                      {opt}
                    </span>

                    {/* Feedback Badge */}
                    {feedbackState === 'correct' && isSelected && (
                      <Check className="w-5 h-5 text-white shrink-0 mt-0.5" />
                    )}
                    {feedbackState === 'wrong' && isSelected && (
                      <X className="w-5 h-5 text-white shrink-0 mt-0.5" />
                    )}
                    {feedbackState === 'wrong' && isTrueAnswer && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500 text-white shrink-0 shadow-sm whitespace-nowrap mt-0.5">
                        Đáp án đúng ⭐
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          {/* Wrong Feedback Anchor Action Bar */}
          {feedbackState === 'wrong' && (
            <div className="mt-6 p-4 rounded-2xl bg-slate-900 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>
                  Nhìn kỹ đáp án màu <strong className="text-emerald-400 font-bold">Xanh Lá</strong> ở trên! Câu này sẽ xuất hiện lại trong nhóm xoay tua sau <strong>3 câu nữa</strong>.
                </span>
              </div>

              <button
                type="button"
                onClick={advanceNext}
                className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-glow transition-all"
              >
                <span>Đã Nhớ, Tiếp Tục [Space]</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
