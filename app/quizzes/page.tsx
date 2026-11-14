'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useQuizStore } from '@/lib/quizStore';
import { StorageEngine } from '@/lib/storage';
import { CustomQuiz, CustomSubject, Word, WordProgress } from '@/lib/types';
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

export default function QuizzesPage() {
  const router = useRouter();
  const { selectedQuizPath, setSelectedQuizPath, activeCustomQuiz, setActiveCustomQuiz } =
    useQuizStore();
  const [activeSubjectTab, setActiveSubjectTab] = useState<string>('all');
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

  const isAll = activeSubjectTab === 'all';
  const filteredDefaultSections = isAll
    ? QUESTION_BANKS
    : QUESTION_BANKS.filter((s) => s.id === activeSubjectTab);

  const filteredCustomSubjects = isAll
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
  const unassignedCustomQuizzes = customQuizzes.filter(
    (q) => !q.subject || !knownCodes.has(q.subject)
  );

  const renderCustomQuizCard = (quiz: CustomQuiz) => {
    const isSelected = activeCustomQuiz?.id === quiz.id;
    const stat = computeWordsStat(quiz.words || [], progressMap);
    const pct = stat.total > 0 ? Math.round((stat.mastered / stat.total) * 100) : 0;

    return (
      <div
        key={quiz.id}
        onClick={() => handleSelectCustomQuiz(quiz)}
        className={`p-5 rounded-3xl border cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between group ${
          isSelected
            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-glow'
            : 'story-glass hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.18)]'
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                {quiz.subject || 'Tự tạo'}
              </span>
              {quiz.topic && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {quiz.topic}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {isSelected ? (
                <span className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2.5 py-0.5 rounded-full">
                  <Check className="w-3 h-3" /> Đang Học
                </span>
              ) : null}
              <button
                onClick={(e) => handleDeleteCustomQuiz(quiz.id, e)}
                title="Xóa bộ đề"
                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 group-hover:text-indigo-500 transition-colors line-clamp-1">
            {quiz.name}
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3.5">
            {quiz.description ||
              `Được tạo lúc ${new Date(quiz.created_at).toLocaleDateString('vi-VN')}`}
          </p>
        </div>

        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          {/* Mini Progress Row */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-indigo-600 dark:text-indigo-400">
                {quiz.words.length} Câu hỏi
              </span>
              <span
                className={
                  pct === 100
                    ? 'text-emerald-500'
                    : stat.seen > 0
                    ? 'text-slate-600 dark:text-slate-300'
                    : 'text-slate-400'
                }
              >
                {stat.seen > 0 ? `Đã thuộc ${stat.mastered}/${stat.total} (${pct}%)` : 'Chưa học'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.max(pct, stat.seen > 0 ? 5 : 0)}%` }}
              />
            </div>
          </div>

          {/* 3 Direct Study Mode Buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={(e) => handleStartLearnCustom(quiz, e)}
              title="Học Thẻ Lật 3D & Cày Phản Xạ 0.4s"
              className="px-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
            >
              <Zap className="w-3 h-3 fill-white shrink-0" />
              <span className="truncate">Phản xạ</span>
            </button>
            <button
              onClick={(e) => handleStartDrillCustom(quiz, e)}
              title="Luyện Theo Chặng (Câu 1-20, 21-40...) & Giải Thích Sâu"
              className="px-2 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <ListChecks className="w-3 h-3 shrink-0" />
              <span className="truncate">Chia chặng</span>
            </button>
            <button
              onClick={(e) => handleStartExamCustom(quiz, e)}
              title="Thi thử bấm giờ"
              className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Play className="w-3 h-3 shrink-0" />
              <span className="truncate">Thi thử</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full px-3.5 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-5 md:py-10 pb-28 md:pb-12 space-y-6 sm:space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5 sm:gap-3">
            <Layers className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-500 shrink-0" />
            <span>Ngân Hàng Đề Thi & Chuyên Đề</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
            Vào thẳng chế độ <strong>Phản xạ / Thẻ 3D</strong>, <strong>Chia chặng 20 câu</strong> hoặc <strong>Thi thử</strong> ngay trên từng bộ đề.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => {
              setEditingSubject(null);
              setIsSubjectModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md hover:shadow-indigo-500/20 active:scale-95 touch-manipulation transition-all text-xs sm:text-sm text-center"
            title="Thêm môn học mới theo chương trình của bạn"
          >
            <FolderPlus className="w-4 h-4 shrink-0" />
            <span>Thêm Môn Học</span>
          </button>

          <button
            onClick={() => handleOpenAddQuiz(undefined, 'parser')}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md hover:shadow-emerald-500/20 active:scale-95 touch-manipulation transition-all text-xs sm:text-sm text-center"
            title="Dán nội dung từ Word, PDF, Web để tự động bóc tách thành bộ đề thi"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Nhập Đề Word/Text</span>
          </button>

          <button
            onClick={() => handleOpenAddQuiz(undefined, 'ai')}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white font-bold shadow-glow hover:opacity-95 active:scale-95 touch-manipulation transition-all text-xs sm:text-sm text-center"
          >
            <Sparkles className="w-4 h-4 animate-pulse shrink-0" />
            <span>Tạo Bộ Đề Bằng AI</span>
          </button>
        </div>
      </div>

      {/* Subject Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubjectTab('all')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeSubjectTab === 'all'
              ? 'bg-indigo-600 text-white shadow-glow'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Tất cả môn học
        </button>

        {QUESTION_BANKS.map((sub) => {
          const Icon = sub.icon;
          return (
            <button
              key={sub.id}
              onClick={() => setActiveSubjectTab(sub.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                activeSubjectTab === sub.id
                  ? 'bg-indigo-600 text-white shadow-glow'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.title.split('(')[0].trim()}</span>
            </button>
          );
        })}

        {/* Dynamic Custom Subject Tabs */}
        {customSubjects.map((sub) => {
          const Icon = getSubjectIcon(sub.iconName);
          const tabKey = `custom_${sub.id}`;
          const isSelected = activeSubjectTab === tabKey;
          return (
            <button
              key={sub.id}
              onClick={() => setActiveSubjectTab(tabKey)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-glow'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sub.subjectCode}</span>
            </button>
          );
        })}

        {/* Quick Add Subject Tab Button */}
        <button
          type="button"
          onClick={() => {
            setEditingSubject(null);
            setIsSubjectModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-dashed border-indigo-400/60 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-500 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Môn</span>
        </button>
      </div>

      {/* Render Custom Subject Sections */}
      {filteredCustomSubjects.map((sub) => {
        const Icon = getSubjectIcon(sub.iconName);
        const subjectQuizzes = customQuizzes.filter((q) => q.subject === sub.subjectCode);

        return (
          <div key={sub.id} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-slate-900/30 border border-slate-800/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${sub.color} flex items-center justify-center text-white shadow-lg shrink-0`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {sub.title}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {sub.subjectCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                    {sub.description ||
                      `${subjectQuizzes.length} bộ đề thi và chuyên đề luyện tập.`}
                  </p>
                </div>
              </div>

              {/* Subject Actions */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => handleOpenAddQuiz(sub.subjectCode, 'parser')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  title="Nhập đề trắc nghiệm cho môn học này"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Nhập Đề</span>
                </button>

                <button
                  onClick={() => handleOpenAddQuiz(sub.subjectCode, 'ai')}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                  title="Tạo đề bằng Gemini AI cho môn này"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tạo Bằng AI</span>
                </button>

                <button
                  onClick={(e) => handleEditCustomSubject(sub, e)}
                  title="Chỉnh sửa môn học"
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => handleDeleteCustomSubject(sub, e)}
                  title="Xóa môn học"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quizzes Grid for this Subject */}
            {subjectQuizzes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 md:gap-5">
                {subjectQuizzes.map((quiz) => renderCustomQuizCard(quiz))}
              </div>
            ) : (
              <div className="p-8 rounded-3xl border border-dashed border-slate-700/80 bg-slate-900/20 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-400">
                  Chưa có đề thi nào trong môn {sub.subjectCode} ({sub.title}).
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleOpenAddQuiz(sub.subjectCode, 'parser')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Dán văn bản Word / PDF</span>
                  </button>
                  <button
                    onClick={() => handleOpenAddQuiz(sub.subjectCode, 'ai')}
                    className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Sinh đề tự động bằng AI</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Render Default Subject Sections */}
      <div className="space-y-10">
        {filteredDefaultSections.map((section) => {
          const SectionIcon = section.icon;
          const matchingCustomQuizzes = customQuizzes.filter(
            (q) => q.subject === section.subjectCode
          );

          return (
            <div key={section.id} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${section.color} flex items-center justify-center text-white shadow-md`}
                  >
                    <SectionIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                      {section.title}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {section.quizzes.length + matchingCustomQuizzes.length} Bộ đề thi & chuyên đề
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAddQuiz(section.subjectCode, 'parser')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                    title={`Thêm đề thi cho môn ${section.subjectCode}`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Thêm Đề</span>
                  </button>
                </div>
              </div>

              {/* Grid of Quizzes in this Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 md:gap-5">
                {/* User-created quizzes for this default subject */}
                {matchingCustomQuizzes.map((quiz) => renderCustomQuizCard(quiz))}

                {/* Built-in Official Quizzes */}
                {section.quizzes.map((quiz) => {
                  const isSelected =
                    !activeCustomQuiz && selectedQuizPath === quiz.file_path;
                  const stat = builtInStats[quiz.file_path];
                  const totalQ = stat?.total || quiz.wordCount || 1;
                  const masteredQ = stat?.mastered || 0;
                  const seenQ = stat?.seen || 0;
                  const pct = Math.round((masteredQ / totalQ) * 100);

                  return (
                    <div
                      key={quiz.id}
                      onClick={() => handleSelectQuiz(quiz.file_path)}
                      className={`p-5 rounded-3xl border cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-glow'
                          : 'story-glass hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.18)]'
                      }`}
                    >
                      <div>
                        {/* Header Tags */}
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {quiz.tags?.map((t, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2.5 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> Đang Học
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {quiz.name}
                        </h3>

                        {/* Description */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3.5">
                          {quiz.description}
                        </p>
                      </div>

                      {/* Footer Actions + Mastery Progress */}
                      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-indigo-500 dark:text-indigo-400">
                              {quiz.wordCount ? `${quiz.wordCount} Câu hỏi` : 'Đầy đủ'}
                            </span>
                            <span
                              className={
                                pct === 100
                                  ? 'text-emerald-500'
                                  : seenQ > 0
                                  ? 'text-slate-600 dark:text-slate-300'
                                  : 'text-slate-400'
                              }
                            >
                              {seenQ > 0
                                ? `Đã thuộc ${masteredQ}/${totalQ} (${pct}%)`
                                : 'Chưa học'}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                              }`}
                              style={{ width: `${Math.max(pct, seenQ > 0 ? 5 : 0)}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={(e) => handleStartLearn(quiz.file_path, e)}
                            title="Vào thẳng Thẻ Lật 3D & Cày Phản Xạ 0.4s"
                            className="px-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Zap className="w-3 h-3 fill-white shrink-0" />
                            <span className="truncate">Phản xạ</span>
                          </button>
                          <button
                            onClick={(e) => handleStartDrill(quiz.file_path, e)}
                            title="Luyện Theo Chặng (Câu 1-20, 21-40...) & Giải Thích Sâu"
                            className="px-2 py-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <ListChecks className="w-3 h-3 shrink-0" />
                            <span className="truncate">Chia chặng</span>
                          </button>
                          <button
                            onClick={(e) => handleStartExam(quiz.file_path, e)}
                            title="Thi thử bấm giờ"
                            className="px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Play className="w-3 h-3 shrink-0" />
                            <span className="truncate">Thi thử</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unassigned / Other Custom Quizzes (if any exist) */}
      {isAll && unassignedCustomQuizzes.length > 0 && (
        <div className="space-y-4 p-6 rounded-3xl bg-slate-900/40 dark:bg-slate-900/60 border border-slate-700/60 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-600 to-slate-800 flex items-center justify-center text-white shadow-md">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Bộ Đề Tự Tạo Khác
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 font-extrabold">
                    {unassignedCustomQuizzes.length} đề
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Các bộ đề chưa gán theo môn học hoặc môn học khác.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenAddQuiz(undefined, 'parser')}
              className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nhập thêm đề</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 md:gap-5 pt-2">
            {unassignedCustomQuizzes.map((quiz) => renderCustomQuizCard(quiz))}
          </div>
        </div>
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
