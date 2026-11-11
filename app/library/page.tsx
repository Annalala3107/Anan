'use client';

import { useState, useEffect } from 'react';
import { Word, WordProgress } from '@/lib/types';
import { useQuizStore } from '@/lib/quizStore';
import { StorageEngine } from '@/lib/storage';
import { SpeechService } from '@/lib/speech';
import WordModal from '@/components/WordModal';
import {
  Search,
  Volume2,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function LibraryPage() {
  const { words, loadQuizWords, selectedQuizPath, activeCustomQuiz } = useQuizStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'mastered' | 'learning' | 'new'>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [progressMap, setProgressMap] = useState<Record<string, WordProgress>>({});
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);

  useEffect(() => {
    loadQuizWords();
    setProgressMap(StorageEngine.getWordProgress());
  }, []);

  // Collect unique topics in current quiz
  const topics = Array.from(new Set(words.map((w) => w.topic).filter(Boolean)));

  const filteredWords = words.filter((w) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      (w.question && w.question.toLowerCase().includes(term)) ||
      w.word.toLowerCase().includes(term) ||
      (w.vi && w.vi.toLowerCase().includes(term)) ||
      (w.explanation && w.explanation.toLowerCase().includes(term)) ||
      (w.options && w.options.some((opt) => opt.toLowerCase().includes(term)));

    if (!matchSearch) return false;

    if (filterTopic !== 'all' && w.topic !== filterTopic) return false;

    const prog = StorageEngine.getItemProgress(w, progressMap);
    if (filterStatus === 'mastered') return prog?.status === 'mastered';
    if (filterStatus === 'learning') return prog?.status === 'learning';
    if (filterStatus === 'new') return !prog || prog.status === 'new';

    return true;
  });

  return (
    <div className="w-full px-3.5 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-5 md:py-10 pb-28 md:pb-12 space-y-5 sm:space-y-6 animate-fade-in">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-indigo-500" />
          Ngân Hàng Câu Hỏi & Tra Cứu ({filteredWords.length}/{words.length})
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Tra cứu toàn bộ câu hỏi trắc nghiệm, các lựa chọn A/B/C/D, đáp án chính xác và lời giải thích chi tiết.
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo nội dung câu hỏi, từ khoá, đáp án, code C hoặc giải thích..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        {/* Filter Badges: Status & Topics */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filters */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'mastered', label: 'Đã thuộc' },
              { id: 'learning', label: 'Đang ôn' },
              { id: 'new', label: 'Chưa làm' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  filterStatus === f.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Topic Dropdown if topics exist */}
          {topics.length > 0 && (
            <select
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
              className="px-3.5 py-2 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tất cả chủ đề ({topics.length})</option>
              {topics.map((t, i) => (
                <option key={i} value={t as string}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Questions Grid */}
      {filteredWords.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          Không tìm thấy câu hỏi nào khớp với từ khoá hoặc bộ lọc của bạn.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredWords.map((w, idx) => {
            const prog = StorageEngine.getItemProgress(w, progressMap);
            const strengthPercent = prog?.strength ? Math.round(prog.strength * 100) : 0;
            const isMastered = prog?.status === 'mastered';
            const isMCQ = Boolean(w.question && w.options);

            return (
              <div
                key={idx}
                onClick={() => setSelectedWord(w)}
                className="group p-5 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-indigo-500/80 cursor-pointer content-auto-card gpu-card hover:shadow-lg flex flex-col justify-between touch-manipulation active:scale-[0.99]"
              >
                <div>
                  {/* Top tags */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                      {w.topic || 'Câu ' + (idx + 1)}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isMastered
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : prog?.seenCount
                          ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {strengthPercent}% Thuộc
                    </span>
                  </div>

                  {/* Question text */}
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-3 mb-3">
                    {w.question || w.word}
                  </h3>

                  {/* Options Preview */}
                  {isMCQ && w.options && (
                    <div className="space-y-1 mb-3">
                      {w.options.slice(0, 4).map((opt, i) => {
                        const optLetter = String.fromCharCode(65 + i);
                        const isCorrect =
                          (w.answer && w.answer.includes(optLetter)) ||
                          (w.correctWord && opt.toLowerCase() === w.correctWord.toLowerCase());

                        return (
                          <div
                            key={i}
                            className={`px-2.5 py-1 rounded-xl text-xs flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <span className="truncate">{opt}</span>
                            {isCorrect && (
                              <span className="text-[10px] font-bold text-emerald-500 uppercase ml-2 shrink-0">
                                Đúng
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-400">
                  <span>
                    Đáp án: <strong className="text-emerald-500 font-bold">{w.answer || w.correctWord}</strong>
                  </span>
                  <span className="text-indigo-500 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Xem giải thích <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Word / Question Detail Modal */}
      <WordModal word={selectedWord} onClose={() => setSelectedWord(null)} />
    </div>
  );
}
