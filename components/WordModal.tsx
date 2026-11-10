'use client';

import { Word } from '@/lib/types';
import { Volume2, X, Sparkles, AlertTriangle, BookOpen, CheckCircle, HelpCircle, Layers } from 'lucide-react';
import { SpeechService } from '@/lib/speech';
import { StorageEngine } from '@/lib/storage';
import { useEffect, useState } from 'react';

interface WordModalProps {
  word: Word | null;
  onClose: () => void;
}

export default function WordModal({ word, onClose }: WordModalProps) {
  const [progress, setProgress] = useState<any>(null);

  useEffect(() => {
    if (word) {
      const all = StorageEngine.getWordProgress();
      setProgress(all[word.word] || null);
    }
  }, [word]);

  if (!word) return null;

  const handleSpeak = (text: string) => {
    SpeechService.speak(text);
  };

  const getStrengthPercent = () => {
    if (!progress || !progress.strength) return 0;
    return Math.round(progress.strength * 100);
  };

  const isMCQ = Boolean(word.question && word.options && word.options.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Decor */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Topic & Subject Tags */}
        {(word.subject || word.topic) && (
          <div className="flex flex-wrap items-center gap-2 mb-3 mt-1">
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
        )}

        {/* --- IF MCQ QUESTION --- */}
        {isMCQ ? (
          <div>
            <div className="mb-4">
              <span className="text-xs font-bold uppercase text-indigo-500 flex items-center gap-1.5 mb-1.5">
                <HelpCircle className="w-3.5 h-3.5" /> Câu hỏi trắc nghiệm
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                {word.question}
              </h2>
            </div>

            {/* Options List */}
            <div className="space-y-2 mb-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Các phương án lựa chọn:
              </p>
              {word.options!.map((opt, idx) => {
                const optLetter = String.fromCharCode(65 + idx);
                const isCorrect =
                  (word.answer && word.answer.includes(optLetter)) ||
                  (word.correctWord && opt.toLowerCase() === word.correctWord.toLowerCase()) ||
                  opt.startsWith(`${optLetter}.`);

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
                        className={`w-6 h-6 rounded-lg text-xs flex items-center justify-center font-bold ${
                          isCorrect
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {optLetter}
                      </span>
                      <span>{opt}</span>
                    </div>
                    {isCorrect && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold uppercase shrink-0">
                        Đáp án đúng
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
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
          /* --- IF VOCABULARY WORD --- */
          <div>
            <div className="flex items-start justify-between mt-2 mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {word.word}
                  </h2>
                  <button
                    onClick={() => handleSpeak(word.word)}
                    className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 hover:scale-105 active:scale-95 transition-transform"
                    title="Nghe phát âm chuẩn"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
                {word.ipa && (
                  <p className="text-sm font-mono text-indigo-500 dark:text-indigo-400 mt-1">
                    {word.ipa}
                  </p>
                )}
              </div>

              {/* Strength Badge */}
              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  {getStrengthPercent()}% Độ nhớ
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5 capitalize">
                  Trạng thái: {progress?.status || 'Mới'}
                </p>
              </div>
            </div>

            {/* Meaning */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 mb-5">
              <p className="text-xs uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider mb-1">
                Định nghĩa & Nghĩa tiếng Việt
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-indigo-100">
                {word.vi || word.ru || word.definition || 'Chưa có định nghĩa tiếng Việt'}
              </p>
            </div>

            {/* Synonyms */}
            {word.synonyms && word.synonyms.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Từ đồng nghĩa (Synonyms)
                </p>
                <div className="flex flex-wrap gap-2">
                  {word.synonyms.map((syn, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                    >
                      {syn}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Simple Examples */}
            {word.simple_examples && word.simple_examples.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Ví dụ câu thực tế
                </p>
                <div className="space-y-2">
                  {word.simple_examples.map((ex, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <p className="flex-1">{ex}</p>
                      <button
                        onClick={() => handleSpeak(ex)}
                        className="p-1 text-slate-400 hover:text-indigo-500 transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Done Button */}
        <button
          onClick={onClose}
          className="w-full mt-2 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:opacity-90 active:scale-[0.99] transition-all shadow-md"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
