'use client';

import { useState, useEffect } from 'react';
import { Word, DrillQuestion } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import { SpeechService } from '@/lib/speech';
import { Volume2, ArrowRight, CheckCircle2, XCircle, Zap, RotateCcw, Trophy } from 'lucide-react';
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

  // Generate 15-20 questions from words
  useEffect(() => {
    if (!words || words.length === 0) return;

    const list: DrillQuestion[] = [];
    const pool = [...words].sort(() => 0.5 - Math.random());
    const count = Math.min(pool.length, 15);

    for (let i = 0; i < count; i++) {
      const target = pool[i];
      const rawSentence =
        target.simple_examples?.[0] ||
        target.advanced_example ||
        `The committee praised his ________ approach to the complex challenge.`;

      const regex = new RegExp(`\\b${target.word}\\w*`, 'gi');
      const clozeSentence = rawSentence.replace(regex, '________');

      // Generate 3 distractors
      const otherWords = words
        .filter((w) => w.word.toLowerCase() !== target.word.toLowerCase())
        .map((w) => w.word)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const options = [target.word, ...otherWords].sort(() => 0.5 - Math.random());

      list.push({
        sentence: clozeSentence,
        correctWord: target.word,
        options,
        explanation: `${target.word} (${target.vi || target.ru || 'chính xác'}) phù hợp nhất với ngữ cảnh câu này.`,
      });
    }

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
        Đang khởi tạo bài luyện tập (Drill)...
      </div>
    );
  }

  const handleSelect = (choice: string) => {
    if (selectedWord) return;
    setSelectedWord(choice);

    const isCorrect = choice.toLowerCase() === currentQ.correctWord.toLowerCase();
    if (isCorrect) {
      setScore((s) => s + 1);
      setStreak((s) => s + 1);
      StorageEngine.updateWordProgress(currentQ.correctWord, 5);
    } else {
      setStreak(0);
      StorageEngine.updateWordProgress(currentQ.correctWord, 2);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setIsCompleted(true);
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
  const isCorrectAnswer =
    selectedWord?.toLowerCase() === currentQ.correctWord.toLowerCase();

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Luyện ngữ cảnh (Drill)
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
      <div className="p-8 rounded-3xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 shadow-xl mb-6">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Điền từ chính xác vào chỗ trống
        </p>
        <p className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white leading-relaxed">
          &quot;{currentQ.sentence}&quot;
        </p>
      </div>

      {/* 4 Choices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {currentQ.options.map((opt, idx) => {
          const isSelected = selectedWord === opt;
          const isTarget = opt.toLowerCase() === currentQ.correctWord.toLowerCase();
          let style =
            'p-4 rounded-2xl font-bold border text-left transition-all flex items-center justify-between ';

          if (!selectedWord) {
            style +=
              'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-900 dark:text-white hover:scale-[1.01]';
          } else if (isTarget) {
            style +=
              'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-glow-success';
          } else if (isSelected && !isTarget) {
            style +=
              'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300';
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
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-xs flex items-center justify-center font-mono text-slate-500 dark:text-slate-400">
                  {idx + 1}
                </span>
                <span className="text-base">{opt}</span>
              </div>
              {isAnswered && isTarget && (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              )}
              {isAnswered && isSelected && !isTarget && (
                <XCircle className="w-5 h-5 text-rose-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation Banner */}
      {isAnswered && (
        <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 mb-6 animate-slide-up">
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
            Giải thích chi tiết
          </p>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
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
