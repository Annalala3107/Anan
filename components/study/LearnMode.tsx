'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Word } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import { SpeechService } from '@/lib/speech';
import {
  Volume2,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Check,
  X,
  HelpCircle,
  Trophy,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LearnModeProps {
  words: Word[];
  onExit: () => void;
}

type Round = 'recall' | 'usage' | 'contrast';

export default function LearnMode({ words, onExit }: LearnModeProps) {
  const [sessionWords] = useState<Word[]>(() => {
    return [...words].sort(() => 0.5 - Math.random()).slice(0, 10);
  });

  const [round, setRound] = useState<Round>('recall');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  const currentWord = sessionWords[currentIndex] || sessionWords[0];
  const isMCQ = Boolean(currentWord?.question && currentWord?.options && currentWord.options.length > 0);

  useEffect(() => {
    setIsFlipped(false);
    setSelectedOption(null);
  }, [currentIndex, round]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSessionComplete) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === '1') {
        handleFeedback('hard');
      } else if (e.key === '2') {
        handleFeedback('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentIndex, round, isSessionComplete]);

  if (!currentWord) {
    return (
      <div className="text-center py-20 text-slate-500">
        Không tìm thấy nội dung trong bộ đề này.
      </div>
    );
  }

  const handleFeedback = (difficulty: 'easy' | 'hard') => {
    const quality = difficulty === 'easy' ? 5 : 2;
    StorageEngine.updateWordProgress(currentWord.correctWord || currentWord.word, quality);

    if (currentIndex < sessionWords.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      if (round === 'recall') {
        setRound('usage');
        setCurrentIndex(0);
      } else if (round === 'usage') {
        setRound('contrast');
        setCurrentIndex(0);
      } else {
        setIsSessionComplete(true);
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  };

  const getOptions = () => {
    if (isMCQ && currentWord.options) {
      return currentWord.options;
    }
    const pool = sessionWords
      .map((w) => w.word)
      .filter((w) => w.toLowerCase() !== currentWord.word.toLowerCase());
    const distractors = pool.sort(() => 0.5 - Math.random()).slice(0, 3);
    const combined = [currentWord.word, ...distractors];
    return combined.sort(() => 0.5 - Math.random());
  };

  const options = getOptions();

  const isCorrectChoice = (opt: string) => {
    if (isMCQ) {
      return (
        opt.trim().toLowerCase() === (currentWord.correctWord || '').trim().toLowerCase() ||
        (currentWord.answer && opt.startsWith(`${currentWord.answer}.`))
      );
    }
    return opt.toLowerCase() === currentWord.word.toLowerCase();
  };

  if (isSessionComplete) {
    return (
      <div className="max-w-md mx-auto text-center py-12 px-6 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-6 shadow-glow-success">
          <Trophy className="w-10 h-10 animate-bounce" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
          Xuất Sắc! Hoàn Thành Vòng Học
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm">
          Bạn vừa ghi nhớ sâu sắc {sessionWords.length} câu hỏi / từ vựng qua 3 giai đoạn: Nhận diện, Kiểm tra phản xạ và Củng cố.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => {
              setIsSessionComplete(false);
              setRound('recall');
              setCurrentIndex(0);
            }}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-glow"
          >
            Học lại bộ này
          </button>
          <button
            onClick={onExit}
            className="w-full py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            Quay về Trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Session Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Chế độ Học (Learn) • Vòng {round === 'recall' ? '1: Nhớ lại' : round === 'usage' ? '2: Kiểm tra' : '3: Củng cố'}
          </span>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Câu / Từ {currentIndex + 1} / {sessionWords.length}
          </p>
        </div>

        <button
          onClick={onExit}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          Thoát
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / sessionWords.length) * 100}%`,
          }}
        />
      </div>

      {/* Round 1: 3D Flashcard Recall */}
      {round === 'recall' && (
        <div className="space-y-6">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-[340px] rounded-3xl p-6 sm:p-8 cursor-pointer relative bg-gradient-to-b from-white to-slate-50 dark:from-[#131D31] dark:to-[#0F172A] border-2 border-slate-200/80 dark:border-slate-700/80 shadow-2xl flex flex-col items-center justify-center text-center transition-all duration-300 hover:border-indigo-500/60 group"
          >
            <div className="absolute top-4 right-4 text-xs text-slate-400 font-mono">
              [Bấm hoặc Space để lật]
            </div>

            {!isFlipped ? (
              // Front
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 max-w-lg"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{isMCQ ? 'Câu hỏi' : 'Từ vựng'}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-relaxed">
                  {currentWord.question || currentWord.word}
                </h2>
                <p className="text-xs text-slate-400 mt-2">
                  Bạn có biết câu trả lời chính xác là gì không?
                </p>
              </motion.div>
            ) : (
              // Back
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-3 max-w-lg text-left"
              >
                <div className="text-center mb-2">
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Đáp án chính xác: {currentWord.answer || currentWord.correctWord || currentWord.word}
                  </span>
                </div>

                <p className="text-lg font-bold text-slate-900 dark:text-white text-center">
                  {currentWord.correctWord || currentWord.vi || currentWord.word}
                </p>

                {currentWord.explanation && (
                  <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/60 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {currentWord.explanation}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Feedback Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleFeedback('hard')}
              className="py-4 px-6 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
              <span>Chưa nhớ [1]</span>
            </button>
            <button
              onClick={() => handleFeedback('easy')}
              className="py-4 px-6 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
            >
              <Check className="w-5 h-5" />
              <span>Đã thuộc [2]</span>
            </button>
          </div>
        </div>
      )}

      {/* Round 2 & 3: Practice choices */}
      {(round === 'usage' || round === 'contrast') && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 shadow-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2">
              {isMCQ ? 'Chọn phương án đúng nhất' : 'Điền từ thích hợp vào câu'}
            </p>
            <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
              {currentWord.question || currentWord.simple_examples?.[0] || currentWord.word}
            </p>
          </div>

          {/* Choices */}
          <div className="space-y-3">
            {options.map((opt, idx) => {
              const isSelected = selectedOption === opt;
              const isCorrect = isCorrectChoice(opt);
              let btnStyle =
                'w-full p-4 rounded-2xl font-semibold border text-left transition-all flex items-center justify-between ';

              if (!selectedOption) {
                btnStyle +=
                  'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-indigo-500 hover:scale-[1.005]';
              } else if (isCorrect) {
                btnStyle +=
                  'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-glow-success font-bold';
              } else if (isSelected && !isCorrect) {
                btnStyle +=
                  'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 font-bold';
              } else {
                btnStyle +=
                  'opacity-40 bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500';
              }

              return (
                <button
                  key={idx}
                  disabled={Boolean(selectedOption)}
                  onClick={() => {
                    setSelectedOption(opt);
                    const quality = isCorrect ? 5 : 1;
                    StorageEngine.updateWordProgress(currentWord.correctWord || currentWord.word, quality);
                  }}
                  className={btnStyle}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs flex items-center justify-center font-mono font-bold text-slate-500 shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-sm sm:text-base">{opt}</span>
                  </div>
                  {selectedOption && isCorrect && (
                    <Check className="w-5 h-5 text-emerald-500 shrink-0 ml-2" />
                  )}
                  {selectedOption && isSelected && !isCorrect && (
                    <X className="w-5 h-5 text-rose-500 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {selectedOption && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {currentWord.explanation && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/60 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium mb-4">
                  {currentWord.explanation}
                </div>
              )}
              <button
                onClick={() => handleFeedback(isCorrectChoice(selectedOption) ? 'easy' : 'hard')}
                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 shadow-glow transition-all"
              >
                <span>Tiếp tục câu kế tiếp</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
