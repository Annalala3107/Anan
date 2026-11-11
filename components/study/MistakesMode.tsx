'use client';

import { useState, useEffect, useMemo } from 'react';
import { Word } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import { SpeechService } from '@/lib/speech';
import { getQuestionKey, cleanOptionText, isAnswerMatch } from '@/lib/utils';
import { soundFx } from '@/lib/sound';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import {
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
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
    if (!words || words.length === 0) return;

    const progressMap = StorageEngine.getWordProgress();

    // Filter words matching priority list, or words with wrongStreak > 0, mistakesCount > 0, or low strength
    const matched = words.filter((w) => {
      const p = StorageEngine.getItemProgress(w, progressMap);
      return (
        p &&
        (p.wrongStreak > 0 ||
          (p.mistakesCount && p.mistakesCount > 0) ||
          p.strength < 0.6)
      );
    });

    setMistakeWords(matched);
  }, [words]);

  const currentWord = mistakeWords[currentIndex];
  const isMCQ = Boolean(
    currentWord?.question && currentWord?.options && currentWord.options.length > 0
  );

  useEffect(() => {
    setIsAnswered(false);
    setSelectedWord(null);
  }, [currentIndex]);

  const options = useMemo(() => {
    if (!currentWord) return [];

    if (isMCQ && currentWord.options) {
      return currentWord.options;
    }

    const otherWords = words
      .filter((w) => w.word.toLowerCase() !== currentWord.word.toLowerCase())
      .map((w) => w.word)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    return [currentWord.word, ...otherWords].sort(() => 0.5 - Math.random());
  }, [currentWord, isMCQ, words]);

  if (!currentWord && mistakeWords.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-6 shadow-glow-success">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
          Tuyệt Vời! Không Có Câu Lỗi
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          Bạn chưa có câu hỏi hoặc từ vựng nào bị ghi nhận sai liên tục trong bộ đề này. Hãy thử chế độ Học hoặc Thi Thử để thử thách bản thân!
        </p>
        <button
          onClick={onExit}
          className="py-3.5 px-8 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-glow"
        >
          Về Trang chủ
        </button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center mb-6 shadow-glow">
          <Trophy className="w-10 h-10 animate-bounce" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
          Đã Củng Cố Hết Các Lỗi Sai!
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm">
          Bạn đã rà soát lại toàn bộ {mistakeWords.length} câu hay sai. Thuật toán SRS đã điều chỉnh chu kỳ nhắc lại thông minh cho bạn.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => {
              setIsFinished(false);
              setCurrentIndex(0);
            }}
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-glow flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Ôn tập lại lần nữa</span>
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

  const isOptionTarget = (opt: string) => {
    if (isMCQ) {
      return isAnswerMatch(opt, currentWord.correctWord || currentWord.word, currentWord.answer);
    }
    return opt.toLowerCase() === currentWord.word.toLowerCase();
  };

  const handleSelect = (choice: string) => {
    if (isAnswered) return;
    setSelectedWord(choice);
    setIsAnswered(true);

    const isCorrect = isOptionTarget(choice);
    if (isCorrect) {
      soundFx.playCorrect();
    } else {
      soundFx.playWrong();
    }
    const key = getQuestionKey(currentWord);
    StorageEngine.updateWordProgress(key, isCorrect ? 5 : 2);
  };

  const handleNext = () => {
    soundFx.playClick();
    if (currentIndex < mistakeWords.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setIsFinished(true);
      soundFx.playCelebration();
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Khắc phục câu hay sai (Mistakes Recovery)
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
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 shadow-xl mb-6">
        <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">
          {isMCQ ? 'Câu hỏi cần khắc phục' : 'Từ vựng cần củng cố'}
        </p>
        <div className="flex items-start justify-between gap-4 mb-4">
          <CodeQuestionRenderer
            content={currentWord.question || currentWord.word}
            className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-relaxed flex-1"
          />
          {!isMCQ && (
            <button
              onClick={() => SpeechService.speak(currentWord.word)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-500 transition-colors shrink-0"
              aria-label="Phát âm"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {isMCQ
            ? 'Hãy chọn phương án chính xác nhất:'
            : 'Hãy chọn định nghĩa / nghĩa tiếng Việt chính xác:'}
        </p>
      </div>

      {/* 4 Choices */}
      <div className="space-y-3 mb-6">
        {options.map((opt, idx) => {
          let displayLabel = opt;
          if (!isMCQ) {
            const optWordObj = words.find((w) => w.word.toLowerCase() === opt.toLowerCase());
            displayLabel = optWordObj?.vi || optWordObj?.ru || optWordObj?.definition || opt;
          } else {
            displayLabel = cleanOptionText(opt);
          }

          const isSelected = selectedWord === opt;
          const isTarget = isOptionTarget(opt);

          let style =
            'w-full p-4 rounded-2xl font-semibold border text-left transition-all flex items-center justify-between ';

          if (!selectedWord) {
            style +=
              'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-amber-500 hover:scale-[1.005]';
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
                <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs flex items-center justify-center font-mono font-bold text-slate-500 shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-sm sm:text-base">{displayLabel}</span>
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

      {/* Explanation & Advance Button */}
      {isAnswered && (
        <div className="space-y-4">
          {currentWord.explanation && (
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/60 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
              <span className="font-bold text-amber-600 dark:text-amber-400">Giải thích: </span>
              {currentWord.explanation}
            </div>
          )}
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center justify-center gap-2 shadow-glow transition-all"
          >
            <span>Tiếp tục câu kế tiếp</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
