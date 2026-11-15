'use client';

import { Word, WordProgress } from '@/lib/types';
import { X, BookOpen, CheckCircle, HelpCircle } from 'lucide-react';
import { StorageEngine } from '@/lib/storage';
import { cleanOptionText, isAnswerMatch } from '@/lib/utils';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import { useEffect, useId, useState } from 'react';

interface WordModalProps {
  word: Word | null;
  onClose: () => void;
}

export default function WordModal({ word, onClose }: WordModalProps) {
  const [progress, setProgress] = useState<WordProgress | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (word) {
      const all = StorageEngine.getWordProgress();
      setProgress(StorageEngine.getItemProgress(word, all));
    }
  }, [word]);

  useEffect(() => {
    if (!word) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [word, onClose]);

  if (!word) return null;

  const strengthPercent = progress?.strength ? Math.round(progress.strength * 100) : 0;
  const isMCQ = Boolean(word.question && word.options && word.options.length > 0);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-xl glass-elevated bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Subject, Topic & Memory Strength Tags */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 mt-1 pr-8">
          <div className="flex flex-wrap items-center gap-2">
            {word.subject && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                {word.subject}
              </span>
            )}
            {word.topic && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                {word.topic}
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            {strengthPercent}% Độ nhớ
          </span>
        </div>

        {isMCQ ? (
          <div>
            <div className="mb-4">
              <span
                id={titleId}
                className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mb-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Câu hỏi trắc nghiệm
              </span>
              <CodeQuestionRenderer
                content={word.question || word.word}
                className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed"
              />
            </div>

            <div className="space-y-2 mb-5">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Các phương án lựa chọn:
              </p>
              {word.options!.map((opt, idx) => {
                const optLetter = String.fromCharCode(65 + idx);
                const isCorrect = isAnswerMatch(opt, word.correctWord, word.answer);

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border text-sm flex items-center justify-between ${
                      isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-6 h-6 rounded-lg text-xs flex items-center justify-center font-bold shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {optLetter}
                      </span>
                      <span>{cleanOptionText(opt)}</span>
                    </div>
                    {isCorrect && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold uppercase shrink-0 ml-2">
                        Đáp án đúng
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {word.explanation && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 mb-5">
                <p className="text-xs uppercase font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                  Giải thích đáp án:
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {word.explanation}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 mb-5">
            <div>
              <span
                id={titleId}
                className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mb-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" /> Nội dung kiến thức
              </span>
              <CodeQuestionRenderer
                content={word.question || word.word}
                className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed"
              />
            </div>

            {(word.explanation || word.vi || word.definition) && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60">
                <p className="text-xs uppercase font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                  Đáp án &amp; Giải thích:
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {word.explanation || word.vi || word.definition}
                </p>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-2 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:opacity-90 active:scale-[0.99] transition-all shadow-md cursor-pointer"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
