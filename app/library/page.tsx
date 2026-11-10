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
  Filter,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Layers
} from 'lucide-react';

export default function LibraryPage() {
  const { words, loadQuizWords, selectedQuizPath, activeCustomQuiz } = useQuizStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'mastered' | 'learning' | 'new'>('all');
  const [progressMap, setProgressMap] = useState<Record<string, WordProgress>>({});
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);

  useEffect(() => {
    loadQuizWords();
    setProgressMap(StorageEngine.getWordProgress());
  }, []);

  const filteredWords = words.filter((w) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      w.word.toLowerCase().includes(term) ||
      (w.vi && w.vi.toLowerCase().includes(term)) ||
      (w.ru && w.ru.toLowerCase().includes(term)) ||
      (w.synonyms && w.synonyms.some((s) => s.toLowerCase().includes(term)));

    if (!matchSearch) return false;

    const prog = progressMap[w.word];
    if (filterStatus === 'mastered') return prog?.status === 'mastered';
    if (filterStatus === 'learning') return prog?.status === 'learning';
    if (filterStatus === 'new') return !prog || prog.status === 'new';

    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-6 animate-fade-in">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-indigo-500" />
          Kho Từ Vựng & Tra Cứu ({filteredWords.length}/{words.length})
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Tra cứu toàn bộ từ vựng, nghe phát âm bản xứ, xem ví dụ ngữ cảnh và phân biệt từ dễ nhầm lẫn.
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo từ tiếng Anh, nghĩa tiếng Việt, hoặc từ đồng nghĩa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'mastered', label: 'Đã thuộc' },
            { id: 'learning', label: 'Đang học' },
            { id: 'new', label: 'Từ mới' },
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
      </div>

      {/* Words Grid */}
      {filteredWords.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          Không tìm thấy từ vựng nào khớp với từ khoá & bộ lọc của bạn.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWords.map((w, idx) => {
            const prog = progressMap[w.word];
            const strengthPercent = prog?.strength ? Math.round(prog.strength * 100) : 0;
            const isMastered = prog?.status === 'mastered';

            return (
              <div
                key={idx}
                onClick={() => setSelectedWord(w)}
                className="group p-5 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-indigo-500/80 cursor-pointer transition-all hover:shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {w.word}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            SpeechService.speak(w.word);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                      {w.ipa && (
                        <p className="text-xs font-mono text-indigo-500 dark:text-indigo-400">
                          {w.ipa}
                        </p>
                      )}
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        isMastered
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : prog?.seenCount
                          ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {strengthPercent}%
                    </span>
                  </div>

                  {/* Meaning */}
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 mb-3">
                    {w.vi || w.ru || w.definition}
                  </p>

                  {/* Synonyms Preview */}
                  {w.synonyms && w.synonyms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {w.synonyms.slice(0, 3).map((s, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {s}
                        </span>
                      ))}
                      {w.synonyms.length > 3 && (
                        <span className="text-[11px] text-slate-400 self-center">
                          +{w.synonyms.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Example Snippet */}
                {w.simple_examples?.[0] && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-1 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                    &quot;{w.simple_examples[0]}&quot;
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Word Detail Modal */}
      <WordModal word={selectedWord} onClose={() => setSelectedWord(null)} />
    </div>
  );
}
