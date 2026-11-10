'use client';

import { useState, useEffect } from 'react';
import { Word } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import { SRSEngine } from '@/lib/srs';
import { SpeechService } from '@/lib/speech';
import {
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MistakesModeProps {
  words: Word[];
  onExit: () => void;
}

export default function MistakesMode({ words, onExit }: MistakesModeProps) {
  const [mistakeWords, setMistakeWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const progressMap = StorageEngine.getWordProgress();
    const priorityWordList = SRSEngine.getPriorityWords(progressMap, 20);

    // Filter words matching priority list, or words with wrongStreak > 0
    let matched = words.filter((w) => {
      const p = progressMap[w.word];
      return p && (p.wrongStreak > 0 || (p.mistakesCount && p.mistakesCount > 0) || p.strength < 0.6);
    });

    // If none found with mistakes, grab any 5 words with lowest seen count or default words
    if (matched.length === 0) {
      matched = words.slice(0, 5);
    }

    setMistakeWords(matched);
  }, [words]);

  const currentWord = mistakeWords[currentIndex];

  useEffect(() => {
    setIsAnswered(false);
    setSelectedWord(null);
  }, [currentIndex]);

  if (!currentWord) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
          Tuyệt Vời! Không Có Từ Lỗi
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Bạn chưa có từ nào bị ghi nhận sai liên tục. Hãy thử chế độ Học hoặc Thi để thử thách bản thân!
        </p>
        <button
          onClick={onExit}
          className="py-3 px-6 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-glow"
        >
          Về Trang chủ
        </button>
      </div>
    );
  }

  // Generate options
  const otherWords = words
    .filter((w) => w.word.toLowerCase() !== currentWord.word.toLowerCase())
    .map((w) => w.word)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);
  const options = [currentWord.word, ...otherWords].sort(() => 0.5 - Math.random());

  const handleSelect = (choice: string) => {
    if (isAnswered) return;
    setSelectedWord(choice);
    setIsAnswered(true);

    const isCorrect = choice.toLowerCase() === currentWord.word.toLowerCase();
    StorageEngine.updateWordProgress(currentWord.word, isCorrect ? 5 : 1);
  };

  const handleNext = () => {
    if (currentIndex < mistakeWords.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setIsFinished(true);
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  if (isFinished) {
    return (
      <div className="max-w-md mx-auto text-center py-12 px-6 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-6 shadow-glow-success">
          <Trophy className="w-10 h-10 animate-bounce" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
          Đã Khắc Phục Điểm Yếu!
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm">
          Bạn đã ôn tập lại toàn bộ danh sách từ từng gặp khó khăn. Thuật toán SRS đã tự động nâng chỉ số ghi nhớ của bạn!
        </p>

        <div className="space-y-3">
          <button
            onClick={() => {
              setIsFinished(false);
              setCurrentIndex(0);
            }}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-glow"
          >
            Ôn tập lại lần nữa
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

  const isCorrectChoice = selectedWord?.toLowerCase() === currentWord.word.toLowerCase();

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Khắc phục từ hay sai (Mistakes Recovery)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {currentIndex + 1} / {mistakeWords.length}
          </span>
          <button
            onClick={onExit}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Thoát
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-amber-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / mistakeWords.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="p-8 rounded-3xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 shadow-xl mb-6">
        <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">
          Từ vựng cần củng cố
        </p>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white">
            {currentWord.word}
          </h2>
          <button
            onClick={() => SpeechService.speak(currentWord.word)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-500 transition-colors"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Hãy chọn định nghĩa / nghĩa tiếng Việt chính xác nhất:
        </p>
      </div>

      {/* 4 Choices */}
      <div className="space-y-3 mb-6">
        {options.map((opt, idx) => {
          const optWordObj = words.find((w) => w.word.toLowerCase() === opt.toLowerCase());
          const displayMeaning =
            optWordObj?.vi || optWordObj?.ru || optWordObj?.definition || opt;
          const isSelected = selectedWord === opt;
          const isTarget = opt.toLowerCase() === currentWord.word.toLowerCase();

          let style =
            'w-full p-4 rounded-2xl font-semibold border text-left transition-all flex items-center justify-between ';

          if (!selectedWord) {
            style +=
              'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-amber-500 hover:scale-[1.01]';
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
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs flex items-center justify-center font-mono text-slate-500">
                  {idx + 1}
                </span>
                <span className="text-base">{displayMeaning}</span>
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

      {/* Advance Button */}
      {isAnswered && (
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center justify-center gap-2 shadow-glow transition-all"
        >
          <span>Tiếp tục từ kế tiếp</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
