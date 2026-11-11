'use client';

import React from 'react';
import { StandardQuestion } from '@/lib/quizHelpers';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import { SpeechService } from '@/lib/speech';
import {
  RotateCcw,
  Volume2,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Flame,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

interface FlashcardViewProps {
  currentQ: StandardQuestion;
  questionIndex: number;
  totalCount: number;
  streak: number;
  streakTarget: number;
  isFlipped: boolean;
  onToggleFlip: () => void;
  onRate: (quality: 1 | 3 | 5) => void;
}

export default function FlashcardView({
  currentQ,
  questionIndex,
  totalCount,
  streak,
  streakTarget,
  isFlipped,
  onToggleFlip,
  onRate,
}: FlashcardViewProps) {
  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    SpeechService.speak(text);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* Top Status & Controls Bar */}
      <div className="flex items-center justify-between text-xs font-semibold px-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            {currentQ.subject || 'Môn học'}
          </span>
          {currentQ.topic && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
              {currentQ.topic}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-amber-500 font-mono font-bold">
            <Flame className="w-4 h-4 fill-current" />
            <span>
              Độ thuộc thẻ này: {streak}/{streakTarget}
            </span>
          </div>
          <span className="text-slate-400 font-mono">
            Đã thuộc {questionIndex} / {totalCount}
          </span>
        </div>
      </div>

      {/* 3D Flip Card Container */}
      <div
        key={`${currentQ.id || questionIndex}_${streak}`}
        className="[perspective:1200px] w-full min-h-[320px] sm:min-h-[400px] select-none cursor-pointer group touch-manipulation animate-question-enter"
        onClick={onToggleFlip}
      >
        <div
          className={`relative w-full min-h-[320px] sm:min-h-[400px] transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d] will-change-transform transform-gpu ${
            isFlipped ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          {/* ===================== FRONT SIDE ===================== */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0F172A] border-2 border-indigo-500/30 dark:border-indigo-500/30 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> Mặt Trước: Câu Hỏi / Khái Niệm
                </span>
                <button
                  type="button"
                  onClick={(e) => handleSpeak(e, currentQ.sentence)}
                  title="Nghe phát âm câu hỏi"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Question Stem */}
              <CodeQuestionRenderer
                content={currentQ.sentence}
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed"
              />
            </div>

            {/* Bottom Flip Hint */}
            <div className="pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="sm:hidden">Chạm thẻ để lật xem đáp án</span>
                <span className="hidden sm:inline">Bấm vào thẻ hoặc nhấn [Space] để lật đáp án</span>
              </span>
              <kbd className="hidden sm:inline px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono text-[11px]">
                Space
              </kbd>
            </div>
          </div>

          {/* ===================== BACK SIDE ===================== */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0E1526] border-2 border-emerald-500/40 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Mặt Sau: Đáp Án Chuẩn & Giải Thích
                </span>
                <button
                  type="button"
                  onClick={(e) => handleSpeak(e, currentQ.correctWord)}
                  title="Nghe phát âm đáp án"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Correct Answer Highlight */}
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                  Đáp án chính xác:
                </p>
                <p className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300">
                  {currentQ.answerKey ? `${currentQ.answerKey}. ` : ''}
                  {currentQ.correctWord}
                </p>
              </div>

              {/* Explanation */}
              {currentQ.explanation && (
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  <strong className="text-slate-900 dark:text-white block mb-1">💡 Phân tích & Ghi nhớ:</strong>
                  {currentQ.explanation}
                </div>
              )}

              {/* Options Breakdown */}
              {currentQ.options && currentQ.options.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Các phương án trắc nghiệm:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs">
                    {currentQ.options.map((opt, idx) => {
                      const optLetter = String.fromCharCode(65 + idx);
                      const validAnswerKeys = (currentQ.answerKey || '')
                        .split(/[,/;\s]+/)
                        .map((k) => k.trim().toUpperCase())
                        .filter(Boolean);
                      const isTargetCorrect =
                        opt.includes(currentQ.correctWord) ||
                        validAnswerKeys.includes(optLetter) ||
                        (currentQ.answerKey && opt.startsWith(`${currentQ.answerKey}.`));
                      return (
                        <div
                          key={idx}
                          className={`p-2 sm:p-2.5 rounded-xl border text-xs font-medium ${
                            isTargetCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                              : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                          }`}
                        >
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Flip Back Hint */}
            <div className="pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[11px] sm:text-xs text-slate-500">
                Hãy đánh giá mức độ ghi nhớ ở bên dưới 👇
              </span>
              <kbd className="hidden sm:inline px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono text-[11px]">
                Space: Lật lại
              </kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Spaced Repetition (SM-2) Self-Rating Action Controls */}
      <div className="pt-2">
        {!isFlipped ? (
          <button
            type="button"
            onClick={onToggleFlip}
            className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 shadow-glow text-sm transition-[transform,background-color] duration-150 active:scale-95 touch-manipulation select-none"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="sm:hidden">Lật Thẻ Xem Đáp Án</span>
            <span className="hidden sm:inline">Lật Thẻ Xem Đáp Án [Space]</span>
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 animate-fade-in">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRate(1);
              }}
              className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-center transition-[transform,background-color,border-color] duration-150 active:scale-95 touch-manipulation select-none"
            >
              <span className="block text-xs sm:text-base font-black">1. Chưa Nhớ</span>
              <span className="text-[9px] sm:text-xs opacity-75 block mt-0.5">Ôn lại sớm</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRate(3);
              }}
              className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-center transition-[transform,background-color,border-color] duration-150 active:scale-95 touch-manipulation select-none"
            >
              <span className="block text-xs sm:text-base font-black">2. Tạm Nhớ</span>
              <span className="text-[9px] sm:text-xs opacity-75 block mt-0.5">Ôn tiếp chu kỳ</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRate(5);
              }}
              className="p-2 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-center transition-[transform,background-color,border-color] duration-150 active:scale-95 touch-manipulation select-none"
            >
              <span className="block text-xs sm:text-base font-black">3. Đã Thuộc</span>
              <span className="text-[9px] sm:text-xs opacity-75 block mt-0.5">Tốt nghiệp thẻ</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
