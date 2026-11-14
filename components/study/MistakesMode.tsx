'use client';

import { useState, useEffect, useMemo } from 'react';
import { Word } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import { SpeechService } from '@/lib/speech';
import {
  getQuestionKey,
  cleanOptionText,
  isAnswerMatch,
  isQuestionAnsweredCorrectly,
  getQuestionAnswerMeta,
  formatExplanationForCurrentOptions,
  shuffleArray,
} from '@/lib/utils';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import {
  Volume2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  AlertTriangle,
  ArrowRight,
  Shuffle,
  Check,
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
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(true);

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
    setSelectedWords([]);
  }, [currentIndex]);

  const options = useMemo(() => {
    if (!currentWord) return [];

    if (isMCQ && currentWord.options) {
      if (shuffleOptions) {
        return shuffleArray(
          currentWord.options.map((o) => cleanOptionText(o)),
          true
        );
      }
      return currentWord.options;
    }

    const otherWords = words
      .filter((w) => w.word.toLowerCase() !== currentWord.word.toLowerCase())
      .map((w) => w.word)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    return [currentWord.word, ...otherWords].sort(() => 0.5 - Math.random());
  }, [currentWord, isMCQ, shuffleOptions, words]);

  const answerMeta = useMemo(() => {
    if (!currentWord || !isMCQ) {
      return {
        isMultiSelect: false,
        requiredCount: 1,
        correctChoices: currentWord ? [currentWord.word] : [],
        answerKeys: [],
        isOrMode: false,
      };
    }
    return getQuestionAnswerMeta(
      currentWord.correctWord || currentWord.word,
      currentWord.answer,
      currentWord.options
    );
  }, [currentWord, isMCQ]);

  if (mistakeWords.length === 0) {
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

  if (!currentWord) {
    return null;
  }

  const isOptionTarget = (opt: string) => {
    if (isMCQ) {
      return isAnswerMatch(
        opt,
        currentWord.correctWord || currentWord.word,
        shuffleOptions ? undefined : currentWord.answer,
        answerMeta.correctChoices
      );
    }
    return opt.toLowerCase() === currentWord.word.toLowerCase();
  };

  const submitMistakeSelection = (choices: string[]) => {
    if (isAnswered || choices.length === 0) return;
    setIsAnswered(true);

    const isCorrect = isMCQ
      ? isQuestionAnsweredCorrectly(
          choices,
          currentWord.correctWord || currentWord.word,
          shuffleOptions ? undefined : currentWord.answer,
          answerMeta.correctChoices
        )
      : choices.length === 1 && choices[0].toLowerCase() === currentWord.word.toLowerCase();

    const key = getQuestionKey(currentWord);
    StorageEngine.updateWordProgress(key, isCorrect ? 5 : 2);
  };

  const handleSelect = (choice: string) => {
    if (isAnswered) return;
    if (!answerMeta.isMultiSelect) {
      setSelectedWords([choice]);
      submitMistakeSelection([choice]);
      return;
    }

    setSelectedWords((prev) =>
      prev.includes(choice) ? prev.filter((item) => item !== choice) : [...prev, choice]
    );
  };

  const handleConfirmMulti = () => {
    if (isAnswered || selectedWords.length === 0) return;
    submitMistakeSelection(selectedWords);
  };

  const handleNext = () => {
    if (currentIndex < mistakeWords.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setIsFinished(true);
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Khắc phục câu hay sai (Mistakes Recovery)
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {isMCQ && (
            <button
              type="button"
              onClick={() => {
                if (isAnswered) return;
                setShuffleOptions((v) => !v);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                shuffleOptions
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
              title="Bật/tắt đảo vị trí các đáp án A/B/C/D chống học vẹt vị trí cũ"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Đảo A–D: {shuffleOptions ? 'BẬT' : 'TẮT'}</span>
            </button>
          )}
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
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mb-6 sm:mb-8 overflow-hidden">
        <div
          className="h-full bg-amber-500 transition-[width] duration-300 ease-out transform-gpu"
          style={{ width: `${((currentIndex + 1) / mistakeWords.length) * 100}%` }}
        />
      </div>

      {/* Question & Choices Animated Container */}
      <div key={currentIndex} className="animate-question-enter transform-gpu">
        {/* Question Card */}
        <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl story-glass shadow-xl mb-5 sm:mb-6">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                {isMCQ ? 'Câu hỏi cần khắc phục' : 'Từ vựng cần củng cố'}
              </p>
              {isMCQ && answerMeta.isMultiSelect && (
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                  Chọn {answerMeta.requiredCount} đáp án ({selectedWords.length}/{answerMeta.requiredCount})
                </span>
              )}
            </div>
            {isMCQ && shuffleOptions && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                <Shuffle className="w-3 h-3" /> Đã đảo thứ tự A–D chống nhớ vẹt
              </span>
            )}
          </div>
          <div className="flex items-start justify-between gap-4 mb-4">
            <CodeQuestionRenderer
              content={currentWord.question || currentWord.word}
              className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-relaxed flex-1"
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
              ? 'Hãy đọc kỹ nội dung và chọn phương án chính xác nhất:'
              : 'Hãy chọn định nghĩa / nghĩa tiếng Việt chính xác:'}
          </p>
        </div>

        {/* 4 Choices */}
        <div className="space-y-2.5 sm:space-y-3 mb-6">
          {options.map((opt, idx) => {
            let displayLabel = opt;
            if (!isMCQ) {
              const optWordObj = words.find((w) => w.word.toLowerCase() === opt.toLowerCase());
              displayLabel = optWordObj?.vi || optWordObj?.ru || optWordObj?.definition || opt;
            } else {
              displayLabel = cleanOptionText(opt);
            }

            const isSelected = selectedWords.includes(opt);
            const isTarget = isOptionTarget(opt);

            let style =
              'w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl font-semibold border text-left transition-[transform,background-color,border-color,opacity] duration-150 flex items-center justify-between active:scale-[0.99] touch-manipulation select-none transform-gpu ';

            if (!isAnswered) {
              if (isSelected) {
                style +=
                  'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-200 font-bold shadow-sm';
              } else {
                style +=
                  'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-amber-500';
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
                disabled={isAnswered}
                onClick={() => handleSelect(opt)}
                className={style}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 ${
                      answerMeta.isMultiSelect ? 'rounded-lg' : 'rounded-xl'
                    } text-xs flex items-center justify-center font-mono font-bold shrink-0 ${
                      !isAnswered && isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm sm:text-base">{displayLabel}</span>
                </div>
                {!isAnswered && answerMeta.isMultiSelect && (
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
                {isAnswered && isTarget && (
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {!isSelected && answerMeta.isMultiSelect && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                        Chọn thiếu
                      </span>
                    )}
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                )}
                {isAnswered && isSelected && !isTarget && (
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>

        {/* Multi-Select Confirm Button */}
        {!isAnswered && answerMeta.isMultiSelect && (
          <button
            type="button"
            disabled={selectedWords.length === 0}
            onClick={handleConfirmMulti}
            className={`w-full py-3.5 mb-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              selectedWords.length === answerMeta.requiredCount
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-glow'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>
              Xác nhận đáp án ({selectedWords.length}/{answerMeta.requiredCount})
            </span>
          </button>
        )}
      </div>

      {/* Explanation & Advance Button */}
      {isAnswered && (
        <div className="space-y-4">
          {currentWord.explanation && (
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/60 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
              <span className="font-bold text-amber-600 dark:text-amber-400">Giải thích: </span>
              {isMCQ
                ? formatExplanationForCurrentOptions(
                    currentWord.explanation,
                    options,
                    currentWord.correctWord || currentWord.word,
                    currentWord.answer,
                    shuffleOptions,
                    answerMeta.correctChoices
                  )
                : currentWord.explanation}
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
