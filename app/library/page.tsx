'use client';

import { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react';
import { Word, WordProgress } from '@/lib/types';
import { useQuizStore } from '@/lib/quizStore';
import { StorageEngine } from '@/lib/storage';
import { QUESTION_BANKS, getQuizDisplayName } from '@/lib/defaultBanks';
import { getQuestionKey, isAnswerMatch } from '@/lib/utils';
import WordModal from '@/components/WordModal';
import OptionContent from '@/components/OptionContent';
import { Search, BookOpen, ChevronRight, Loader2, Layers, Bookmark } from 'lucide-react';

type SearchScope = 'current' | 'all' | string;

export default function LibraryPage() {
  const { words, loadQuizWords, hydrateSelection, selectedQuizPath, activeCustomQuiz } =
    useQuizStore();
  const [scope, setScope] = useState<SearchScope>('current');
  const [scopedWords, setScopedWords] = useState<Word[]>([]);
  const [isLoadingScope, setIsLoadingScope] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'mastered' | 'learning' | 'new' | 'bookmarked'
  >('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [progressMap, setProgressMap] = useState<Record<string, WordProgress>>({});
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [visibleCount, setVisibleCount] = useState(36);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // In-memory cache so switching subject tabs never re-fetches already-loaded JSON files
  const scopeCacheRef = useRef<Map<string, Word[]>>(new Map());
  const manifestFilesCacheRef = useRef<Record<string, { keys?: string[] }> | null>(null);

  useEffect(() => {
    hydrateSelection();
    loadQuizWords();
    setProgressMap(StorageEngine.getWordProgress());
    setBookmarks(StorageEngine.getBookmarks());

    const onStats = () => setProgressMap(StorageEngine.getWordProgress());
    const onBookmarks = () => setBookmarks(StorageEngine.getBookmarks());
    window.addEventListener('ananquiz:stats-updated', onStats);
    window.addEventListener('ananquiz:bookmarks-updated', onBookmarks);
    return () => {
      window.removeEventListener('ananquiz:stats-updated', onStats);
      window.removeEventListener('ananquiz:bookmarks-updated', onBookmarks);
    };
  }, [hydrateSelection, loadQuizWords]);

  useEffect(() => {
    setVisibleCount(36);
    setFilterTopic('all');
  }, [scope]);

  useEffect(() => {
    setVisibleCount(36);
  }, [deferredSearchTerm, filterStatus, filterTopic]);

  // Lazy-load words when scope changes beyond the current quiz
  useEffect(() => {
    if (scope === 'current') return;

    const cached = scopeCacheRef.current.get(scope);
    if (cached) {
      setScopedWords(cached);
      return;
    }

    let cancelled = false;
    setIsLoadingScope(true);

    const loadScopeData = async () => {
      try {
        const deduped = new Map<string, Word>();
        const appendWords = (items: Word[], fallbackSubject?: string) => {
          for (const rawItem of items) {
            const normalized: Word = fallbackSubject && !rawItem.subject
              ? { ...rawItem, subject: fallbackSubject }
              : rawItem;
            const key = getQuestionKey(normalized);
            if (!deduped.has(key)) {
              deduped.set(key, normalized);
            }
          }
        };

        if (scope === 'custom') {
          const customList = StorageEngine.getCustomQuizzes();
          for (const cq of customList) {
            appendWords(cq.words || [], cq.subject);
          }
        } else {
          const targetSections =
            scope === 'all'
              ? QUESTION_BANKS
              : QUESTION_BANKS.filter((s) => s.subjectCode === scope);

          // Load manifest once to skip redundant sub-topic JSON files whose keys are 100% covered by _all.json
          let manifestFiles = manifestFilesCacheRef.current;
          if (!manifestFiles) {
            try {
              const mRes = await fetch('/data/index.json');
              if (mRes.ok) {
                const mData = await mRes.json();
                if (mData?.files && typeof mData.files === 'object') {
                  manifestFiles = mData.files as Record<string, { keys?: string[] }>;
                  manifestFilesCacheRef.current = manifestFiles;
                }
              }
            } catch {
              // Ignore manifest load errors and fall back to fetching section files
            }
          }

          const candidateQuizzes = targetSections
            .flatMap((sec) =>
              sec.quizzes.map((q) => ({
                filePath: q.file_path,
                subject: q.subject || sec.subjectCode,
                wordCount: q.wordCount || 0,
                isAll: q.file_path.includes('_all.json'),
              }))
            )
            .sort((a, b) => {
              if (a.isAll !== b.isAll) return a.isAll ? -1 : 1;
              return b.wordCount - a.wordCount;
            });

          const coveredKeys = new Set<string>();
          const quizzesToFetch: Array<{ filePath: string; subject: string }> = [];

          for (const item of candidateQuizzes) {
            const entryKeys = manifestFiles?.[item.filePath]?.keys;
            if (Array.isArray(entryKeys) && entryKeys.length > 0) {
              let hasUncoveredKey = false;
              for (const k of entryKeys) {
                if (!coveredKeys.has(k)) {
                  hasUncoveredKey = true;
                  break;
                }
              }
              if (!hasUncoveredKey) {
                continue;
              }
              for (const k of entryKeys) {
                coveredKeys.add(k);
              }
            }
            quizzesToFetch.push({ filePath: item.filePath, subject: item.subject });
          }

          const fetchTasks = quizzesToFetch.map(async (q) => {
            try {
              const res = await fetch(q.filePath);
              if (!res.ok) return null;
              const data = (await res.json()) as Word[];
              return { data, subject: q.subject };
            } catch {
              return null;
            }
          });

          const results = await Promise.all(fetchTasks);
          for (const res of results) {
            if (res && Array.isArray(res.data)) {
              appendWords(res.data, res.subject);
            }
          }

          if (scope === 'all') {
            for (const cq of StorageEngine.getCustomQuizzes()) {
              appendWords(cq.words || [], cq.subject);
            }
          }
        }

        const merged = Array.from(deduped.values());
        scopeCacheRef.current.set(scope, merged);
        if (!cancelled) {
          setScopedWords(merged);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingScope(false);
        }
      }
    };

    loadScopeData();
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const activeWordPool = scope === 'current' ? words : scopedWords;
  const quizInfo = getQuizDisplayName(selectedQuizPath, activeCustomQuiz, words);

  // Collect unique topics in active scope
  const topics = useMemo(
    () => Array.from(new Set(activeWordPool.map((w) => w.topic).filter(Boolean))),
    [activeWordPool]
  );

  const filteredWords = useMemo(() => {
    const term = deferredSearchTerm.trim().toLowerCase();
    return activeWordPool.filter((w) => {
      if (term) {
        const matchSearch =
          (w.question && w.question.toLowerCase().includes(term)) ||
          w.word.toLowerCase().includes(term) ||
          (w.subject && w.subject.toLowerCase().includes(term)) ||
          (w.topic && w.topic.toLowerCase().includes(term)) ||
          (w.vi && w.vi.toLowerCase().includes(term)) ||
          (w.explanation && w.explanation.toLowerCase().includes(term)) ||
          (w.options && w.options.some((opt) => opt.toLowerCase().includes(term)));
        if (!matchSearch) return false;
      }

      if (filterTopic !== 'all' && w.topic !== filterTopic) return false;

      if (filterStatus !== 'all') {
        if (filterStatus === 'bookmarked') {
          const qId = String(w.id || getQuestionKey(w));
          if (!bookmarks.includes(qId) && !(w.id && bookmarks.includes(w.id))) {
            return false;
          }
        } else {
          const prog = StorageEngine.getItemProgress(w, progressMap);
          if (filterStatus === 'mastered') return prog?.status === 'mastered';
          if (filterStatus === 'learning') return prog?.status === 'learning';
          if (filterStatus === 'new') return !prog || prog.status === 'new';
        }
      }

      return true;
    });
  }, [activeWordPool, deferredSearchTerm, filterTopic, filterStatus, progressMap, bookmarks]);

  const visibleWords = useMemo(
    () => filteredWords.slice(0, visibleCount),
    [filteredWords, visibleCount]
  );

  const scopeHeading =
    scope === 'current'
      ? 'Tra Cứu Câu Hỏi (Đề hiện tại)'
      : scope === 'all'
      ? 'Ngân Hàng Câu Hỏi Toàn Bộ Các Môn'
      : scope === 'custom'
      ? 'Tra Cứu Câu Hỏi (Bộ Đề Tự Tạo)'
      : `Ngân Hàng Câu Hỏi — Môn ${scope}`;

  return (
    <div className="w-full px-3.5 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-5 md:py-10 pb-28 md:pb-12 space-y-5 sm:space-y-6 animate-fade-in">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 flex-wrap">
          <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-500 shrink-0" />
          <span>
            {scopeHeading} ({filteredWords.length}/{activeWordPool.length})
          </span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {scope === 'current'
            ? `Đang hiển thị đề: ${quizInfo.title}. Chuyển sang "Tất cả các môn" hoặc chọn từng môn bên dưới để tìm xuyên toàn bộ kho đề.`
            : 'Tra cứu câu hỏi trắc nghiệm, các lựa chọn A/B/C/D, đáp án chính xác và giải thích chi tiết.'}
        </p>
      </div>

      {/* Scope Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 shrink-0">
          <Layers className="w-3.5 h-3.5" /> Phạm vi:
        </span>
        <button
          type="button"
          onClick={() => setScope('current')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
            scope === 'current'
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
              : 'glass-surface text-slate-700 dark:text-slate-300 hover:border-indigo-400'
          }`}
        >
          Đề hiện tại
        </button>
        <button
          type="button"
          onClick={() => setScope('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
            scope === 'all'
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
              : 'glass-surface text-slate-700 dark:text-slate-300 hover:border-indigo-400'
          }`}
        >
          Tất cả các môn
        </button>
        {QUESTION_BANKS.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => setScope(sec.subjectCode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
              scope === sec.subjectCode
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                : 'glass-surface text-slate-700 dark:text-slate-300 hover:border-indigo-400'
            }`}
          >
            {sec.subjectCode}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setScope('custom')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
            scope === 'custom'
              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
              : 'glass-surface text-slate-700 dark:text-slate-300 hover:border-indigo-400'
          }`}
        >
          Đề tự tạo
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo nội dung câu hỏi, từ khoá, đáp án, code C/Python hoặc giải thích..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl glass-surface text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        {/* Filter Badges: Status & Topics */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filters */}
          <div className="flex items-center gap-1 p-1 rounded-2xl glass-surface shadow-sm overflow-x-auto">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'mastered', label: 'Đã thuộc' },
              { id: 'learning', label: 'Đang ôn' },
              { id: 'new', label: 'Chưa làm' },
              { id: 'bookmarked', label: `Đã ghim 🔖 (${bookmarks.length})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterStatus(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
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
              className="px-3.5 py-2 rounded-2xl glass-surface text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 [&>option]:bg-white dark:[&>option]:bg-slate-900"
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

      {/* Loading or Empty State */}
      {isLoadingScope ? (
        <div className="text-center py-20 space-y-3 text-slate-500 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-sm font-semibold">Đang tải ngân hàng câu hỏi...</p>
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="text-center py-20 text-slate-500 dark:text-slate-400">
          Không tìm thấy câu hỏi nào khớp với từ khoá hoặc bộ lọc của bạn.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {visibleWords.map((w, idx) => {
              const prog = StorageEngine.getItemProgress(w, progressMap);
              const strengthPercent = prog?.strength ? Math.round(prog.strength * 100) : 0;
              const isMastered = prog?.status === 'mastered';
              const isMCQ = Boolean(w.question && w.options);
              const qKey = String(w.id || getQuestionKey(w));
              const isFlagged = bookmarks.includes(qKey) || (w.id ? bookmarks.includes(w.id) : false);

              return (
                <div
                  key={`${getQuestionKey(w)}_${idx}`}
                  onClick={() => setSelectedWord(w)}
                  className="group p-5 rounded-3xl glass-surface hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.18)] cursor-pointer content-auto-card gpu-card flex flex-col justify-between touch-manipulation active:scale-[0.99]"
                >
                  <div>
                    {/* Top tags */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 truncate max-w-[65%]">
                        {w.subject ? `${w.subject} • ` : ''}
                        {w.topic || 'Câu ' + (idx + 1)}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            StorageEngine.toggleBookmark(qKey);
                          }}
                          className={`p-1 rounded-lg border transition-colors cursor-pointer ${
                            isFlagged
                              ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
                              : 'text-slate-400 hover:text-amber-500 border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                          title={isFlagged ? 'Bỏ ghim' : 'Ghim câu hỏi'}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isFlagged ? 'fill-current' : ''}`} />
                        </button>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isMastered
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : prog?.seenCount
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {strengthPercent}% Thuộc
                        </span>
                      </div>
                    </div>

                    {/* Question text */}
                    <h3 className="font-reading text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-3 mb-3">
                      {w.question || w.word}
                    </h3>

                    {/* Options Preview */}
                    {isMCQ && w.options && (
                      <div className="space-y-1 mb-3">
                        {w.options.slice(0, 6).map((opt, i) => {
                          const isCorrect = isAnswerMatch(opt, w.correctWord, w.answer);

                          return (
                            <div
                              key={i}
                              className={`px-2.5 py-1.5 rounded-xl text-xs flex items-start justify-between gap-1.5 ${
                                isCorrect
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <OptionContent content={opt} className="line-clamp-2" />
                              </div>
                              {isCorrect && (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase ml-2 shrink-0 mt-0.5">
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
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/70 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
                    <span className="truncate max-w-[60%]">
                      Đáp án:{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {w.answer || w.correctWord}
                      </strong>
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 shrink-0">
                      Xem giải thích <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {visibleCount < filteredWords.length && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 36)}
                className="px-6 py-3 rounded-2xl glass-surface hover:border-cyan-400/50 text-xs sm:text-sm font-bold text-indigo-600 dark:text-cyan-300 transition-colors cursor-pointer"
              >
                Xem thêm câu hỏi ({filteredWords.length - visibleCount} câu còn lại)
              </button>
            </div>
          )}
        </>
      )}

      {/* Word / Question Detail Modal */}
      <WordModal word={selectedWord} onClose={() => setSelectedWord(null)} />
    </div>
  );
}
