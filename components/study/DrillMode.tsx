'use client';

import { useState, useEffect } from 'react';
import { Word, DrillQuestion } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import { getQuestionKey, cleanOptionText, isAnswerMatch } from '@/lib/utils';
import { soundFx } from '@/lib/sound';
import { buildStandardQuestions } from '@/lib/quizHelpers';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import { Volume2, ArrowRight, CheckCircle2, XCircle, Zap, RotateCcw, Trophy, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DrillModeProps {
  words: Word[];
  onExit: () => void;
}

export default function DrillMode({ words, onExit }: DrillModeProps) {
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Generate drill questions using standardized builder (Zero legacy text fallback, robust MCQ)
  useEffect(() => {
    if (!words || words.length === 0) return;
    const std = buildStandardQuestions(words, 20);
    const list: DrillQuestion[] = std.map((q, idx) => ({
      sentence: q.sentence,
      correctWord: q.correctWord,
      options: q.options,
      explanation: q.explanation,
      questionNumber: q.id || idx + 1,
    }));
    setQuestions(list);
  }, [words]);

  const currentQ = questions[currentIndex];

  useEffect(() => {
    setSelectedWord(null);
  }, [currentIndex]);

  // Hotkey listener for 1, 2, 3, 4 & Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCompleted || !currentQ) return;

      if (!selectedWord) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          if (currentQ.options[idx]) {
            handleSelect(currentQ.options[idx]);
          }
        }
      } else {
        if (e.key === 'Enter') {
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQ, selectedWord, isCompleted]);

  if (!currentQ) {
    return (
      <div className="text-center py-20 text-slate-500">
        Đang chuẩn bị câu hỏi luyện tập (Drill)...
      </div>
    );
  }

  const isOptionCorrect = (opt: string) => {
    return isAnswerMatch(opt, currentQ.correctWord);
  };

  const handleSelect = (choice: string) => {
    if (selectedWord) return;
    setSelectedWord(choice);

    const isCorrect = isOptionCorrect(choice);
    const uniqueKey = currentQ.questionNumber
      ? `drill_q_${currentQ.questionNumber}`
      : getQuestionKey({ question: currentQ.sentence, word: currentQ.correctWord });

    if (isCorrect) {
      soundFx.playCorrect();
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
      StorageEngine.updateWordProgress(uniqueKey, 5);
    } else {
      soundFx.playWrong();
      setStreak(0);
      StorageEngine.updateWordProgress(uniqueKey, 2);
    }
  };

  const handleNext = () => {
    if (isCompleted) return;

    if (currentIndex < questions.length - 1) {
      soundFx.playClick();
      setCurrentIndex((i) => i + 1);
    } else {
      setIsCompleted(true);
      soundFx.playCelebration();
      StorageEngine.recordActivity('drill', Math.round((score / questions.length) * 100));
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  };

  if (isCompleted) {
    const accuracy = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-md mx-auto text-center py-12 px-6 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 text-indigo-500 mx-auto flex items-center justify-center mb-6 shadow-glow">
          <Trophy className="w-10 h-10 animate-bounce" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
          Hoàn Thành Bài Luyện Tập!
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
          Độ chính xác của bạn trong phiên luyện tập này:
        </p>

        <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-800/80 mb-8 flex justify-around items-center">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">Điểm số</p>
            <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {score}/{questions.length}
            </p>
          </div>
          <div className="h-10 w-[1px] bg-slate-300 dark:bg-slate-700" />
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase">Tỉ lệ đúng</p>
            <p className="text-3xl font-black text-emerald-500">{accuracy}%</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              setIsCompleted(false);
              setCurrentIndex(0);
              setScore(0);
              setStreak(0);
            }}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-glow"
          >
            Luyện tập lại
          </button>
          <button
            onClick={onExit}
            className="w-full py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            Về Trang chủ
          </button>
        </div>
      </div>
    );
  }

  const isAnswered = Boolean(selectedWord);

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Luyện Ngữ Cảnh & Trắc Nghiệm (Drill)
          </span>
          {streak >= 3 && (
            <span className="flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
              <Zap className="w-3.5 h-3.5 fill-amber-500" /> {streak} Chuỗi đúng!
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {currentIndex + 1} / {questions.length}
          </span>
          <button
            onClick={onExit}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Thoát
          </button>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 shadow-xl mb-6">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-indigo-500 uppercase tracking-wider">
          <HelpCircle className="w-4 h-4" />
          <span>Câu hỏi {currentIndex + 1}</span>
        </div>
        <CodeQuestionRenderer
          content={currentQ.sentence}
          className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed"
        />
      </div>

      {/* 4 Choices */}
      <div className="space-y-3 mb-6">
        {currentQ.options.map((opt, idx) => {
          const isSelected = selectedWord === opt;
          const isTarget = isOptionCorrect(opt);
          let style =
            'w-full p-4 rounded-2xl font-semibold border text-left transition-all flex items-center justify-between ';

          if (!selectedWord) {
            style +=
              'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-900 dark:text-white hover:scale-[1.005]';
          } else if (isTarget) {
            style +=
              'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-glow-success font-bold';
          } else if (isSelected && !isTarget) {
            style +=
              'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 font-bold';
          } else {
            style +=
              'opacity-40 bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500';
          }

          return (
            <button
              key={idx}
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

      {/* Explanation Banner */}
      {isAnswered && (
        <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 mb-6 animate-slide-up">
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
            Giải thích chi tiết & Đáp án
          </p>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
            {currentQ.explanation}
          </p>
        </div>
      )}

      {/* Continue Button */}
      {isAnswered && (
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow-glow-success transition-all active:scale-[0.99]"
        >
          <span>Câu tiếp theo [Enter]</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
