'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Word, WordProgress } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import { useQuizStore } from '@/lib/quizStore';
import {
  getQuestionKey,
  cleanOptionText,
  isAnswerMatch,
  isQuestionAnsweredCorrectly,
  getQuestionAnswerMeta,
  resolveCorrectOptionFromAnswer,
  formatExplanationForCurrentOptions,
  shuffleArray,
} from '@/lib/utils';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import OptionContent from '@/components/OptionContent';
import AITutorButton from '@/components/ai/AITutorButton';
import GpuProgressBar from '@/components/ui/GpuProgressBar';
import MobileThumbBar from './MobileThumbBar';
import DrillConfigView from './drill/DrillConfigView';
import DrillResultView from './drill/DrillResultView';
import { CheckpointPart, PartQuestionItem } from './drill/types';
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  Zap,
  HelpCircle,
  Shuffle,
  Check,
  BookOpen,
} from 'lucide-react';
import { triggerAstronomicalCelebration } from '@/lib/celebration';

interface DrillModeProps {
  words: Word[];
  onExit: () => void;
}

export default function DrillMode({ words, onExit }: DrillModeProps) {
  // Configuration & Checkpoint State
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [partSize, setPartSize] = useState<number>(20);
  const [retryMistakesAtEnd, setRetryMistakesAtEnd] = useState<boolean>(true);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);
  const [autoAdvanceCorrect, setAutoAdvanceCorrect] = useState<boolean>(false);
  const [progressMap, setProgressMap] = useState<Record<string, WordProgress>>({});

  // Active Session State
  const [activePart, setActivePart] = useState<CheckpointPart | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<PartQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isSubmittedAnswer, setIsSubmittedAnswer] = useState(false);
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
          const hasAnswerKey = Boolean(target.answer?.trim() || target.correctWord?.trim());
          const rawCorrect = hasAnswerKey
            ? resolveCorrectOptionFromAnswer(target.answer, target.options, target.correctWord)
            : '';
          const meta = hasAnswerKey
            ? getQuestionAnswerMeta(rawCorrect, target.answer, target.options)
            : {
                isMultiSelect: false,
                requiredCount: 1,
                correctChoices: [],
                answerKeys: [],
                isOrMode: false,
              };
          return {
            id: key,
            rawWord: target,
            originalNumber: idx + 1,
            sentence: target.question,
            correctWord: rawCorrect,
            correctOptions: meta.correctChoices,
            originalCorrectWord: rawCorrect,
            originalCorrectOptions: meta.correctChoices,
            originalAnswerKey: target.answer,
            isMultiSelect: meta.isMultiSelect,
            requiredCount: meta.requiredCount,
            options: target.options,
            originalOptions: target.options,
            explanation:
              target.explanation ||
              (hasAnswerKey
                ? `Answer: ${target.answer || target.options[0]}`
                : 'Câu hỏi này chưa có đáp án gốc. Hãy bấm nút AI bên dưới để suy luận đáp án đúng & giảng bản chất bài.'),
            answerKey: target.answer,
            hasAnswerKey,
            image: target.image,
            imageCaption: target.imageCaption,
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
        const finalOpts = options.length >= 2 ? options : [target.word, 'Đáp án khác'];
        return {
          id: key,
          rawWord: target,
          originalNumber: idx + 1,
          sentence,
          correctWord: target.word,
          correctOptions: [target.word],
          originalCorrectWord: target.word,
          originalCorrectOptions: [target.word],
          originalAnswerKey: undefined,
          isMultiSelect: false,
          requiredCount: 1,
          options: finalOpts,
          originalOptions: finalOpts,
          explanation: `${target.word}: ${target.vi || 'Đáp án chính xác'}`,
          hasAnswerKey: true,
          image: target.image,
          imageCaption: target.imageCaption,
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
      const p = StorageEngine.getItemProgress(item.rawWord, progressMap);
      if (p?.status === 'mastered') {
        masteredTotal++;
      } else {
        unmasteredItems.push(item);
      }
      if (
        p &&
        ((p.wrongStreak || 0) > 0 ||
          ((p.mistakesCount || 0) > 0 && p.status !== 'mastered'))
      ) {
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
        const p = StorageEngine.getItemProgress(it.rawWord, progressMap);
        if (p?.status === 'mastered') mCount++;
        else if (p && p.seenCount > 0) lCount++;
        if (
          p &&
          ((p.wrongStreak || 0) > 0 ||
            ((p.mistakesCount || 0) > 0 && p.status !== 'mastered'))
        ) {
          errCount++;
        }
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
    (items: PartQuestionItem[], forceShuffle?: boolean): PartQuestionItem[] => {
      const shouldShuffle = forceShuffle !== undefined ? forceShuffle : shuffleOptions;
      return items.map((q) => {
        if (!shouldShuffle) {
          return {
            ...q,
            options: q.originalOptions,
            correctOptions: q.originalCorrectOptions,
            correctWord: q.originalCorrectWord,
            answerKey: q.originalAnswerKey,
          };
        }
        const cleanedCorrectOpts = q.hasAnswerKey
          ? q.originalCorrectOptions.map((c) => cleanOptionText(c))
          : [];
        return {
          ...q,
          options: shuffleArray(q.originalOptions.map((o) => cleanOptionText(o)), true),
          correctOptions: cleanedCorrectOpts,
          correctWord: q.hasAnswerKey ? cleanedCorrectOpts.join(' | ') : '',
          answerKey: undefined,
        };
      });
    },
    [shuffleOptions]
  );

  // Live toggle for option shuffling during active Drill session
  const handleToggleShuffleLive = useCallback(() => {
    setShuffleOptions((prev) => {
      const nextVal = !prev;
      setSessionQuestions((prevQs) =>
        prevQs.map((q, idx) => {
          // Do not reshuffle already-answered current question if submitted
          if (idx === currentIndex && isSubmittedAnswer) return q;
          if (!nextVal) {
            return {
              ...q,
              options: q.originalOptions,
              correctOptions: q.originalCorrectOptions,
              correctWord: q.originalCorrectWord,
              answerKey: q.originalAnswerKey,
            };
          }
          const cleanedCorrectOpts = q.hasAnswerKey
            ? q.originalCorrectOptions.map((c) => cleanOptionText(c))
            : [];
          return {
            ...q,
            options: shuffleArray(q.originalOptions.map((o) => cleanOptionText(o)), true),
            correctOptions: cleanedCorrectOpts,
            correctWord: q.hasAnswerKey ? cleanedCorrectOpts.join(' | ') : '',
            answerKey: undefined,
          };
        })
      );
      if (!isSubmittedAnswer) {
        setSelectedWords([]);
      }
      return nextVal;
    });
  }, [currentIndex, isSubmittedAnswer]);

  const handleStartPart = useCallback(
    (part: CheckpointPart) => {
      if (!part || part.items.length === 0) return;
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);

      const prepared = prepareQuestionOptions(part.items);
      setActivePart(part);
      setSessionQuestions(prepared);
      setCurrentIndex(0);
      setSelectedWords([]);
      setIsSubmittedAnswer(false);
      setFirstTryScore(0);
      setStreak(0);
      setIsRetryPhase(false);
      setRetryQueue([]);
      setTotalMistakesMade(0);
      setIsCompleted(false);
      setIsConfiguring(false);
    },
    [prepareQuestionOptions]
  );

  const currentQ = sessionQuestions[currentIndex];

  const isOptionCorrect = useCallback(
    (opt: string, q: PartQuestionItem) => {
      if (!q.hasAnswerKey) return false;
      return isAnswerMatch(
        opt,
        q.correctWord,
        shuffleOptions ? undefined : q.answerKey,
        q.correctOptions
      );
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
      setSelectedWords([]);
      setIsSubmittedAnswer(false);
      setCurrentIndex((i) => i + 1);
      return;
    }

    // Reached the end of current pass — check if there are mistakes to retry!
    if (retryMistakesAtEnd && retryQueue.length > 0) {
      const nextRetryBatch = prepareQuestionOptions(retryQueue);
      setIsRetryPhase(true);
      setSessionQuestions(nextRetryBatch);
      setRetryQueue([]);
      setCurrentIndex(0);
      setSelectedWords([]);
      setIsSubmittedAnswer(false);
      return;
    }

    // Completed the entire Checkpoint!
    refreshProgress();
    setIsCompleted(true);
    const totalCount = activePart?.items.length || sessionQuestions.length || 1;
    StorageEngine.recordActivity('drill', Math.round((firstTryScore / totalCount) * 100));
    triggerAstronomicalCelebration('session');
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

  const submitAnswer = useCallback(
    (choices: string[]) => {
      if (isSubmittedAnswer || !currentQ || choices.length === 0) return;
      setIsSubmittedAnswer(true);

      if (!currentQ.hasAnswerKey) {
        if (!isRetryPhase) {
          setFirstTryScore((s) => s + 1);
        }
        return;
      }

      const isCorrect = isQuestionAnsweredCorrectly(
        choices,
        currentQ.correctWord,
        shuffleOptions ? undefined : currentQ.answerKey,
        currentQ.correctOptions
      );

      if (isCorrect) {
        if (!isRetryPhase) {
          setFirstTryScore((s) => s + 1);
        }
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        if (nextStreak >= 3) {
          useQuizStore.getState().triggerConstellationAction('shooting_star');
        }
        StorageEngine.updateWordProgress(currentQ.id, isRetryPhase ? 4 : 5);

        if (autoAdvanceCorrect) {
          if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
          autoAdvanceTimerRef.current = setTimeout(() => {
            handleNextRef.current();
          }, 1100);
        }
      } else {
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
    [
      isSubmittedAnswer,
      currentQ,
      shuffleOptions,
      isRetryPhase,
      streak,
      autoAdvanceCorrect,
      retryMistakesAtEnd,
    ]
  );

  const handleSelect = useCallback(
    (choice: string) => {
      if (isSubmittedAnswer || !currentQ) return;

      if (!currentQ.isMultiSelect) {
        setSelectedWords([choice]);
        submitAnswer([choice]);
        return;
      }

      // Multi-select: toggle choice in selectedWords
      setSelectedWords((prev) =>
        prev.includes(choice) ? prev.filter((item) => item !== choice) : [...prev, choice]
      );
    },
    [isSubmittedAnswer, currentQ, submitAnswer]
  );

  const handleConfirmMulti = useCallback(() => {
    if (!currentQ || isSubmittedAnswer || selectedWords.length === 0) return;
    submitAnswer(selectedWords);
  }, [currentQ, isSubmittedAnswer, selectedWords, submitAnswer]);

  // Find next sequential part if available
  const nextSequentialPart = useMemo(() => {
    if (!activePart || activePart.index < 0) return null;
    return sequentialParts.find((p) => p.index === activePart.index + 1) || null;
  }, [activePart, sequentialParts]);

  // Global keyboard shortcuts: 1-6 / A-F to answer, Enter to confirm multi-select, Enter / Space to advance
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

      if (!isSubmittedAnswer) {
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
          return;
        }

        if (e.key === 'Enter' && currentQ.isMultiSelect && selectedWords.length > 0) {
          e.preventDefault();
          handleConfirmMulti();
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
    isSubmittedAnswer,
    selectedWords,
    nextSequentialPart,
    handleSelect,
    handleConfirmMulti,
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
    return (
      <DrillConfigView
        subjectLabel={words[0]?.subject}
        totalItemsCount={allItems.length}
        totalMastered={totalMastered}
        partSize={partSize}
        setPartSize={setPartSize}
        sequentialParts={sequentialParts}
        unmasteredPart={unmasteredPart}
        mistakesPart={mistakesPart}
        retryMistakesAtEnd={retryMistakesAtEnd}
        setRetryMistakesAtEnd={setRetryMistakesAtEnd}
        shuffleOptions={shuffleOptions}
        setShuffleOptions={setShuffleOptions}
        autoAdvanceCorrect={autoAdvanceCorrect}
        setAutoAdvanceCorrect={setAutoAdvanceCorrect}
        onStartPart={handleStartPart}
        onExit={onExit}
      />
    );
  }

  // =========================================================================
  // VIEW 2: CHECKPOINT COMPLETED SCREEN
  // =========================================================================
  if (isCompleted && activePart) {
    return (
      <DrillResultView
        activePart={activePart}
        nextSequentialPart={nextSequentialPart}
        totalItemsCount={allItems.length}
        totalMastered={totalMastered}
        firstTryScore={firstTryScore}
        totalMistakesMade={totalMistakesMade}
        retryMistakesAtEnd={retryMistakesAtEnd}
        onStartPart={handleStartPart}
        onReconfigure={() => {
          refreshProgress();
          setIsConfiguring(true);
        }}
        onExit={onExit}
      />
    );
  }

  if (!currentQ) return null;

  // =========================================================================
  // VIEW 3: ACTIVE TUTOR QUESTION & INSTANT EXPLANATION VIEW
  // =========================================================================
  const isAnswered = isSubmittedAnswer;
  const hasKnownKey = currentQ.hasAnswerKey;
  const wasAnsweredCorrect =
    isAnswered && hasKnownKey
      ? isQuestionAnsweredCorrectly(
          selectedWords,
          currentQ.correctWord,
          shuffleOptions ? undefined : currentQ.answerKey,
          currentQ.correctOptions
        )
      : false;

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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Shuffle Options Toggle Pill */}
          <button
            type="button"
            onClick={handleToggleShuffleLive}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              shuffleOptions
                ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
            }`}
            title="Bật/tắt đảo ngẫu nhiên vị trí đáp án A/B/C/D chống học vẹt vị trí"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Đảo A–D: {shuffleOptions ? 'BẬT' : 'TẮT'}</span>
          </button>

          {retryMistakesAtEnd && retryQueue.length > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Cần sửa cuối chặng: {retryQueue.length}
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
      <GpuProgressBar
        percent={((currentIndex + 1) / sessionQuestions.length) * 100}
        trackClassName="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full mb-6"
        barClassName={`rounded-full ${isRetryPhase ? 'bg-rose-500' : 'bg-emerald-500'}`}
      />

      {/* Question & Choices Animated Container */}
      <div key={`${isRetryPhase ? 'retry' : 'main'}_${currentIndex}`} className="animate-question-enter transform-gpu">
        {/* Question Card */}
        <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl glass-surface mb-5">
          <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 uppercase tracking-wider flex-wrap">
              <HelpCircle className="w-4 h-4" />
              <span>Câu #{currentQ.originalNumber} trong đề</span>
              {currentQ.isMultiSelect && (
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 normal-case">
                  Chọn {currentQ.requiredCount} đáp án ({selectedWords.length}/{currentQ.requiredCount})
                </span>
              )}
              {shuffleOptions && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center gap-1 normal-case">
                  <Shuffle className="w-3 h-3" /> Đã đảo thứ tự A–D
                </span>
              )}
            </div>
            <span className="hidden sm:inline text-[11px] font-semibold text-slate-400">
              Phím tắt: [1–{currentQ.options.length}] hoặc [A–{String.fromCharCode(64 + currentQ.options.length)}]
            </span>
          </div>
          <CodeQuestionRenderer
            content={currentQ.sentence}
            image={currentQ.image || currentQ.rawWord?.image}
            imageCaption={currentQ.imageCaption || currentQ.rawWord?.imageCaption}
            className="text-base sm:text-xl font-medium sm:font-semibold text-slate-900 dark:text-white leading-[1.65]"
          />
        </div>

        {/* Choices */}
        <div className="space-y-2.5 sm:space-y-3 mb-5">
          {currentQ.options.map((opt, idx) => {
            const isSelected = selectedWords.includes(opt);
            const isTarget = isOptionCorrect(opt, currentQ);
            let style =
              'w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl font-semibold border text-left transition-[transform,background-color,border-color,opacity] duration-150 flex items-start justify-between active:scale-[0.99] touch-manipulation select-none transform-gpu ';

            if (!isAnswered) {
              if (isSelected) {
                style +=
                  'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-200 shadow-sm font-bold';
              } else {
                style +=
                  'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-900 dark:text-white cursor-pointer';
              }
            } else if (!hasKnownKey) {
              if (isSelected) {
                style +=
                  'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-200 shadow-sm font-bold';
              } else {
                style +=
                  'opacity-65 bg-slate-100/70 dark:bg-slate-800/70 border-transparent text-slate-500';
              }
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
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span
                    className={`w-7 h-7 ${
                      currentQ.isMultiSelect ? 'rounded-lg' : 'rounded-xl'
                    } text-xs flex items-center justify-center font-mono font-bold shrink-0 mt-0.5 ${
                      isSelected && (!isAnswered || !hasKnownKey)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <div className="flex-1 min-w-0 text-sm sm:text-base">
                    <OptionContent content={opt} />
                  </div>
                </div>
                {!isAnswered && currentQ.isMultiSelect && (
                  <span
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ml-2 transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </span>
                )}
                {isAnswered && hasKnownKey && isTarget && (
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {!isSelected && currentQ.isMultiSelect && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                        Chọn thiếu
                      </span>
                    )}
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                )}
                {isAnswered && hasKnownKey && isSelected && !isTarget && (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>

        {/* Multi-Select Confirm Button */}
        {!isAnswered && currentQ.isMultiSelect && (
          <MobileThumbBar className="mb-5">
            <button
              type="button"
              disabled={selectedWords.length === 0}
              onClick={handleConfirmMulti}
              className={`w-full py-3.5 rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] ${
                selectedWords.length === currentQ.requiredCount
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-glow'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                Xác nhận đáp án ({selectedWords.length}/{currentQ.requiredCount}){' '}
                <span className="hidden sm:inline">[Enter]</span>
              </span>
            </button>
          </MobileThumbBar>
        )}
      </div>

      {/* Explanation Banner */}
      {isAnswered && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border mb-5 animate-slide-up ${
            !hasKnownKey
              ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300/70 dark:border-indigo-500/40'
              : wasAnsweredCorrect
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300/70 dark:border-emerald-800/70'
              : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300/70 dark:border-rose-800/70'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <p
              className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                !hasKnownKey
                  ? 'text-indigo-700 dark:text-cyan-300'
                  : wasAnsweredCorrect
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>
                {!hasKnownKey
                  ? '📌 Câu chưa có đáp án gốc — Đã ghi nhận lựa chọn của bạn. Bấm nút AI bên dưới để suy luận đáp án đúng & giảng bản chất:'
                  : wasAnsweredCorrect
                  ? 'Chính xác! Giải thích chi tiết:'
                  : 'Chưa đúng! Hãy đọc kỹ giải thích:'}
              </span>
            </p>
            {hasKnownKey && !wasAnsweredCorrect && retryMistakesAtEnd && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-600 dark:text-rose-300">
                📌 Đã thêm vào vòng làm lại cuối chặng
              </span>
            )}
          </div>
          {hasKnownKey && (
            <div className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
              <CodeQuestionRenderer
                content={formatExplanationForCurrentOptions(
                  currentQ.explanation,
                  currentQ.options,
                  currentQ.correctWord,
                  currentQ.answerKey,
                  shuffleOptions,
                  currentQ.correctOptions
                )}
                className="text-sm sm:text-base"
              />
            </div>
          )}
        </div>
      )}

      {isAnswered && (
        <AITutorButton
          question={currentQ.sentence}
          options={currentQ.options}
          correctAnswer={hasKnownKey ? currentQ.correctWord : ''}
          userAnswer={
            !hasKnownKey
              ? selectedWords.join(' | ')
              : wasAnsweredCorrect
              ? undefined
              : selectedWords.join(' | ')
          }
          subject={currentQ.rawWord?.subject}
          topic={currentQ.rawWord?.topic}
          className="mb-5"
        />
      )}

      {/* Continue Button */}
      {isAnswered && (
        <MobileThumbBar>
          <button
            type="button"
            onClick={handleNext}
            className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-glow-success transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>
              {currentIndex < sessionQuestions.length - 1 ? (
                <>
                  Câu tiếp theo <span className="hidden sm:inline">[Enter / Space]</span>
                </>
              ) : retryMistakesAtEnd && retryQueue.length > 0 ? (
                <>
                  Vào vòng sửa {retryQueue.length} câu sai{' '}
                  <span className="hidden sm:inline">[Enter]</span>
                </>
              ) : (
                <>
                  Hoàn thành chặng <span className="hidden sm:inline">[Enter]</span>
                </>
              )}
            </span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </MobileThumbBar>
      )}
    </div>
  );
}
