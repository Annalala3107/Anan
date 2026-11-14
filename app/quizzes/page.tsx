'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  BookOpen,
  Play,
  Check,
  Trash2,
  Layers,
  FileText,
  FolderPlus,
  Plus,
  Pencil,
  Zap,
  ListChecks,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Award,
  Filter,
} from 'lucide-react';
import { useQuizStore } from '@/lib/quizStore';
import { StorageEngine } from '@/lib/storage';
import { CustomQuiz, CustomSubject, QuizSet, Word, WordProgress } from '@/lib/types';
import AIPromptModal from '@/components/ai/AIPromptModal';
import QuickTextParserModal from '@/components/QuickTextParserModal';
import CustomSubjectModal, { SUBJECT_ICONS } from '@/components/CustomSubjectModal';
import { QUESTION_BANKS } from '@/lib/defaultBanks';

const getSubjectIcon = (iconName?: string) => {
  const item = SUBJECT_ICONS.find((i) => i.name === iconName);
  return item ? item.Icon : BookOpen;
};

interface QuizMasteryStat {
  mastered: number;
  seen: number;
  total: number;
}

type StatusFilterKey = 'all' | 'in_progress' | 'unstarted' | 'mastered' | 'custom';

function computeWordsStat(
  words: Word[],
  progressMap: Record<string, WordProgress>
): QuizMasteryStat {
  let mastered = 0;
  let seen = 0;
  for (const w of words) {
    const p = StorageEngine.getItemProgress(w, progressMap);
    if (p?.status === 'mastered') {
      mastered++;
      seen++;
    } else if (p && p.seenCount > 0) {
      seen++;
    }
  }
  return { mastered, seen, total: words.length };
}

