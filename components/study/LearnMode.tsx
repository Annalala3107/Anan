'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Word } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import { isAnswerMatch } from '@/lib/utils';
import { soundFx } from '@/lib/sound';
import { buildStandardQuestions, StandardQuestion } from '@/lib/quizHelpers';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import {
  Zap,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  ArrowRight,
  Flame,
  Check,
  X,
  Target,
  Sparkles,
  Layers,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LearnModeProps {
  words: Word[];
  onExit: () => void;
}

interface QueueItem {
  id: string;
  question: StandardQuestion;
  correctStreak: number; // 0, 1, 2 -> needs 2 consecutive correct to graduate
  mistakes: number;
}

export default function LearnMode({ words, onExit }: LearnModeProps) {
  // Setup State
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [batchSize, setBatchSize] = useState(15);
  const [streakTarget, setStreakTarget] = useState(2); // 1 = Speed run, 2 = Ironclad memory

  // Active Session State
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [graduatedIds, setGraduatedIds] = useState<Set<string>>(new Set());
  const [totalInitialCount, setTotalInitialCount] = useState(0);

  // Interaction State
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [isCompleted, setIsCompleted] = useState(false);

  // Performance Metrics
  const [startTime, setStartTime] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [problemQuestions, setProblemQuestions] = useState<StandardQuestion[]>([]);

  // Start the Rapid Recall session
  const handleStartSession = useCallback(() => {
    if (!words || words.length === 0) return;

    const count = Math.min(words.length, batchSize);
    const standardList = buildStandardQuestions(words, count);

    const initialQueue: QueueItem[] = standardList.map((q, idx) => ({
      id: `${q.id}_${idx}_${Date.now()}`,
      question: q,
      correctStreak: 0,
      mistakes: 0,
    }));

    setQueue(initialQueue);
    setTotalInitialCount(initialQueue.length);
    setCurrentIndex(0);
    setGraduatedIds(new Set());
    setSelectedOpt(null);
    setFeedbackState('idle');
    setIsConfiguring(false);
    setIsCompleted(false);
    setStartTime(Date.now());
    setTotalAttempts(0);
    setCorrectAttempts(0);
    setProblemQuestions([]);
    soundFx.playClick();
  }, [words, batchSize]);

  const currentItem = queue[currentIndex];
  const currentQ = currentItem?.question;

  // Handle Option Selection
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

        const newStreak = currentItem.correctStreak + 1;
        currentItem.correctStreak = newStreak;

        // Record progress in SRS engine
        StorageEngine.updateWordProgress(currentQ.id, 5);

        if (newStreak >= streakTarget) {
          // GRADUATE THIS QUESTION!
          setGraduatedIds((prev) => {
            const nextSet = new Set(prev);
            nextSet.add(currentItem.id);
            return nextSet;
          });
        }

        // Auto-advance quickly after 420ms for rapid muscle memory conditioning
        setTimeout(() => {
          advanceNext();
        }, 420);
      } else {
        soundFx.playWrong();
        setFeedbackState('wrong');
        currentItem.correctStreak = 0;
        currentItem.mistakes += 1;

        // Track as problem question
        setProblemQuestions((prev) => {
          if (!prev.some((pq) => pq.id === currentQ.id)) {
            return [...prev, currentQ];
          }
          return prev;
        });

        // Record mistake in SRS
        StorageEngine.recordMistakeOnly(currentQ.id);

        // FORCED ACTIVE RECALL: Re-insert this question 3 positions ahead in the queue!
        setQueue((prevQueue) => {
          const newQueue = [...prevQueue];
          const reinsertIdx = Math.min(newQueue.length, currentIndex + 4);
          newQueue.splice(reinsertIdx, 0, {
            ...currentItem,
            correctStreak: 0,
          });
          return newQueue;
        });
      }
    },
    [feedbackState, currentItem, currentQ, streakTarget, currentIndex]
  );

  // Advance to next available question in queue
  const advanceNext = useCallback(() => {
    setSelectedOpt(null);
    setFeedbackState('idle');

    // Check if all original questions have graduated
    if (graduatedIds.size >= totalInitialCount && totalInitialCount > 0) {
      finishSession();
      return;
    }

    // Find next un-graduated question in queue
    let nextIdx = currentIndex + 1;
    while (nextIdx < queue.length && graduatedIds.has(queue[nextIdx].id)) {
      nextIdx++;
    }

    if (nextIdx < queue.length) {
      setCurrentIndex(nextIdx);
    } else {
      // Loop back to find any remaining un-graduated questions
      const remainingIdx = queue.findIndex((item) => !graduatedIds.has(item.id));
      if (remainingIdx !== -1) {
        setCurrentIndex(remainingIdx);
      } else {
        finishSession();
      }
    }
  }, [currentIndex, queue, graduatedIds, totalInitialCount]);

  const finishSession = () => {
    setIsCompleted(true);
    soundFx.playCelebration();
    confetti({
      particleCount: 160,
      spread: 80,
      origin: { y: 0.6 },
    });
    StorageEngine.recordActivity('learn', 100);
  };

  // Global Keyboard listener: 1-4, A-D, Space / Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isConfiguring || isCompleted || !currentQ) return;

      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      // When wrong feedback is showing: press Space / Enter to advance
      if (feedbackState === 'wrong') {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          advanceNext();
        }
        return;
      }

      if (feedbackState !== 'idle') return;

      // Hotkey 1, 2, 3, 4
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const idx = Number(e.key) - 1;
        if (currentQ.options && currentQ.options[idx]) {
          handleSelectOption(currentQ.options[idx]);
        }
      }

      // Hotkey A, B, C, D
      const keyUpper = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(keyUpper)) {
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
    feedbackState,
    currentQ,
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
              <Target className="w-4 h-4 shrink-0 text-indigo-500" /> Cơ chế học vẹt cưỡng chế phản xạ:
            </p>
            <p className="pl-6">
              • Nhìn câu hỏi → Bấm đáp án ngay (Phím số <strong>1 - 4</strong> hoặc phím chữ <strong>A - D</strong>). Chọn đúng sẽ tự động lướt qua cực nhanh trong <strong>0.4s</strong>.
            </p>
            <p className="pl-6">
              • Bấm <strong>SAI</strong>: Hệ thống đập ngay đáp án chuẩn màu xanh vào mắt để não ghi nhớ mặt chữ, và <strong>bắt buộc bạn phải làm lại câu đó sau 3 câu nữa</strong> cho đến khi thuộc lầu lầu!
            </p>
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
                    className={`p-4 rounded-2xl border font-bold transition-all text-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-glow scale-[1.01]'
                        : disabled
                        ? 'opacity-30 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl font-black block">{num}</span>
                    <span className="text-xs font-semibold opacity-85 mt-1 block whitespace-nowrap">
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
                className={`p-5 rounded-2xl border text-left transition-all ${
                  streakTarget === 2
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-glow scale-[1.005]'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5 flex-nowrap">
                  <span className="font-black text-sm sm:text-base whitespace-nowrap">
                    Chuẩn ghi nhớ sắt đá (Khuyên dùng)
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 whitespace-nowrap shrink-0">
                    2 lần đúng
                  </span>
                </div>
                <p className="text-xs sm:text-sm opacity-85 leading-relaxed">
                  Phải chọn đúng 2 lần liên tiếp mới tính là thuộc lầu lầu. Khắc phục triệt để đoán mò.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStreakTarget(1)}
                className={`p-5 rounded-2xl border text-left transition-all ${
                  streakTarget === 1
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-glow scale-[1.005]'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5 flex-nowrap">
                  <span className="font-black text-sm sm:text-base whitespace-nowrap">
                    Speed Run (Lướt nhanh)
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 whitespace-nowrap shrink-0">
                    1 lần đúng
                  </span>
                </div>
                <p className="text-xs sm:text-sm opacity-85 leading-relaxed">
                  Bấm đúng 1 lần là qua luôn. Dành cho người đã ôn sơ qua và cần kiểm tra lại tốc độ.
                </p>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onExit}
              className="py-4 px-6 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
            >
              Quay lại
            </button>
            <button
              type="button"
              onClick={handleStartSession}
              className="flex-1 py-4 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-black flex items-center justify-center gap-2.5 shadow-glow text-base transition-all"
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>BẮT ĐẦU CÀY PHẢN XẠ [Enter]</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="grid grid-cols-3 gap-3 my-6 max-w-xl mx-auto">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Đã thành thạo</p>
              <p className="text-2xl font-black text-emerald-500 mt-0.5">
                {totalInitialCount} câu
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

  const graduatedCount = graduatedIds.size;
  const progressPercent = totalInitialCount > 0 ? Math.round((graduatedCount / totalInitialCount) * 100) : 0;

  return (
    <div className="w-full max-w-5xl xl:max-w-6xl mx-auto py-6 px-4 sm:px-8 animate-fade-in space-y-5">
      {/* Top HUD Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Phản xạ cao tốc
            </span>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <span>Đã thuộc: <strong className="text-emerald-500">{graduatedCount}</strong>/{totalInitialCount}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-400">Phím tắt: [1-4] hoặc [A-D]</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Current question consecutive streak counter */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 border ${
              currentItem.correctStreak > 0
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
            title={`Cần ${streakTarget} lần đúng liên tiếp để tốt nghiệp câu này`}
          >
            <Flame className={`w-3.5 h-3.5 ${currentItem.correctStreak > 0 ? 'fill-current text-emerald-500' : ''}`} />
            <span>Đúng liên tiếp: {currentItem.correctStreak}/{streakTarget}</span>
          </div>

          <button
            onClick={onExit}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Thoát
          </button>
        </div>
      </div>

      {/* Graduation Progress Bar */}
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.max(progressPercent, 4)}%` }}
        />
      </div>

      {/* Main Flash Question Arena */}
      <div
        className={`p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0F172A] border transition-all duration-200 shadow-xl relative ${
          feedbackState === 'correct'
            ? 'border-emerald-500/80 shadow-glow-success scale-[1.005]'
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
              const letter = String.fromCharCode(65 + idx);
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
                    'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 shadow-glow-success font-black ring-2 ring-emerald-500/40 animate-pulse';
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
                  className={`p-4 sm:p-5 rounded-2xl border text-left text-sm sm:text-base transition-all flex items-start gap-3.5 group relative ${optionStyle}`}
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
                Nhìn kỹ đáp án màu <strong className="text-emerald-400 font-bold">Xanh Lá</strong> ở trên! Câu này sẽ xuất hiện lại sau <strong>3 câu nữa</strong>.
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
    </div>
  );
}
