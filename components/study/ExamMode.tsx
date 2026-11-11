'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Word, ExamQuestion } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import { getQuestionKey, cleanOptionText, isAnswerMatch } from '@/lib/utils';
import { soundFx } from '@/lib/sound';
import { buildStandardQuestions } from '@/lib/quizHelpers';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Trophy,
  RotateCcw,
  HelpCircle,
  Flag,
  AlertTriangle,
  Play,
  Settings2,
  Layers,
  BookOpen,
  Check,
  Zap,
  BarChart3,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExamModeProps {
  words: Word[];
  onExit: () => void;
}

export default function ExamMode({ words, onExit }: ExamModeProps) {
  // Configuration State
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [targetCount, setTargetCount] = useState(25);
  const [targetMinutes, setTargetMinutes] = useState(10); // -1 = untimed
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  // Taking Exam State
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flags, setFlags] = useState<Record<number, boolean>>({});
  const [filterView, setFilterView] = useState<'all' | 'unanswered' | 'flagged'>('all');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // in seconds, or -1 for untimed
  const [elapsedSeconds, setElapsedSeconds] = useState(0); // counts up when untimed
  const [isSubmitted, setIsSubmitted] = useState(false);

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
  }, [availableTopics]);

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
    const list = buildStandardQuestions(eligibleWords, count);
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

    soundFx.playZenChime();
  }, [words, targetCount, targetMinutes, selectedTopics, availableTopics.length]);

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

  // Countdown Timer (when timed)
  useEffect(() => {
    if (isSubmitted || isConfiguring || timeLeft <= 0 || timeLeft === -1) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          executeSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted, isConfiguring]);

  // Elapsed Timer (when untimed)
  useEffect(() => {
    if (isSubmitted || isConfiguring || timeLeft !== -1) return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, isConfiguring, timeLeft]);

  // Keyboard navigation & Shortcuts (A-D, 1-4, Left/Right, F for flag)
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

      if (chosenIdx >= 0 && chosenIdx < currentQ.options.length) {
        e.preventDefault();
        soundFx.playClick();
        setAnswers((prev) => ({ ...prev, [currentIndex]: currentQ.options[chosenIdx] }));
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
  }, [currentIndex, isSubmitted, isConfiguring, questions, showSubmitConfirm]);

  const toggleFlag = (idx: number) => {
    soundFx.playClick();
    setFlags((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const isAnswerCorrect = (userAns: string | undefined, q: ExamQuestion) => {
    return isAnswerMatch(userAns, q.correctWord, q.answerKey);
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
      const isCorrect = isAnswerMatch(answers[idx], q.correctWord, q.answerKey);
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
    const list = buildStandardQuestions(eligibleWords, count);
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
    soundFx.playZenChime();
  };

  const filteredReviewQuestions = useMemo(() => {
    return questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => {
        const isCorrect = isAnswerMatch(answers[idx], q.correctWord, q.answerKey);
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
    return Object.keys(answers).length;
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

  const executeSubmit = () => {
    setShowSubmitConfirm(false);
    if (isSubmitted) return;
    setIsSubmitted(true);

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
      soundFx.playCelebration();
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
      });
    } else {
      soundFx.playCorrect();
    }
  };

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
      <div className="w-full max-w-4xl mx-auto py-6 px-4 sm:px-6 animate-fade-in">
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold shadow-sm">
              <Settings2 className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">
                  Chế độ Thi Thử
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {words[0]?.subject || 'Ngân hàng đề thi'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                Thiết Lập Phòng Thi Linh Hoạt
              </h1>
            </div>
          </div>

          {/* Section 1: Question Count Selector */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" /> Số lượng câu hỏi
              </span>
              <span className="text-indigo-500 font-bold font-mono text-sm">
                {Math.min(targetCount, filteredAvailableCount)} / {filteredAvailableCount} câu khả dụng
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[25, 50, 60].map((num) => {
                const disabled = num > filteredAvailableCount;
                const isSelected = targetCount === num;
                return (
                  <button
                    key={num}
                    type="button"
                    disabled={disabled}
                    onClick={() => setTargetCount(num)}
                    className={`p-3.5 rounded-2xl border font-bold text-xs transition-all text-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-glow'
                        : disabled
                        ? 'opacity-30 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                    }`}
                  >
                    <span className="text-xl font-black block">{num}</span>
                    <span className="text-[11px] font-normal opacity-80">
                      {num === 25 ? 'Thi nhanh' : num === 50 ? 'Chuẩn kỳ thi' : 'Đề chính quy'}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setTargetCount(filteredAvailableCount)}
                className={`p-3.5 rounded-2xl border font-bold text-xs transition-all text-center ${
                  targetCount === filteredAvailableCount
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-glow'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                <span className="text-xl font-black block">Tất cả</span>
                <span className="text-[11px] font-normal opacity-80">
                  {filteredAvailableCount} câu (Speed Run)
                </span>
              </button>
            </div>
          </div>

          {/* Section 2: Duration Selector */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-500" /> Thời gian làm bài
              </span>
              <span className="text-rose-500 font-bold font-mono text-sm">
                {targetMinutes === -1 ? 'Không giới hạn' : `${targetMinutes} phút`}
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[10, 30, 45, 60].map((mins) => {
                const isSelected = targetMinutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTargetMinutes(mins)}
                    className={`p-3.5 rounded-2xl border font-bold text-xs transition-all text-center ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-500 shadow-glow-danger'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-rose-400'
                    }`}
                  >
                    <span className="text-xl font-black block">{mins}&apos;</span>
                    <span className="text-[11px] font-normal opacity-80">
                      {mins === 10 ? 'Tốc độ cao' : mins === 45 ? 'Chuẩn 50 câu' : 'Vừa phải'}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setTargetMinutes(-1)}
                className={`col-span-2 sm:col-span-4 p-3 rounded-2xl border font-bold text-xs transition-all text-center flex items-center justify-center gap-2 ${
                  targetMinutes === -1
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-glow-success'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                }`}
              >
                <span>∞ Không giới hạn thời gian (Tự luyện thong thả)</span>
              </button>
            </div>
          </div>

          {/* Section 3: Topic Scope Filter */}
          {availableTopics.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" /> Phạm vi Chuyên đề (
                  {selectedTopics.length}/{availableTopics.length})
                </label>
                <button
                  type="button"
                  onClick={toggleAllTopics}
                  className="text-xs text-indigo-500 hover:text-indigo-400 font-semibold"
                >
                  {selectedTopics.length === availableTopics.length
                    ? 'Bỏ chọn tất cả'
                    : 'Chọn tất cả'}
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {availableTopics.map((top) => {
                  const isChecked = selectedTopics.includes(top.name);
                  return (
                    <button
                      key={top.name}
                      type="button"
                      onClick={() => handleToggleTopic(top.name)}
                      className={`w-full p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                            isChecked
                              ? 'bg-amber-500 border-amber-500 text-white'
                              : 'border-slate-400 dark:border-slate-600'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="truncate max-w-[240px] sm:max-w-md">{top.name}</span>
                      </div>
                      <span className="text-[11px] font-mono opacity-70 shrink-0">
                        {top.count} câu
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-around text-center text-xs">
            <div>
              <p className="text-slate-400 font-bold uppercase text-[10px]">Đề thi</p>
              <p className="font-mono font-black text-base text-indigo-600 dark:text-indigo-400">
                {Math.min(targetCount, filteredAvailableCount)} câu
              </p>
            </div>
            <div className="w-[1px] h-8 bg-indigo-200 dark:bg-indigo-800" />
            <div>
              <p className="text-slate-400 font-bold uppercase text-[10px]">Thời gian</p>
              <p className="font-mono font-black text-base text-rose-500">
                {targetMinutes === -1 ? '∞' : `${targetMinutes}p`}
              </p>
            </div>
            <div className="w-[1px] h-8 bg-indigo-200 dark:bg-indigo-800" />
            <div>
              <p className="text-slate-400 font-bold uppercase text-[10px]">Ước tính mỗi câu</p>
              <p className="font-mono font-black text-base text-emerald-500">{estimatedSecsPerQ}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onExit}
              className="py-3.5 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
            >
              Quay lại
            </button>
            <button
              type="button"
              disabled={filteredAvailableCount === 0}
              onClick={handleStartExam}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-black flex items-center justify-center gap-2 shadow-glow text-sm transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>BẮT ĐẦU LÀM BÀI [Enter]</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return <div className="text-center py-20 text-slate-500">Đang chuẩn bị đề thi...</div>;
  }

  // =========================================================================
  // VIEW 2: RESULT SCORE SHEET (Màn hình Kết quả sau khi nộp bài)
  // =========================================================================
  if (isSubmitted) {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (isAnswerCorrect(answers[idx], q)) correctCount++;
    });
    const percent = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="w-full max-w-5xl xl:max-w-6xl mx-auto py-8 px-4 sm:px-6 animate-fade-in">
        {/* Score Card */}
        <div className="text-center p-8 rounded-3xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 shadow-2xl mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 mx-auto flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            Kết Quả Bài Thi Thử
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Đánh giá kiến thức & mức độ nắm vững các chủ đề trọng tâm
          </p>

          <div className="flex justify-center items-center gap-8 mb-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Điểm số</p>
              <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                {correctCount} / {questions.length}
              </p>
            </div>
            <div className="w-[1px] h-12 bg-slate-200 dark:bg-slate-700" />
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Tỉ lệ đạt</p>
              <p
                className={`text-4xl font-black ${
                  percent >= 80
                    ? 'text-emerald-500'
                    : percent >= 50
                    ? 'text-amber-500'
                    : 'text-rose-500'
                }`}
              >
                {percent}%
              </p>
            </div>
          </div>

          <div className="flex justify-center flex-wrap gap-3">
            <button
              onClick={handleStartExam}
              className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-glow flex items-center gap-2 text-sm"
            >
              <RotateCcw className="w-4 h-4" /> Làm lại đề này
            </button>
            <button
              onClick={() => setIsConfiguring(true)}
              className="py-3 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-2 text-sm"
            >
              <Settings2 className="w-4 h-4 text-indigo-500" /> Cấu hình đề mới
            </button>
            <button
              onClick={onExit}
              className="py-3 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
            >
              Về Danh sách Đề
            </button>
          </div>
        </div>

        {/* TOPIC WEAKNESS BREAKDOWN (Tính năng 2: Thống kê Lỗ hổng Chuyên đề) */}
        {topicStats.length > 0 && (
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 shadow-xl mb-8 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                  <BarChart3 className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Phân Tích Lỗ Hổng Theo Chuyên Đề
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Định vị phần kiến thức đã vững vàng và phần còn bị &quot;liệt&quot; để ôn tập có trọng tâm
                  </p>
                </div>
              </div>

              {weakestTopic && weakestTopic.percent < 80 && (
                <button
                  type="button"
                  onClick={() => handleDrillWeakTopic(weakestTopic.topic)}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-glow-danger transition-all"
                  title="Tự động bốc đề thi riêng cho chuyên đề yếu nhất này"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Cày ngay chuyên đề yếu nhất: {weakestTopic.topic}</span>
                </button>
              )}
            </div>

            {/* Critical Alert if any topic < 50% */}
            {weakestTopic && weakestTopic.percent < 50 && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-800 dark:text-rose-200">
                    Cảnh báo lỗ hổng nghiêm trọng ở chuyên đề &quot;{weakestTopic.topic}&quot; ({weakestTopic.percent}%)
                  </p>
                  <p className="text-rose-600 dark:text-rose-300/80 leading-relaxed">
                    Bạn làm sai {weakestTopic.wrong}/{weakestTopic.total} câu ở phần này. Nhấn nút màu đỏ ở trên để cày riêng 25 câu của chuyên đề này nhằm lấp lỗ hổng ngay trước ngày thi!
                  </p>
                </div>
              </div>
            )}

            {/* Topic List with Progress Bars */}
            <div className="space-y-3.5">
              {topicStats.map((item) => {
                const isSelected = resultFilterTopic === item.topic;
                return (
                  <div
                    key={item.topic}
                    onClick={() => {
                      setResultFilterTopic((prev) => (prev === item.topic ? null : item.topic));
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-400/30'
                        : 'bg-slate-50/60 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          {item.topic}
                        </span>
                        {item.status === 'mastered' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            ✓ Vững vàng
                          </span>
                        ) : item.status === 'review' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            ⚠ Cần củng cố
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            ✖ Lỗ hổng lớn
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                          Đúng: <strong className="text-slate-900 dark:text-white font-mono">{item.correct}</strong>/{item.total} câu
                        </span>
                        <span
                          className={`font-black font-mono text-base ${
                            item.percent >= 80
                              ? 'text-emerald-500'
                              : item.percent >= 50
                              ? 'text-amber-500'
                              : 'text-rose-500'
                          }`}
                        >
                          {item.percent}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          item.percent >= 80
                            ? 'bg-emerald-500'
                            : item.percent >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                      <span>
                        {isSelected
                          ? '✓ Đang lọc câu hỏi chuyên đề này bên dưới'
                          : '👉 Bấm vào đây để lọc danh sách câu hỏi phần này'}
                      </span>
                      {item.wrong > 0 && (
                        <span className="text-rose-400 font-medium font-mono">{item.wrong} câu sai</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Question Review Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Chi tiết từng câu hỏi ({filteredReviewQuestions.length}/{questions.length} câu):
          </h3>

          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            <button
              type="button"
              onClick={() => {
                setResultFilterMode('all');
                setResultFilterTopic(null);
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                resultFilterMode === 'all' && !resultFilterTopic
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tất cả ({questions.length})
            </button>
            <button
              type="button"
              onClick={() => setResultFilterMode('wrong')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                resultFilterMode === 'wrong'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Chỉ câu sai ({questions.length - correctCount})
            </button>
            <button
              type="button"
              onClick={() => setResultFilterMode('flagged')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                resultFilterMode === 'flagged'
                  ? 'bg-amber-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Đã cắm cờ ({flaggedCount})
            </button>
            {resultFilterTopic && (
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center gap-1 font-semibold">
                Lọc: {resultFilterTopic}
                <button
                  type="button"
                  onClick={() => setResultFilterTopic(null)}
                  className="hover:text-white font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Questions List */}
        {filteredReviewQuestions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
            Không có câu hỏi nào khớp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviewQuestions.map(({ q, idx }) => {
              const userAns = answers[idx];
              const isCorrect = isAnswerCorrect(userAns, q);
              const wasFlagged = Boolean(flags[idx]);

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border transition-all ${
                    isCorrect
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                      : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Câu {idx + 1}
                      </span>
                      {q.topic && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {q.topic}
                        </span>
                      )}
                      {wasFlagged && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          <Flag className="w-3 h-3 fill-current" /> Đã gắn cờ
                        </span>
                      )}
                    </div>
                    {isCorrect ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" /> Đúng
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                        <XCircle className="w-4 h-4" /> Sai
                      </span>
                    )}
                  </div>

                  <CodeQuestionRenderer
                    content={q.sentence}
                    className="text-base font-medium text-slate-900 dark:text-slate-100 mb-3"
                  />

                  <div className="space-y-1.5 text-xs font-medium pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                    <div>
                      <span className="text-slate-400">Bạn chọn: </span>
                      <span
                        className={`font-bold ${
                          isCorrect
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {userAns || '(Bỏ trống)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Đáp án đúng: </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {q.correctWord}
                      </span>
                    </div>
                    {q.explanation && (
                      <p className="text-slate-500 dark:text-slate-400 italic mt-1">
                        💡 Giải thích: {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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

      {/* Filter Toolbar & Statistics */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setFilterView('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              filterView === 'all'
                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tất cả ({questions.length})
          </button>
          <button
            onClick={() => setFilterView('unanswered')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              filterView === 'unanswered'
                ? 'bg-amber-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Chưa làm ({unansweredCount})
          </button>
          <button
            onClick={() => setFilterView('flagged')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
              filterView === 'flagged'
                ? 'bg-rose-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flag className="w-3 h-3 fill-current" />
            Đã gắn cờ ({flaggedCount})
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Đã hoàn thành:{' '}
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{answeredCount}</span>
          /{questions.length} câu
        </div>
      </div>

      {/* Question Navigator Grid */}
      <div className="flex flex-wrap gap-1.5 mb-6 p-3 rounded-2xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 max-h-36 overflow-y-auto">
        {questions.map((_, idx) => {
          const isAnswered = Boolean(answers[idx]);
          const isFlagged = Boolean(flags[idx]);
          const isCurrent = idx === currentIndex;

          if (filterView === 'unanswered' && isAnswered) return null;
          if (filterView === 'flagged' && !isFlagged) return null;

          return (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-10 h-10 sm:w-9 sm:h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
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
            Chưa có câu hỏi nào được gắn cờ. Bấm phím{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-300">
              F
            </kbd>{' '}
            hoặc nút &quot;Gắn cờ&quot; để đánh dấu xem lại.
          </div>
        )}
        {filterView === 'unanswered' && unansweredCount === 0 && (
          <div className="w-full text-center py-2 text-xs text-emerald-500 font-semibold">
            ✓ Xuất sắc! Bạn đã trả lời toàn bộ các câu hỏi.
          </div>
        )}
      </div>

      {/* Question Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 shadow-xl mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 uppercase tracking-wider">
            <HelpCircle className="w-4 h-4" />
            <span>Câu hỏi {currentIndex + 1}</span>
            {currentQ.topic && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                {currentQ.topic}
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              flags[currentIndex]
                ? 'bg-amber-500/20 text-amber-500 border-amber-500/50 hover:bg-amber-500/30 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-amber-500 hover:border-amber-500/40'
            }`}
            title="Phím tắt: F"
          >
            <Flag className={`w-3.5 h-3.5 ${flags[currentIndex] ? 'fill-current' : ''}`} />
            <span>{flags[currentIndex] ? 'Bỏ cờ [F]' : 'Gắn cờ xem lại [F]'}</span>
          </button>
        </div>

        <CodeQuestionRenderer
          content={currentQ.sentence}
          className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed"
        />
      </div>

      {/* Choices */}
      <div className="space-y-3 mb-6">
        {currentQ.options.map((opt, idx) => {
          const isChosen = answers[currentIndex] === opt;
          return (
            <button
              key={idx}
              onClick={() => {
                soundFx.playClick();
                setAnswers((prev) => ({ ...prev, [currentIndex]: opt }));
              }}
              className={`w-full p-4 rounded-2xl font-semibold border text-left transition-all flex items-center justify-between ${
                isChosen
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-glow font-bold'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-7 h-7 rounded-xl text-xs flex items-center justify-center font-mono font-bold shrink-0 ${
                    isChosen
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-sm sm:text-base">{cleanOptionText(opt)}</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 hidden sm:inline-block">
                [{String.fromCharCode(65 + idx)}]
              </span>
            </button>
          );
        })}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-30 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Câu trước
        </button>

        {currentIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-glow transition-all"
          >
            Câu tiếp theo <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleRequestSubmit}
            className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-glow-success transition-all"
          >
            Nộp bài thi <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Pre-submission Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
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
