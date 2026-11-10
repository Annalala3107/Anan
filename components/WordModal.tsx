'use client';

import { Word } from '@/lib/types';
import { Volume2, X, Sparkles, AlertTriangle, BookOpen, CheckCircle } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Decor */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Word Title & Pronunciation */}
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

        {/* Meaning / Translation */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 mb-5">
          <p className="text-xs uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider mb-1">
            Định nghĩa & Nghĩa tiếng Việt
          </p>
          <p className="text-lg font-bold text-slate-900 dark:text-indigo-100">
            {word.vi || word.ru || word.definition || 'Chưa có định nghĩa tiếng Việt'}
          </p>
          {word.ru && word.vi && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
              Nga: {word.ru}
            </p>
          )}
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
                    title="Nghe câu"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Example */}
        {word.advanced_example && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">
              Ngữ cảnh học thuật nâng cao (Academic / SAT Context)
            </p>
            <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 text-sm text-slate-800 dark:text-purple-200 leading-relaxed italic">
              &quot;{word.advanced_example}&quot;
            </div>
          </div>
        )}

        {/* Confusions / Nuances */}
        {word.confusions && word.confusions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Dễ nhầm lẫn với (Common Traps)
            </p>
            <div className="flex flex-wrap gap-2">
              {word.confusions.map((conf, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                >
                  {conf}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Done Button */}
        <button
          onClick={onClose}
          className="w-full mt-2 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:opacity-90 active:scale-[0.99] transition-all shadow-md"
        >
          Đã hiểu từ này
        </button>
      </div>
    </div>
  );
}
