'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Word, ExamQuestion } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import { getQuestionKey, cleanOptionText, isQuestionAnsweredCorrectly } from '@/lib/utils';
import { useQuizStore } from '@/lib/quizStore';
import { buildStandardQuestions } from '@/lib/quizHelpers';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import ExamConfigView from './exam/ExamConfigView';
import ExamResultView from './exam/ExamResultView';
import {
  Clock,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Flag,
  AlertTriangle,
  Layers,
  Shuffle,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExamModeProps {
  words: Word[];
  onExit: () => void;
}

export default function ExamMode({ words, onExit }: ExamModeProps) {
  const setIsExamActive = useQuizStore((s) => s.setIsExamActive);

  // Configuration State
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [targetCount, setTargetCount] = useState(25);
  const [targetMinutes, setTargetMinutes] = useState(10); // -1 = untimed
  const [shuffleChoices, setShuffleChoices] = useState(true);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  // Taking Exam State
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const [flags, setFlags] = useState<Record<number, boolean>>({});
  const [filterView, setFilterView] = useState<'all' | 'unanswered' | 'flagged'>('all');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // in seconds, or -1 for untimed
  const [elapsedSeconds, setElapsedSeconds] = useState(0); // counts up when untimed
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false); // Collapsible navigator on mobile

  // Result Review Filter States (Tính năng 2: Lọc xem câu hỏi theo chuyên đề & câu sai)
  const [resultFilterMode, setResultFilterMode] = useState<'all' | 'wrong' | 'flagged'>('all');
  const [resultFilterTopic, setResultFilterTopic] = useState<string | null>(null);

  // Extract available topics from dataset
  const availableTopics = useMemo(() => {
    if (!words || words.length === 0) return [];
    const map = new Map<string, number>();
    words.forEach((w) => {
      const topicName = (w.topic || 'Chuyên đề chung').trim();
      map.set(topicName, (map.get(topicName) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [words]);

  // Initialize selected topics with all topics once words load
  useEffect(() => {
    if (availableTopics.length > 0 && selectedTopics.length === 0) {
      setSelectedTopics(availableTopics.map((t) => t.name));
    }
  }, [availableTopics, selectedTopics.length]);

  // Compute number of questions matching selected topics
  const filteredAvailableCount = useMemo(() => {
    if (!words || words.length === 0) return 0;
    if (selectedTopics.length === 0 || selectedTopics.length === availableTopics.length) {
      return words.length;
    }
    return words.filter((w) => {
      const topicName = (w.topic || 'Chuyên đề chung').trim();
      return selectedTopics.includes(topicName);
    }).length;
  }, [words, selectedTopics, availableTopics.length]);

  // Keep targetCount valid within filtered pool bounds
  useEffect(() => {
    if (filteredAvailableCount > 0 && targetCount > filteredAvailableCount) {
      setTargetCount(filteredAvailableCount);
    }
  }, [filteredAvailableCount, targetCount]);

  const toggleAllTopics = () => {
    if (selectedTopics.length === availableTopics.length) {
      // Unselect all (keep empty or none)
      setSelectedTopics([]);
    } else {
      // Select all
      setSelectedTopics(availableTopics.map((t) => t.name));
    }
  };

  const handleToggleTopic = (topicName: string) => {
    setSelectedTopics((prev) => {
      if (prev.includes(topicName)) {
        return prev.filter((t) => t !== topicName);
      } else {
        return [...prev, topicName];
      }
    });
  };

  // Launch the exam with the configured settings
  const handleStartExam = useCallback(() => {
    if (!words || words.length === 0) return;

    // Filter words by selected topics
    let eligibleWords = words;
    if (selectedTopics.length > 0 && selectedTopics.length < availableTopics.length) {
      eligibleWords = words.filter((w) => {
        const topicName = (w.topic || 'Chuyên đề chung').trim();
        return selectedTopics.includes(topicName);
      });
      if (eligibleWords.length === 0) eligibleWords = words;
    }

    const count = Math.min(eligibleWords.length, targetCount);
    const list = buildStandardQuestions(eligibleWords, count, {
      mode: 'random',
      shuffleChoices,
    });
    setQuestions(list);

    // Setup timer
    if (targetMinutes === -1) {
      setTimeLeft(-1);
    } else {
      setTimeLeft(targetMinutes * 60);
    }

    setElapsedSeconds(0);
    setCurrentIndex(0);
    setAnswers({});
    setFlags({});
    setFilterView('all');
    setShowSubmitConfirm(false);
    setIsSubmitted(false);
    setIsConfiguring(false);
    setIsExamActive(true);
  }, [
    words,
    targetCount,
    targetMinutes,
    shuffleChoices,
    selectedTopics,
    availableTopics.length,
    setIsExamActive,
  ]);

  // Hotkey Enter on Configuration Screen
  useEffect(() => {
    if (!isConfiguring) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleStartExam();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConfiguring, handleStartExam]);

  // Prevent accidental navigation or page refresh during active exam
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmitted && !isConfiguring) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitted, isConfiguring]);

  const executeSubmitRef = useRef<() => void>(() => {});

  // Countdown Timer (when timed)
  useEffect(() => {
    if (isSubmitted || isConfiguring || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => executeSubmitRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // Re-arm interval only when session transitions or timer mode resets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubmitted, isConfiguring, targetMinutes]);

  // Elapsed Timer (when untimed)
  useEffect(() => {
    if (isSubmitted || isConfiguring || timeLeft !== -1) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, isConfiguring, timeLeft]);

  const handleSelectExamOption = useCallback(
    (qIndex: number, opt: string) => {
      const targetQ = questions[qIndex];
      if (!targetQ) return;

      setAnswers((prev) => {
        if (!targetQ.isMultiSelect) {
          return { ...prev, [qIndex]: [opt] };
        }
        const existing = prev[qIndex] || [];
        const updated = existing.includes(opt)
          ? existing.filter((item) => item !== opt)
          : [...existing, opt];
        if (updated.length === 0) {
          const copy = { ...prev };
          delete copy[qIndex];
          return copy;
        }
        return { ...prev, [qIndex]: updated };
      });
    },
    [questions]
  );

  // Keyboard navigation & Shortcuts (A-F, 1-6, Left/Right, F for flag)
  useEffect(() => {
    if (isSubmitted || isConfiguring || !questions.length || showSubmitConfirm) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toUpperCase();
      const currentQ = questions[currentIndex];
      if (!currentQ) return;

      let chosenIdx = -1;
      if (key === 'A' || key === '1') chosenIdx = 0;
      else if (key === 'B' || key === '2') chosenIdx = 1;
      else if (key === 'C' || key === '3') chosenIdx = 2;
      else if (key === 'D' || key === '4') chosenIdx = 3;
      else if (key === 'E' || key === '5') chosenIdx = 4;
      else if (key === 'F' && currentQ.options.length > 5 && !e.shiftKey) chosenIdx = 5;
      else if (key === '6') chosenIdx = 5;

      if (chosenIdx >= 0 && chosenIdx < currentQ.options.length) {
        e.preventDefault();
        handleSelectExamOption(currentIndex, currentQ.options[chosenIdx]);
      } else if (key === 'F') {
        e.preventDefault();
        toggleFlag(currentIndex);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        setCurrentIndex((i) => i - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
        e.preventDefault();
        setCurrentIndex((i) => i + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isSubmitted, isConfiguring, questions, showSubmitConfirm, handleSelectExamOption]);

  const toggleFlag = (idx: number) => {
    setFlags((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const isAnswerCorrect = (userAns: string[] | undefined, q: ExamQuestion) => {
    return isQuestionAnsweredCorrectly(userAns, q.correctWord, q.answerKey, q.correctOptions);
  };

  // Compute Topic Performance Breakdown (Tính năng 2: Thống kê Lỗ hổng theo Chuyên đề)
  const topicStats = useMemo(() => {
    if (!isSubmitted || questions.length === 0) return [];

    const map = new Map<string, { total: number; correct: number; wrong: number }>();

    questions.forEach((q, idx) => {
      const topicName = (q.topic || 'Chuyên đề chung').trim();
      if (!map.has(topicName)) {
        map.set(topicName, { total: 0, correct: 0, wrong: 0 });
      }
      const item = map.get(topicName)!;
      item.total += 1;
      const isCorrect = isQuestionAnsweredCorrectly(
        answers[idx],
        q.correctWord,
        q.answerKey,
        q.correctOptions
      );
      if (isCorrect) {
        item.correct += 1;
      } else {
        item.wrong += 1;
      }
    });

    return Array.from(map.entries())
      .map(([topic, data]) => {
        const percent = Math.round((data.correct / data.total) * 100);
        let status: 'mastered' | 'review' | 'critical' = 'mastered';
        if (percent < 50) status = 'critical';
        else if (percent < 80) status = 'review';

        return {
          topic,
          total: data.total,
          correct: data.correct,
          wrong: data.wrong,
          percent,
          status,
        };
      })
      .sort((a, b) => a.percent - b.percent); // Show weakest topic first
  }, [isSubmitted, questions, answers]);

  const weakestTopic = useMemo(() => {
    return topicStats.find((t) => t.percent < 80) || null;
  }, [topicStats]);

  const handleDrillWeakTopic = (topicName: string) => {
    setSelectedTopics([topicName]);
    const eligibleWords = words.filter(
      (w) => (w.topic || 'Chuyên đề chung').trim() === topicName
    );
    const count = Math.min(eligibleWords.length, 25);
    const list = buildStandardQuestions(eligibleWords, count, {
      mode: 'random',
      shuffleChoices,
    });
    setQuestions(list);
    setTimeLeft(targetMinutes === -1 ? -1 : targetMinutes * 60);
    setElapsedSeconds(0);
    setCurrentIndex(0);
    setAnswers({});
    setFlags({});
    setFilterView('all');
    setResultFilterTopic(null);
    setResultFilterMode('all');
    setShowSubmitConfirm(false);
    setIsSubmitted(false);
    setIsConfiguring(false);
  };

  const filteredReviewQuestions = useMemo(() => {
    return questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => {
        const isCorrect = isQuestionAnsweredCorrectly(
          answers[idx],
          q.correctWord,
          q.answerKey,
          q.correctOptions
        );
        const wasFlagged = Boolean(flags[idx]);

        if (resultFilterMode === 'wrong' && isCorrect) return false;
        if (resultFilterMode === 'flagged' && !wasFlagged) return false;
        if (resultFilterTopic && (q.topic || 'Chuyên đề chung').trim() !== resultFilterTopic) {
          return false;
        }
        return true;
      });
  }, [questions, answers, flags, resultFilterMode, resultFilterTopic]);

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter((a) => Array.isArray(a) && a.length > 0).length;
  }, [answers]);

  const unansweredCount = useMemo(() => {
    return questions.length - answeredCount;
  }, [questions.length, answeredCount]);

  const flaggedCount = useMemo(() => {
    return Object.values(flags).filter(Boolean).length;
  }, [flags]);

  const handleRequestSubmit = () => {
    if (unansweredCount > 0 || flaggedCount > 0) {
      setShowSubmitConfirm(true);
    } else {
      executeSubmit();
    }
  };

  // Ensure exam active state resets on component unmount
  useEffect(() => {
    return () => {
      setIsExamActive(false);
    };
  }, [setIsExamActive]);

  const executeSubmit = () => {
    setShowSubmitConfirm(false);
    if (isSubmitted) return;
    setIsSubmitted(true);
    setIsExamActive(false);

    let correctCount = 0;
    const wrongKeys: string[] = [];

    questions.forEach((q, idx) => {
      const ans = answers[idx];
      const isCorrect = isAnswerCorrect(ans, q);
      const uniqueKey = q.id || getQuestionKey({ question: q.sentence, word: q.correctWord });

      if (isCorrect) {
        correctCount++;
      } else {
        wrongKeys.push(uniqueKey);
        // Isolate SRS: Only record as mistake for MistakesMode review,
        // NEVER artificially boost SM-2 Quality or Interval on lucky exam guesses!
        StorageEngine.recordMistakeOnly(uniqueKey);
      }
    });

    const percent = Math.round((correctCount / questions.length) * 100);
    StorageEngine.recordActivity('exam', percent);
    StorageEngine.recordExamResult({
      date: Date.now(),
      score: correctCount,
      total: questions.length,
      percent,
      wrongCount: wrongKeys.length,
      quizTitle: words[0]?.subject || 'Đề thi trắc nghiệm',
    });

    if (percent >= 70) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };
  executeSubmitRef.current = executeSubmit;

  const formatTime = (secs: number) => {
    if (secs === -1) return 'Không giới hạn';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // =========================================================================
  // VIEW 1: CUSTOM EXAM CONFIGURATION DASHBOARD (Tính năng 1: Thiết lập phòng thi)
  // =========================================================================
  if (isConfiguring) {
    const estimatedSecsPerQ =
      targetMinutes === -1
        ? 'Tự do'
        : `~${Math.round(
            (targetMinutes * 60) / Math.min(targetCount, filteredAvailableCount || 1)
          )}s`;

    return (
      <ExamConfigView
        words={words}
        filteredAvailableCount={filteredAvailableCount}
        targetCount={targetCount}
        setTargetCount={setTargetCount}
        targetMinutes={targetMinutes}
        setTargetMinutes={setTargetMinutes}
        shuffleChoices={shuffleChoices}
        setShuffleChoices={setShuffleChoices}
        availableTopics={availableTopics}
        selectedTopics={selectedTopics}
        toggleAllTopics={toggleAllTopics}
        handleToggleTopic={handleToggleTopic}
        estimatedSecsPerQ={estimatedSecsPerQ}
        onExit={onExit}
        onStartExam={handleStartExam}
      />
    );
  }

  if (!questions.length) {
    return <div className="text-center py-20 text-slate-500">Đang chuẩn bị đề thi...</div>;
  }

  // =========================================================================
  // VIEW 2: RESULT SCORE SHEET (Màn hình Kết quả sau khi nộp bài)
  // =========================================================================
  if (isSubmitted) {
    return (
      <ExamResultView
        questions={questions}
        answers={answers}
        flags={flags}
        topicStats={topicStats}
        weakestTopic={weakestTopic}
        resultFilterMode={resultFilterMode}
        setResultFilterMode={setResultFilterMode}
        resultFilterTopic={resultFilterTopic}
        setResultFilterTopic={setResultFilterTopic}
        filteredReviewQuestions={filteredReviewQuestions}
        onRetake={handleStartExam}
        onReconfigure={() => setIsConfiguring(true)}
        onExit={onExit}
        onDrillWeakTopic={handleDrillWeakTopic}
        isAnswerCorrect={isAnswerCorrect}
        flaggedCount={flaggedCount}
        shuffleChoices={shuffleChoices}
      />
    );
  }

  // =========================================================================
  // VIEW 3: ACTIVE EXAM TAKING VIEW (Phòng thi đang làm bài)
  // =========================================================================
  const currentQ = questions[currentIndex];

  return (
    <div className="w-full max-w-4xl xl:max-w-5xl mx-auto py-6 px-4 sm:px-6">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Chế độ Thi Thử (Timed Exam)
          </span>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Câu hỏi {currentIndex + 1} / {questions.length}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold ${
              timeLeft !== -1 && timeLeft < 120
                ? 'bg-rose-500/20 text-rose-500 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {timeLeft === -1 ? `∞ ${formatTime(elapsedSeconds)}` : formatTime(timeLeft)}
            </span>
          </div>

          <button
            onClick={handleRequestSubmit}
            className="py-1.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-glow-danger"
          >
            Nộp bài
          </button>
        </div>
      </div>

      {/* Mobile Question Navigator Toggle */}
      <div className="flex sm:hidden items-center justify-between p-2.5 rounded-2xl story-glass mb-3 select-none">
        <button
          type="button"
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 active:scale-95 touch-manipulation"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          <span>Bảng câu ({answeredCount}/{questions.length})</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-bold">
            {isNavOpen ? '▲ Thu gọn' : '▼ Mở rộng'}
          </span>
        </button>
        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
          Câu {currentIndex + 1}/{questions.length}
        </span>
      </div>

      {/* Filter Toolbar & Statistics (Collapsible on mobile when closed) */}
      <div className={`${isNavOpen ? 'flex' : 'hidden sm:flex'} flex-wrap items-center justify-between gap-2 mb-3 animate-fade-in`}>
        <div className="flex items-center gap-1 p-1 rounded-xl story-glass text-xs">
          <button
            onClick={() => setFilterView('all')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold transition-all ${
              filterView === 'all'
                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tất cả ({questions.length})
          </button>
          <button
            onClick={() => setFilterView('unanswered')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold transition-all ${
              filterView === 'unanswered'
                ? 'bg-amber-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Chưa làm ({unansweredCount})
          </button>
          <button
            onClick={() => setFilterView('flagged')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
              filterView === 'flagged'
                ? 'bg-rose-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flag className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline">Đã gắn cờ</span> ({flaggedCount})
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Đã hoàn thành:{' '}
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{answeredCount}</span>
          /{questions.length} câu
        </div>
      </div>

      {/* Question Navigator Grid (Collapsible on mobile) */}
      <div className={`${isNavOpen ? 'flex' : 'hidden sm:flex'} flex-wrap gap-1.5 mb-5 p-3 rounded-2xl story-glass max-h-36 overflow-y-auto animate-fade-in`}>
        {questions.map((_, idx) => {
          const isAnswered = Boolean(answers[idx]?.length);
          const isFlagged = Boolean(flags[idx]);
          const isCurrent = idx === currentIndex;

          if (filterView === 'unanswered' && isAnswered) return null;
          if (filterView === 'flagged' && !isFlagged) return null;

          return (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                if (window.innerWidth < 640) setIsNavOpen(false);
              }}
              className={`relative w-9 h-9 sm:w-9 sm:h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center active:scale-95 touch-manipulation select-none ${
                isCurrent
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 shadow-md scale-105 z-10'
                  : isFlagged
                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/60 hover:bg-amber-500/30'
                  : isAnswered
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title={`Câu ${idx + 1}${isFlagged ? ' (Đã gắn cờ)' : ''}${
                isAnswered ? ' (Đã chọn)' : ' (Chưa làm)'
              }`}
            >
              {idx + 1}
              {isFlagged && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-[#131D31]" />
              )}
            </button>
          );
        })}

        {filterView === 'flagged' && flaggedCount === 0 && (
          <div className="w-full text-center py-2 text-xs text-slate-400 italic">
            Chưa có câu hỏi nào được gắn cờ. Bấm nút &quot;Gắn cờ&quot; để đánh dấu xem lại.
          </div>
        )}
        {filterView === 'unanswered' && unansweredCount === 0 && (
          <div className="w-full text-center py-2 text-xs text-emerald-500 font-semibold">
            ✓ Xuất sắc! Bạn đã trả lời toàn bộ các câu hỏi.
          </div>
        )}
      </div>

      {/* Horizontal Strip on Mobile when closed */}
      {!isNavOpen && (
        <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 px-1">
          {questions.map((_, idx) => {
            const isAnswered = Boolean(answers[idx]?.length);
            const isFlagged = Boolean(flags[idx]);
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-8 h-8 rounded-lg text-xs font-bold shrink-0 transition-all flex items-center justify-center active:scale-95 touch-manipulation select-none relative ${
                  isCurrent
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                    : isFlagged
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/60'
                    : isAnswered
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {idx + 1}
                {isFlagged && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-1 ring-white dark:ring-[#131D31]" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Question & Choices Animated Container */}
      <div key={currentIndex} className="animate-question-enter transform-gpu">
        {/* Question Card */}
        <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl story-glass shadow-xl mb-5 sm:mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 uppercase tracking-wider flex-wrap">
              <HelpCircle className="w-4 h-4" />
              <span>Câu hỏi {currentIndex + 1}</span>
              {currentQ.topic && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                  {currentQ.topic}
                </span>
              )}
              {currentQ.isMultiSelect && (
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 normal-case">
                  Chọn {currentQ.requiredCount} đáp án ({(answers[currentIndex] || []).length}/{currentQ.requiredCount})
                </span>
              )}
              {shuffleChoices && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1 normal-case">
                  <Shuffle className="w-3 h-3" /> Đã đảo thứ tự A–D
                </span>
              )}
              {Boolean(flags[currentIndex]) && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[11px] font-bold border border-amber-500/30 flex items-center gap-1">
                  <Flag className="w-3 h-3 fill-current" /> Đang gắn cờ
                </span>
              )}
            </div>

            <button
              onClick={() => toggleFlag(currentIndex)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-[transform,background-color,border-color] duration-150 flex items-center gap-1.5 border active:scale-95 touch-manipulation ${
                flags[currentIndex]
                  ? 'bg-amber-500/20 text-amber-500 border-amber-500/50 hover:bg-amber-500/30 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-amber-500 hover:border-amber-500/40'
              }`}
              title="Phím tắt: F"
            >
              <Flag className={`w-3.5 h-3.5 ${flags[currentIndex] ? 'fill-current' : ''}`} />
              <span className="sm:hidden">{flags[currentIndex] ? 'Bỏ cờ' : 'Gắn cờ'}</span>
              <span className="hidden sm:inline">{flags[currentIndex] ? 'Bỏ cờ [F]' : 'Gắn cờ xem lại [F]'}</span>
            </button>
          </div>

          <CodeQuestionRenderer
            content={currentQ.sentence}
            className="text-base sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed"
          />
        </div>

        {/* Choices */}
        <div className="space-y-2.5 sm:space-y-3 mb-6">
          {currentQ.options.map((opt, idx) => {
            const isChosen = (answers[currentIndex] || []).includes(opt);
            return (
              <button
                key={idx}
                onClick={() => handleSelectExamOption(currentIndex, opt)}
                className={`w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl font-semibold border text-left transition-[transform,background-color,border-color,box-shadow] duration-150 flex items-center justify-between active:scale-[0.99] touch-manipulation select-none transform-gpu ${
                  isChosen
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-glow font-bold animate-pop-correct'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span
                    className={`w-7 h-7 ${
                      currentQ.isMultiSelect ? 'rounded-lg' : 'rounded-xl'
                    } text-xs flex items-center justify-center font-mono font-bold shrink-0 ${
                      isChosen
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm sm:text-base leading-relaxed">{cleanOptionText(opt)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {currentQ.isMultiSelect && (
                    <span
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isChosen
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isChosen && <Check className="w-3.5 h-3.5" />}
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 hidden sm:inline-block">
                    [{String.fromCharCode(65 + idx)}]
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Thumb-Friendly Navigation Controls on Mobile */}
      <div className="sticky bottom-0 -mx-4 sm:mx-0 p-3 sm:p-0 bg-white/95 dark:bg-[#090E17]/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-slate-200/80 dark:border-slate-800/80 sm:border-0 flex items-center justify-between gap-2.5 shadow-glass sm:shadow-none z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-0">
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="flex-1 sm:flex-none py-3 px-4 sm:px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-30 flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs sm:text-sm active:scale-95 touch-manipulation select-none"
        >
          <ArrowLeft className="w-4 h-4" /> <span>Câu trước</span>
        </button>

        {currentIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="flex-1 sm:flex-none py-3 px-5 sm:px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-glow transition-all text-xs sm:text-sm active:scale-95 touch-manipulation select-none"
          >
            <span>Câu tiếp theo</span> <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleRequestSubmit}
            className="flex-1 sm:flex-none py-3 px-5 sm:px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-glow-success transition-all text-xs sm:text-sm active:scale-95 touch-manipulation select-none"
          >
            <span>Nộp bài thi</span> <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Pre-submission Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full p-6 rounded-3xl story-glass-strong shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Xác nhận nộp bài thi?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hệ thống phát hiện bài làm của bạn vẫn còn câu hỏi chưa tối ưu:
              </p>
            </div>

            <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Câu chưa làm:</span>
                <span
                  className={`font-bold ${
                    unansweredCount > 0 ? 'text-rose-500 font-mono text-sm' : 'text-emerald-500'
                  }`}
                >
                  {unansweredCount} câu
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Câu đang gắn cờ xem lại:</span>
                <span
                  className={`font-bold ${
                    flaggedCount > 0 ? 'text-amber-500 font-mono text-sm' : 'text-slate-400'
                  }`}
                >
                  {flaggedCount} câu
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">Thời gian:</span>
                <span className="font-mono font-bold text-indigo-500">
                  {timeLeft === -1 ? `∞ ${formatTime(elapsedSeconds)}` : formatTime(timeLeft)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs"
              >
                Tiếp tục làm bài
              </button>
              <button
                onClick={executeSubmit}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-glow-danger text-xs"
              >
                Vẫn nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
