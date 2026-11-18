'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Brain,
  Dumbbell,
  Award,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Layers,
  Smartphone,
  ArrowRight,
  BookOpen,
  Clock,
} from 'lucide-react';
import { useQuizStore } from '@/lib/quizStore';
import { StorageEngine } from '@/lib/storage';
import { QUESTION_BANKS, getQuizDisplayName } from '@/lib/defaultBanks';
import { WordProgress } from '@/lib/types';
import QrSyncModal from '@/components/QrSyncModal';

export default function Home() {
  const {
    words,
    loadQuizWords,
    hydrateSelection,
    hasHydratedSelection,
    hasExplicitSelection,
    selectedQuizPath,
    setSelectedQuizPath,
    activeCustomQuiz,
  } = useQuizStore();
  const [progressMap, setProgressMap] = useState<Record<string, WordProgress>>({});
  const [showQrSync, setShowQrSync] = useState(false);

  useEffect(() => {
    hydrateSelection();
    setProgressMap(StorageEngine.getWordProgress());

    const refreshProgress = () => setProgressMap(StorageEngine.getWordProgress());
    window.addEventListener('ananquiz:stats-updated', refreshProgress);
    return () => window.removeEventListener('ananquiz:stats-updated', refreshProgress);
  }, [hydrateSelection]);

  useEffect(() => {
    if (!hasHydratedSelection) return;
    if (hasExplicitSelection || activeCustomQuiz) {
      loadQuizWords();
    }
  }, [hasHydratedSelection, hasExplicitSelection, activeCustomQuiz, loadQuizWords]);

  const { totalWords, masteredCount, learningCount, needReviewCount, masteredPercent } =
    useMemo(() => {
      const total = words.length || 1;
      const now = Date.now();
      let mastered = 0;
      let learning = 0;
      let needReview = 0;

      for (let i = 0; i < words.length; i++) {
        const p = StorageEngine.getItemProgress(words[i], progressMap);
        if (!p) continue;
        if (p.status === 'mastered') mastered += 1;
        else if (p.status === 'learning') learning += 1;
        if (p.nextDue <= now && p.seenCount > 0) needReview += 1;
      }

      return {
        totalWords: words.length,
        masteredCount: mastered,
        learningCount: learning,
        needReviewCount: needReview,
        masteredPercent: words.length > 0 ? Math.round((mastered / total) * 100) : 0,
      };
    }, [words, progressMap]);

  const quizInfo = getQuizDisplayName(selectedQuizPath, activeCustomQuiz, words);
  const showOnboardingPicker =
    hasHydratedSelection && !hasExplicitSelection && !activeCustomQuiz;

  return (
    <div className="w-full px-3.5 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-5 md:py-10 pb-28 md:pb-12 space-y-6 sm:space-y-8 animate-fade-in">
      {showOnboardingPicker ? (
        /* First-Visit 5-Subject Onboarding Quick Picker */
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-8 glass-elevated bg-gradient-to-br from-indigo-50/95 via-white/90 to-cyan-50/90 dark:from-indigo-950/60 dark:via-slate-900/65 dark:to-purple-950/45 border border-indigo-200/80 dark:border-indigo-400/30 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 dark:bg-white/10 text-indigo-700 dark:text-indigo-200 border border-indigo-300/60 dark:border-white/10">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Chào mừng đến với AnanQuiz</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                Chọn môn học bạn muốn ôn thi ngay
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Bấm chọn nhanh một trong {QUESTION_BANKS.length} học phần bên dưới để kích hoạt bộ câu hỏi chính thức, hoặc vào Kho Đề để tạo đề riêng bằng AI.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowQrSync(true)}
                className="text-xs font-bold py-2.5 px-4 rounded-xl bg-white/90 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/60 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Chuyển QR / PIN</span>
              </button>
              <Link
                href="/quizzes"
                className="text-xs font-bold py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Mở toàn bộ {QUESTION_BANKS.reduce((acc, sec) => acc + sec.quizzes.length, 0)} chuyên đề</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {QUESTION_BANKS.map((section) => {
              const IconComp = section.icon || BookOpen;
              const primaryQuiz = section.quizzes[0];
              const totalSubQuestions = section.quizzes.reduce(
                (max, q) => Math.max(max, q.wordCount || 0),
                0
              );

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    if (primaryQuiz) {
                      setSelectedQuizPath(primaryQuiz.file_path);
                    }
                  }}
                  className="group text-left p-5 rounded-2xl glass-surface hover:border-indigo-500/70 dark:hover:border-cyan-400/60 hover:shadow-[0_0_28px_rgba(99,102,241,0.18)] gpu-card flex flex-col justify-between gap-4 cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${section.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                        {section.subjectCode}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {section.title}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {section.quizzes.length} bộ đề • Tới {totalSubQuestions} câu/đề
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-cyan-300 pt-2 border-t border-slate-200/70 dark:border-white/10">
                    <span>Chọn môn này</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Hero Active Quiz & Progress Card */
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-8 glass-elevated bg-gradient-to-br from-indigo-50/95 via-white/90 to-sky-50/90 dark:from-indigo-950/55 dark:via-slate-900/50 dark:to-purple-950/45 border border-indigo-200/80 dark:border-indigo-400/30 text-slate-900 dark:text-white transform-gpu">
          <div
            className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
            }}
          />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
            <div className="space-y-2.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 dark:bg-white/10 text-indigo-700 dark:text-indigo-200 border border-indigo-300/60 dark:border-white/10">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Đang kích hoạt</span>
                </div>
                <Link
                  href="/quizzes"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-colors"
                >
                  Đổi bộ đề
                </Link>
                <button
                  type="button"
                  onClick={() => setShowQrSync(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white/80 dark:bg-slate-800/80 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-colors cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Chuyển QR / PIN</span>
                </button>
              </div>
              <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight text-slate-900 dark:text-white">
                {quizInfo.title}
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-base max-w-2xl leading-relaxed text-balance">
                Bộ câu hỏi gồm{' '}
                <strong className="text-slate-900 dark:text-white">{totalWords || quizInfo.count || 0}</strong>{' '}
                câu hỏi trắc nghiệm đã được chuẩn hoá với đáp án và giải thích chi tiết.
              </p>
            </div>

            {/* Quick Progress Badge */}
            <div className="flex items-center justify-between sm:justify-start gap-4 bg-white/85 dark:bg-white/10 border border-indigo-200/70 dark:border-white/10 p-4 sm:p-5 rounded-2xl shrink-0">
              <div>
                <p className="text-[11px] sm:text-xs uppercase font-bold text-indigo-700 dark:text-indigo-200">
                  Đã thành thạo
                </p>
                <p className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {masteredCount} / {totalWords || quizInfo.count || 0} câu
                </p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 border-indigo-500/70 dark:border-indigo-400 border-t-emerald-500 dark:border-t-emerald-400 flex items-center justify-center font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                {masteredPercent}%
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-5 sm:mt-6 relative z-10">
            <div className="flex justify-between text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
              <span>Tiến độ làm chủ kiến thức (Spaced Repetition)</span>
              <span>{masteredPercent}% Hoàn thành</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200/80 dark:bg-black/40 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full transition-[width] duration-500 ease-out transform-gpu"
                style={{ width: `${Math.max(masteredPercent, 4)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* SRS Due Today Queue Reminder */}
      {needReviewCount > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-indigo-500/15 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-glow">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                ⏰ Bạn có {needReviewCount} câu hỏi đến hạn ôn tập SRS hôm nay
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Ôn lại đúng chu kỳ lặp lại ngắt quãng để khóa chặt kiến thức vào trí nhớ dài hạn.
              </p>
            </div>
          </div>
          <Link
            href="/session/learn?due=1"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm shadow-sm transition-all shrink-0 whitespace-nowrap"
          >
            <span>Ôn Ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 4 Intelligent Study Modes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" /> 4 Chế Độ Học & Ôn Thi
          </h2>
          <Link href="/quizzes" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
            Đổi bộ đề / chuyên đề &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Mode 1: Learn */}
          <Link
            href="/session/learn"
            className="group relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-surface border-2 border-indigo-500/35 dark:border-cyan-400/30 hover:border-cyan-500/60 dark:hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] gpu-card flex flex-col justify-between touch-manipulation select-none active:scale-[0.98]"
          >
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-500 text-white shadow-sm">
                  Thẻ 3D SM-2 ⭐
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
                Học Thẻ 3D & Phản Xạ (Learn)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3 sm:mb-4">
                Lật thẻ 3D tự đánh giá [1-3] chuẩn Spaced Repetition hoặc cày phản xạ cao tốc (0.4s) trước kỳ thi.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 pt-2 border-t border-slate-200/70 dark:border-white/10">
              <span>Bắt đầu học ngay</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Mode 2: Drill */}
          <Link
            href="/session/drill"
            className="group relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-surface hover:border-emerald-500/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] gpu-card flex flex-col justify-between touch-manipulation select-none active:scale-[0.98]"
          >
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-sm">
                  Chia Chặng Mới ⭐
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
                Luyện Theo Chặng (Checkpoint)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3 sm:mb-4">
                Chia đề thành các chặng cố định (Câu 1–20, 21–40...), đọc giải thích sâu và ép sửa câu sai cuối chặng.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 pt-2 border-t border-slate-200/70 dark:border-white/10">
              <span>Chọn chặng học ngay</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Mode 3: Exam */}
          <Link
            href="/session/exam"
            className="group relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-surface hover:border-rose-500/60 hover:shadow-[0_0_30px_rgba(244,63,94,0.2)] gpu-card flex flex-col justify-between touch-manipulation select-none active:scale-[0.98]"
          >
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-500 text-white shadow-sm">
                  Cấu Hình Mới ⭐
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
                Thi Thử Tính Giờ (Exam)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3 sm:mb-4">
                Tự chọn chuyên đề, căn thời gian, chống thoát nhầm và xem phân tích lỗ hổng kiến thức.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400 pt-2 border-t border-slate-200/70 dark:border-white/10">
              <span>Vào phòng thi mới</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Mode 4: Mistakes */}
          <Link
            href="/session/mistakes"
            className="group relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-surface hover:border-amber-500/60 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] gpu-card flex flex-col justify-between touch-manipulation select-none active:scale-[0.98]"
          >
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  Củng Cố Điểm Yếu
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
                Khắc Phục Lỗi (Mistakes)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3 sm:mb-4">
                Thuật toán SRS tự động gom các câu bạn từng làm sai để luyện lại.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 pt-2 border-t border-slate-200/70 dark:border-white/10">
              <span>Củng cố điểm yếu</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* SRS Memory Distribution Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-surface transition-all duration-300 hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.18)]">
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase">
            Đã Thành Thạo
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{masteredCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pt-2 border-t border-slate-200/70 dark:border-white/10">
            Độ nhớ dài hạn (≥80%)
          </p>
        </div>

        <div className="p-5 rounded-2xl glass-surface transition-all duration-300 hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.18)]">
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
            Đang Học / Ôn Luyện
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{learningCount}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pt-2 border-t border-slate-200/70 dark:border-white/10">
            Đang trong chu kỳ lặp lại
          </p>
        </div>

        <div className="p-5 rounded-2xl glass-surface transition-all duration-300 hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.18)]">
          <p className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase">
            Cần Ôn Hôm Nay
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            {needReviewCount}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pt-2 border-t border-slate-200/70 dark:border-white/10">
            Đến hạn ngắt quãng SRS
          </p>
        </div>

        <div className="p-5 rounded-2xl glass-surface transition-all duration-300 hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.18)]">
          <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">
            Tổng Số Câu
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{totalWords}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pt-2 border-t border-slate-200/70 dark:border-white/10">
            Trong bộ đề hiện tại
          </p>
        </div>
      </div>

      {/* QR Sync Device Transfer Modal */}
      <QrSyncModal isOpen={showQrSync} onClose={() => setShowQrSync(false)} />
    </div>
  );
}