interface UnifiedCardData {
  key: string;
  title: string;
  description: string;
  tags: string[];
  isSelected: boolean;
  isFullExam: boolean;
  isCustom: boolean;
  stat: QuizMasteryStat;
  onSelect: () => void;
  onStartLearn: (e: React.MouseEvent) => void;
  onStartDrill: (e: React.MouseEvent) => void;
  onStartExam: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export default function QuizzesPage() {
  const router = useRouter();
  const { selectedQuizPath, setSelectedQuizPath, activeCustomQuiz, setActiveCustomQuiz } =
    useQuizStore();

  const [activeSubjectTab, setActiveSubjectTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const [customQuizzes, setCustomQuizzes] = useState<CustomQuiz[]>([]);
  const [customSubjects, setCustomSubjects] = useState<CustomSubject[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, WordProgress>>({});
  const [builtInStats, setBuiltInStats] = useState<Record<string, QuizMasteryStat>>({});

  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isTextParserOpen, setIsTextParserOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<CustomSubject | null>(null);
  const [modalDefaultSubject, setModalDefaultSubject] = useState<string | undefined>(undefined);

  const refreshData = () => {
    setCustomQuizzes(StorageEngine.getCustomQuizzes());
    setCustomSubjects(StorageEngine.getCustomSubjects());
    setProgressMap(StorageEngine.getWordProgress());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Compute mastery progress for built-in quizzes asynchronously
  useEffect(() => {
    if (Object.keys(progressMap).length === 0) return;
    let cancelled = false;

    const allPaths = QUESTION_BANKS.flatMap((sec) => sec.quizzes.map((q) => q.file_path));

    Promise.all(
      allPaths.map(async (path) => {
        try {
          const res = await fetch(path);
          if (!res.ok) return null;
          const data: Word[] = await res.json();
          return [path, computeWordsStat(data, progressMap)] as const;
        } catch {
          return null;
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      const map: Record<string, QuizMasteryStat> = {};
      for (const entry of entries) {
        if (entry) {
          map[entry[0]] = entry[1];
        }
      }
      setBuiltInStats(map);
    });

    return () => {
      cancelled = true;
    };
  }, [progressMap]);

  const toggleSectionCollapse = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const matchesQuizFilter = (params: {
    name: string;
    description?: string;
    subject?: string;
    topic?: string;
    tags?: string[];
    isCustom: boolean;
    stat: QuizMasteryStat;
  }) => {
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      const haystack = [
        params.name,
        params.description || '',
        params.subject || '',
        params.topic || '',
        ...(params.tags || []),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (statusFilter === 'custom') return params.isCustom;
    if (statusFilter === 'in_progress') {
      return params.stat.seen > 0 && params.stat.mastered < params.stat.total;
    }
    if (statusFilter === 'unstarted') return params.stat.seen === 0;
    if (statusFilter === 'mastered') {
      return params.stat.total > 0 && params.stat.mastered >= params.stat.total;
    }
    return true;
  };

  const handleSelectQuiz = (path: string) => {
    setActiveCustomQuiz(null);
    setSelectedQuizPath(path);
  };

  const handleStartLearn = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCustomQuiz(null);
    setSelectedQuizPath(path);
    router.push('/session/learn');
  };

  const handleStartDrill = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCustomQuiz(null);
    setSelectedQuizPath(path);
    router.push('/session/drill');
  };

  const handleStartExam = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCustomQuiz(null);
    setSelectedQuizPath(path);
    router.push('/session/exam');
  };

  const handleSelectCustomQuiz = (quiz: CustomQuiz) => {
    setActiveCustomQuiz(quiz);
  };

  const handleStartLearnCustom = (quiz: CustomQuiz, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCustomQuiz(quiz);
    router.push('/session/learn');
  };

  const handleStartDrillCustom = (quiz: CustomQuiz, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCustomQuiz(quiz);
    router.push('/session/drill');
  };

  const handleStartExamCustom = (quiz: CustomQuiz, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCustomQuiz(quiz);
    router.push('/session/exam');
  };

  const handleDeleteCustomQuiz = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa bộ đề tự tạo này?')) {
      StorageEngine.deleteCustomQuiz(id);
      refreshData();
      if (activeCustomQuiz?.id === id) {
        setActiveCustomQuiz(null);
      }
    }
  };

  const handleOpenAddQuiz = (subjectCode?: string, mode: 'parser' | 'ai' = 'parser') => {
    setModalDefaultSubject(subjectCode);
    if (mode === 'parser') {
      setIsTextParserOpen(true);
    } else {
      setIsAIModalOpen(true);
    }
  };

  const handleEditCustomSubject = (sub: CustomSubject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubject(sub);
    setIsSubjectModalOpen(true);
  };

  const handleDeleteCustomSubject = (sub: CustomSubject, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm(
        `Bạn có chắc chắn muốn xóa môn học "${sub.title} (${sub.subjectCode})"? Các đề thi thuộc môn này vẫn được bảo lưu an toàn.`
      )
    ) {
      StorageEngine.deleteCustomSubject(sub.id);
      refreshData();
      if (activeSubjectTab === `custom_${sub.id}`) {
        setActiveSubjectTab('all');
      }
    }
  };

  const getBuiltInStat = (quiz: QuizSet): QuizMasteryStat => {
    const stat = builtInStats[quiz.file_path];
    return {
      mastered: stat?.mastered || 0,
      seen: stat?.seen || 0,
      total: stat?.total || quiz.wordCount || 1,
    };
  };

  const totalBuiltInQuizzes = useMemo(
    () => QUESTION_BANKS.reduce((acc, sec) => acc + sec.quizzes.length, 0),
    []
  );

  const totalQuestionsCount = useMemo(() => {
    const builtInSum = QUESTION_BANKS.reduce(
      (acc, sec) => acc + sec.quizzes.reduce((qAcc, q) => qAcc + (q.wordCount || 0), 0),
      0
    );
    const customSum = customQuizzes.reduce((acc, q) => acc + (q.words?.length || 0), 0);
    return builtInSum + customSum;
  }, [customQuizzes]);

  const isAllSubjects = activeSubjectTab === 'all';
  const hasActiveFilter = searchQuery.trim() !== '' || statusFilter !== 'all';

  const filteredDefaultSections = isAllSubjects
    ? QUESTION_BANKS
    : QUESTION_BANKS.filter((s) => s.id === activeSubjectTab);

  const filteredCustomSubjects = isAllSubjects
    ? customSubjects
    : customSubjects.filter((s) => `custom_${s.id}` === activeSubjectTab);

  const knownCodes = new Set([
    'CEA201',
    'CSI106',
    'SSA101',
    'PRF192',
    'PFP191',
    ...customSubjects.map((s) => s.subjectCode),
  ]);
  const unassignedCustomQuizzes = customQuizzes.filter((q) => {
    if (q.subject && knownCodes.has(q.subject)) return false;
    const stat = computeWordsStat(q.words || [], progressMap);
    return matchesQuizFilter({
      name: q.name,
      description: q.description,
      subject: q.subject,
      topic: q.topic,
      tags: ['Tự tạo'],
      isCustom: true,
      stat,
    });
  });

  // Compute total matching cards across currently selected scope
  const visibleMatchCount = useMemo(() => {
    let count = 0;
    for (const sub of filteredCustomSubjects) {
      const subQuizzes = customQuizzes.filter((q) => q.subject === sub.subjectCode);
      for (const q of subQuizzes) {
        const stat = computeWordsStat(q.words || [], progressMap);
        if (
          matchesQuizFilter({
            name: q.name,
            description: q.description,
            subject: q.subject,
            topic: q.topic,
            tags: ['Tự tạo'],
            isCustom: true,
            stat,
          })
        ) {
          count++;
        }
      }
    }
    for (const sec of filteredDefaultSections) {
      const matchingCustom = customQuizzes.filter((q) => q.subject === sec.subjectCode);
      for (const q of matchingCustom) {
        const stat = computeWordsStat(q.words || [], progressMap);
        if (
          matchesQuizFilter({
            name: q.name,
            description: q.description,
            subject: q.subject,
            topic: q.topic,
            tags: ['Tự tạo'],
            isCustom: true,
            stat,
          })
        ) {
          count++;
        }
      }
      for (const q of sec.quizzes) {
        const stat = getBuiltInStat(q);
        if (
          matchesQuizFilter({
            name: q.name,
            description: q.description,
            subject: q.subject,
            topic: q.topic,
            tags: q.tags,
            isCustom: false,
            stat,
          })
        ) {
          count++;
        }
      }
    }
    if (isAllSubjects) {
      count += unassignedCustomQuizzes.length;
    }
    return count;
  }, [
    filteredCustomSubjects,
    filteredDefaultSections,
    customQuizzes,
    progressMap,
    builtInStats,
    searchQuery,
    statusFilter,
    isAllSubjects,
    unassignedCustomQuizzes.length,
  ]);

  const toCustomCardData = (quiz: CustomQuiz): UnifiedCardData => {
    const stat = computeWordsStat(quiz.words || [], progressMap);
    const isSelected = activeCustomQuiz?.id === quiz.id;
    const rawTags = [quiz.subject || 'Tự tạo', quiz.topic || 'Bộ đề cá nhân'].filter(Boolean);
    return {
      key: quiz.id,
      title: quiz.name,
      description:
        quiz.description ||
        `Được tạo lúc ${new Date(quiz.created_at).toLocaleDateString('vi-VN')}`,
      tags: rawTags.slice(0, 2),
      isSelected,
      isFullExam: stat.total >= 150,
      isCustom: true,
      stat,
      onSelect: () => handleSelectCustomQuiz(quiz),
      onStartLearn: (e) => handleStartLearnCustom(quiz, e),
      onStartDrill: (e) => handleStartDrillCustom(quiz, e),
      onStartExam: (e) => handleStartExamCustom(quiz, e),
      onDelete: (e) => handleDeleteCustomQuiz(quiz.id, e),
    };
  };

  const toBuiltInCardData = (quiz: QuizSet): UnifiedCardData => {
    const stat = getBuiltInStat(quiz);
    const isSelected = !activeCustomQuiz && selectedQuizPath === quiz.file_path;
    const isFullExam =
      quiz.id.endsWith('_all') ||
      (quiz.wordCount || 0) >= 150 ||
      Boolean(quiz.tags?.some((t) => t.toLowerCase().includes('full exam')));

    const filteredTags = (quiz.tags || []).filter(
      (t) => !(isFullExam && t.toLowerCase() === 'full exam')
    );

    return {
      key: quiz.id,
      title: quiz.name,
      description: quiz.description,
      tags: filteredTags.slice(0, 2),
      isSelected,
      isFullExam,
      isCustom: false,
      stat,
      onSelect: () => handleSelectQuiz(quiz.file_path),
      onStartLearn: (e) => handleStartLearn(quiz.file_path, e),
      onStartDrill: (e) => handleStartDrill(quiz.file_path, e),
      onStartExam: (e) => handleStartExam(quiz.file_path, e),
    };
  };

  const renderQuizCard = (card: UnifiedCardData) => {
    const pct =
      card.stat.total > 0 ? Math.min(100, Math.round((card.stat.mastered / card.stat.total) * 100)) : 0;

    return (
      <div
        key={card.key}
        onClick={card.onSelect}
        className={`p-5 rounded-3xl border cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between group gpu-card ${
          card.isSelected
            ? 'bg-indigo-50/90 dark:bg-indigo-950/55 border-indigo-500 shadow-glow'
            : card.isFullExam
            ? 'story-glass border-indigo-300/70 dark:border-indigo-500/35 hover:border-indigo-400 dark:hover:border-sky-400/60 hover:shadow-[0_0_28px_rgba(99,102,241,0.18)]'
            : 'story-glass hover:border-indigo-400/60 dark:hover:border-cyan-400/50 hover:shadow-[0_0_28px_rgba(56,189,248,0.15)]'
        }`}
      >
        {card.isFullExam && (
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />
        )}

        <div>
          {/* Card Header Tags */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              {card.isFullExam && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 whitespace-nowrap">
                  <Award className="w-3.5 h-3.5 shrink-0" />
                  Đề Tổng Hợp
                </span>
              )}
              {card.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70 truncate max-w-[140px]"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {card.isSelected && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-300/60 dark:border-indigo-700/60 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  Đang Học
                </span>
              )}
              {card.onDelete && (
                <button
                  type="button"
                  onClick={card.onDelete}
                  title="Xóa bộ đề tự tạo"
                  aria-label="Xóa bộ đề tự tạo"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-2">
            {card.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-600 dark:text-slate-300/90 line-clamp-2 leading-relaxed mb-4">
            {card.description}
          </p>
        </div>

        {/* Footer Progress + 2-Tier Action Buttons */}
        <div className="space-y-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
          {/* Progress Row */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs font-bold">
              <span className="text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                {card.stat.total} Câu hỏi
              </span>
              <span
                className={
                  pct === 100
                    ? 'text-emerald-600 dark:text-emerald-400 whitespace-nowrap'
                    : card.stat.seen > 0
                    ? 'text-slate-700 dark:text-slate-200 whitespace-nowrap'
                    : 'text-slate-500 dark:text-slate-400 whitespace-nowrap'
                }
              >
                {card.stat.seen > 0
                  ? `Đã thuộc ${card.stat.mastered}/${card.stat.total} (${pct}%)`
                  : 'Chưa học'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.max(pct, card.stat.seen > 0 ? 5 : 0)}%` }}
              />
            </div>
          </div>

          {/* 2-Tier Clear Action Buttons (No Truncation) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={card.onStartLearn}
              title="Vào thẳng Thẻ Lật 3D & Cày Phản Xạ 0.4s"
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer active:scale-[0.99]"
            >
              <Zap className="w-3.5 h-3.5 fill-white shrink-0" />
              <span>Học Phản Xạ &amp; Thẻ 3D</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={card.onStartDrill}
                title="Luyện Theo Chặng (Câu 1-20, 21-40...) & Giải Thích Sâu"
                className="py-2 px-2.5 rounded-xl bg-emerald-500/12 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <ListChecks className="w-3.5 h-3.5 shrink-0" />
                <span>Chia chặng</span>
              </button>

              <button
                type="button"
                onClick={card.onStartExam}
                title="Thi thử bấm giờ như đề thật"
                className="py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 shrink-0" />
                <span>Thi thử</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const statusChips: Array<{ key: StatusFilterKey; label: string }> = [
    { key: 'all', label: 'Tất cả' },
    { key: 'in_progress', label: 'Đang học' },
    { key: 'unstarted', label: 'Chưa học' },
    { key: 'mastered', label: 'Đã thuộc 100%' },
    { key: 'custom', label: 'Đề tự tạo' },
  ];

  return (
    <div className="w-full max-w-full overflow-x-clip px-3.5 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-5 md:py-9 pb-32 md:pb-24 space-y-6 animate-fade-in">
      {/* Top Banner + Compact Action Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5 sm:gap-3">
            <Layers className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-500 shrink-0" />
            <span>Ngân Hàng Đề Thi &amp; Chuyên Đề</span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            <span>Chọn bộ đề để vào thẳng Phản xạ, Chia chặng 20 câu hoặc Thi thử.</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 whitespace-nowrap">
                {QUESTION_BANKS.length + customSubjects.length} môn học
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 whitespace-nowrap">
                {totalBuiltInQuizzes + customQuizzes.length} bộ đề
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 whitespace-nowrap">
                {totalQuestionsCount.toLocaleString('vi-VN')}+ câu hỏi
              </span>
            </div>
          </div>
        </div>

        {/* Refined Creation Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditingSubject(null);
              setIsSubjectModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm whitespace-nowrap transition-all shadow-sm cursor-pointer active:scale-95"
            title="Thêm môn học mới theo chương trình của bạn"
          >
            <FolderPlus className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Thêm Môn</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddQuiz(undefined, 'parser')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer active:scale-95"
            title="Dán nội dung từ Word, PDF, Web để tự động bóc tách thành bộ đề thi"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Nhập Đề Word/Text</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddQuiz(undefined, 'ai')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm whitespace-nowrap shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Tạo Bộ Đề AI</span>
          </button>
        </div>
      </div>

      {/* Unified Search + Status Filter + Compact Subject Pill Bar */}
      <div className="story-glass rounded-2xl p-3.5 sm:p-4 space-y-3">
        {/* Search Input + Status Filter Chips */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh theo tên đề, mã môn hoặc chủ đề (VD: Cache, PFP191, Con trỏ...)"
              aria-label="Tìm kiếm đề thi và chuyên đề"
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                title="Xóa từ khóa"
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              Lọc:
            </span>
            {statusChips.map((chip) => {
              const active = statusFilter === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setStatusFilter(chip.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
                    active
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                      : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Compact Subject Filter Pills (All subjects fit cleanly at 1280px) */}
        <div className="relative">
          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1 border-t border-slate-200/70 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveSubjectTab('all')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
                activeSubjectTab === 'all'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-glow'
                  : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span>Tất cả</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-xs font-mono ${
                  activeSubjectTab === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300'
                }`}
              >
                {totalBuiltInQuizzes + customQuizzes.length}
              </span>
            </button>

            {QUESTION_BANKS.map((sub) => {
              const Icon = sub.icon;
              const customCount = customQuizzes.filter((q) => q.subject === sub.subjectCode).length;
              const totalCount = sub.quizzes.length + customCount;
              const active = activeSubjectTab === sub.id;

              return (
                <button
                  key={sub.id}
                  type="button"
                  title={sub.title}
                  onClick={() => setActiveSubjectTab(sub.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
                    active
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-glow'
                      : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{sub.subjectCode}</span>
                  <span className="hidden 2xl:inline text-xs font-medium opacity-80 truncate max-w-[140px]">
                    · {sub.title.split('(')[0].trim()}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-xs font-mono ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {totalCount}
                  </span>
                </button>
              );
            })}

            {customSubjects.map((sub) => {
              const Icon = getSubjectIcon(sub.iconName);
              const tabKey = `custom_${sub.id}`;
              const active = activeSubjectTab === tabKey;
              const subCount = customQuizzes.filter((q) => q.subject === sub.subjectCode).length;

              return (
                <button
                  key={sub.id}
                  type="button"
                  title={sub.title}
                  onClick={() => setActiveSubjectTab(tabKey)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
                    active
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-glow'
                      : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{sub.subjectCode}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-xs font-mono ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {subCount}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setEditingSubject(null);
                setIsSubjectModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap border border-dashed border-indigo-400/70 dark:border-indigo-500/50 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Thêm Môn</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Empty Filter State */}
      {hasActiveFilter && visibleMatchCount === 0 && (
        <div className="story-glass rounded-3xl p-8 text-center space-y-3">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Không tìm thấy bộ đề nào khớp với bộ lọc hiện tại.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Thử đổi từ khóa tìm kiếm hoặc chọn lại trạng thái Tất cả.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setActiveSubjectTab('all');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Xóa toàn bộ bộ lọc</span>
          </button>
        </div>
      )}

      {/* Render Custom Subject Sections */}
      {filteredCustomSubjects.map((sub) => {
        const Icon = getSubjectIcon(sub.iconName);
        const allSubjectQuizzes = customQuizzes.filter((q) => q.subject === sub.subjectCode);
        const visibleCustomQuizzes = allSubjectQuizzes.filter((quiz) =>
          matchesQuizFilter({
            name: quiz.name,
            description: quiz.description,
            subject: quiz.subject,
            topic: quiz.topic,
            tags: ['Tự tạo'],
            isCustom: true,
            stat: computeWordsStat(quiz.words || [], progressMap),
          })
        );

        if (hasActiveFilter && isAllSubjects && visibleCustomQuizzes.length === 0) {
          return null;
        }

        const sectionKey = `custom_${sub.id}`;
        const isCollapsed = Boolean(collapsedSections[sectionKey]);

        return (
          <section key={sub.id} className="space-y-4">
            <div className="bg-white/85 dark:bg-slate-900/55 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                aria-expanded={!isCollapsed}
                onClick={() => toggleSectionCollapse(sectionKey)}
                className="flex items-center gap-3 text-left min-w-0 cursor-pointer group"
              >
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${sub.color} flex items-center justify-center text-white shadow-md shrink-0`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                      {sub.title}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                      {sub.subjectCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    {sub.description ||
                      `${visibleCustomQuizzes.length} bộ đề thi và chuyên đề luyện tập.`}
                  </p>
                </div>
              </button>

              {/* Subject Actions + Collapse Toggle */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenAddQuiz(sub.subjectCode, 'parser')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  title="Nhập đề trắc nghiệm cho môn học này"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>Nhập Đề</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAddQuiz(sub.subjectCode, 'ai')}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  title="Tạo đề bằng Gemini AI cho môn này"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Tạo Bằng AI</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleEditCustomSubject(sub, e)}
                  title="Chỉnh sửa môn học"
                  aria-label="Chỉnh sửa môn học"
                  className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDeleteCustomSubject(sub, e)}
                  title="Xóa môn học"
                  aria-label="Xóa môn học"
                  className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => toggleSectionCollapse(sectionKey)}
                  title={isCollapsed ? 'Mở rộng danh sách' : 'Thu gọn danh sách'}
                  aria-label={isCollapsed ? 'Mở rộng danh sách' : 'Thu gọn danh sách'}
                  className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {!isCollapsed &&
              (visibleCustomQuizzes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
                  {visibleCustomQuizzes.map((quiz) => renderQuizCard(toCustomCardData(quiz)))}
                </div>
              ) : (
                <div className="p-8 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/35 text-center space-y-3">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {allSubjectQuizzes.length === 0
                      ? `Chưa có đề thi nào trong môn ${sub.subjectCode} (${sub.title}).`
                      : `Không có bộ đề nào trong ${sub.subjectCode} khớp bộ lọc hiện tại.`}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenAddQuiz(sub.subjectCode, 'parser')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Dán văn bản Word / PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAddQuiz(sub.subjectCode, 'ai')}
                      className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Sinh đề tự động bằng AI</span>
                    </button>
                  </div>
                </div>
              ))}
          </section>
        );
      })}

      {/* Render Default Subject Sections */}
      <div className="space-y-6">
        {filteredDefaultSections.map((section) => {
          const SectionIcon = section.icon;
          const matchingCustomQuizzes = customQuizzes.filter(
            (q) => q.subject === section.subjectCode
          );

          const visibleCustomCards = matchingCustomQuizzes
            .filter((quiz) =>
              matchesQuizFilter({
                name: quiz.name,
                description: quiz.description,
                subject: quiz.subject,
                topic: quiz.topic,
                tags: ['Tự tạo'],
                isCustom: true,
                stat: computeWordsStat(quiz.words || [], progressMap),
              })
            )
            .map(toCustomCardData);

          const visibleBuiltInCards = section.quizzes
            .filter((quiz) =>
              matchesQuizFilter({
                name: quiz.name,
                description: quiz.description,
                subject: quiz.subject,
                topic: quiz.topic,
                tags: quiz.tags,
                isCustom: false,
                stat: getBuiltInStat(quiz),
              })
            )
            .map(toBuiltInCardData);

          const allVisibleCards = [...visibleCustomCards, ...visibleBuiltInCards];

          if (hasActiveFilter && isAllSubjects && allVisibleCards.length === 0) {
            return null;
          }

          const isCollapsed = Boolean(collapsedSections[section.id]);

          return (
            <section key={section.id} className="space-y-4">
              <div className="bg-white/85 dark:bg-slate-900/55 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  onClick={() => toggleSectionCollapse(section.id)}
                  className="flex items-center gap-3 text-left min-w-0 cursor-pointer group"
                >
                  <div
                    className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${section.color} flex items-center justify-center text-white shadow-md shrink-0`}
                  >
                    <SectionIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                      {section.title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {allVisibleCards.length} bộ đề đang hiển thị · Tổng{' '}
                      {section.quizzes.length + matchingCustomQuizzes.length} bộ đề
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenAddQuiz(section.subjectCode, 'parser')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    title={`Thêm đề thi cho môn ${section.subjectCode}`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>Thêm Đề</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSectionCollapse(section.id)}
                    title={isCollapsed ? 'Mở rộng môn học' : 'Thu gọn môn học'}
                    aria-label={isCollapsed ? 'Mở rộng môn học' : 'Thu gọn môn học'}
                    className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
                  {allVisibleCards.map((card) => renderQuizCard(card))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Unassigned / Other Custom Quizzes */}
      {isAllSubjects && unassignedCustomQuizzes.length > 0 && (
        <section className="space-y-4">
          <div className="bg-white/85 dark:bg-slate-900/55 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-600 to-slate-800 flex items-center justify-center text-white shadow-md shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Bộ Đề Tự Tạo Khác
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                    {unassignedCustomQuizzes.length} đề
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Các bộ đề chưa gán theo môn học hoặc thuộc môn học khác.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAddQuiz(undefined, 'parser')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nhập thêm đề</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
            {unassignedCustomQuizzes.map((quiz) => renderQuizCard(toCustomCardData(quiz)))}
          </div>
        </section>
      )}

      {/* Custom Subject Create/Edit Modal */}
      {isSubjectModalOpen && (
        <CustomSubjectModal
          isOpen={isSubjectModalOpen}
          editingSubject={editingSubject}
          onClose={() => {
            setIsSubjectModalOpen(false);
            setEditingSubject(null);
          }}
          onSubjectSaved={(saved) => {
            refreshData();
            setActiveSubjectTab(`custom_${saved.id}`);
          }}
        />
      )}

      {/* AI Prompt Modal */}
      {isAIModalOpen && (
        <AIPromptModal
          isOpen={isAIModalOpen}
          defaultSubject={modalDefaultSubject}
          onClose={() => {
            setIsAIModalOpen(false);
            setModalDefaultSubject(undefined);
          }}
          onQuizCreated={(quiz) => {
            refreshData();
            setActiveCustomQuiz(quiz);
          }}
        />
      )}

      {/* Quick Text / Word Parser Modal */}
      {isTextParserOpen && (
        <QuickTextParserModal
          isOpen={isTextParserOpen}
          defaultSubject={modalDefaultSubject}
          onClose={() => {
            setIsTextParserOpen(false);
            setModalDefaultSubject(undefined);
          }}
          onQuizCreated={(quiz) => {
            refreshData();
            setActiveCustomQuiz(quiz);
          }}
        />
      )}
    </div>
  );
}
