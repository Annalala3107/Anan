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
  Headphones,
  FileText,
  CheckSquare,
  Compass,
  Bot,
} from 'lucide-react';
import { useQuizStore } from '@/lib/quizStore';
import { useMusicStore } from '@/lib/musicStore';
import { StorageEngine } from '@/lib/storage';
import { QUESTION_BANKS, getQuizDisplayName } from '@/lib/defaultBanks';
import { WordProgress } from '@/lib/types';
import QrSyncModal from '@/components/QrSyncModal';
import QuickTextParserModal from '@/components/QuickTextParserModal';
import GpuProgressBar from '@/components/ui/GpuProgressBar';

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
    setActiveCustomQuiz,
  } = useQuizStore();
  const setZenModeOpen = useMusicStore((s) => s.setZenModeOpen);
  const isPlayingMusic = useMusicStore((s) => s.isPlaying);
  const [progressMap, setProgressMap] = useState<Record<string, WordProgress>>({});
  const [showQrSync, setShowQrSync] = useState(false);
  const [showQuickParser, setShowQuickParser] = useState(false);

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
    <div className="w-full px-3.5 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-5 md:py-8 pb-28 md:pb-12 space-y-6 sm:space-y-8 animate-fade-in">
      {/* First-3-Seconds Cosmic Hero & 3-Pillar Action Hub */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-8 glass-elevated bg-gradient-to-br from-indigo-50/95 via-white/95 to-cyan-50/90 dark:from-[#0B1124]/90 dark:via-[#0F172A]/85 dark:to-[#181230]/85 border border-indigo-200/80 dark:border-indigo-400/30 space-y-6 transform-gpu">
        {/* Subtle Celestial Nebula Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 w-72 h-72 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(99,102,241,0.22) 0%, rgba(34,211,238,0.08) 45%, transparent 72%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-16 w-64 h-64 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.16) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/12 dark:bg-indigo-500/20 text-indigo-700 dark:text-cyan-300 border border-indigo-400/30 dark:border-cyan-400/30">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>✦ Nền tảng Ôn Thi Thiên Văn • Thay thế vượt trội cho Quizlet</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
              Ôn thi trắc nghiệm{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-300 bg-clip-text text-transparent">
                học gấp vẫn hiểu sâu
              </span>
              , nghe nhạc không xao nhãng
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Luyện đề <strong>1 đáp án &amp; nhiều đáp án đúng</strong> chuẩn tâm lý phòng thi thật — hỗ trợ ngay cả <strong>đề chưa có đáp án sẵn</strong> với AI giảng bản chất, kèm trình phát nhạc Zen ngay trong ứng dụng để khỏi mở YouTube ngoài.
            </p>

            {/* Key Value Capability Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
                1 &amp; Nhiều đáp án (Multi-select)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200">
                <Bot className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                Đề chưa đáp án → Vào thi ngay + AI giảng
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200">
                <Headphones className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                Nhạc &amp; Pomodoro chống xao nhãng
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowQrSync(true)}
              className="text-xs font-bold py-2.5 px-3.5 rounded-xl bg-white/90 dark:bg-white/[0.06] hover:bg-indigo-50 dark:hover:bg-white/10 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-white/15 transition-colors duration-150 flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <Smartphone className="w-4 h-4" />
              <span>Đồng bộ QR / PIN</span>
            </button>
          </div>
        </div>

        {/* 3 Direct Entry Pillars (1-Tap Study Entry) */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {/* Pillar 1: Prebuilt Quiz Banks & Active Study */}
          <Link
            href={showOnboardingPicker ? '#subject-picker' : '/session/drill'}
            className="group p-4 sm:p-5 rounded-2xl glass-surface border border-indigo-200/80 dark:border-indigo-400/25 hover:border-indigo-500 dark:hover:border-cyan-400/70 hover:shadow-[0_0_26px_rgba(99,102,241,0.2)] transition-[transform,border-color,box-shadow] duration-150 flex flex-col justify-between gap-3 active:scale-[0.98]"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25 flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                  {showOnboardingPicker
                    ? `${QUESTION_BANKS.reduce((acc, s) => acc + s.quizzes.length, 0)} chuyên đề`
                    : quizInfo.shortName}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {showOnboardingPicker
                  ? '1. Luyện Kho Đề Có Sẵn'
                  : '1. Tiếp Tục Bộ Đề Đang Chọn'}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {showOnboardingPicker
                  ? 'Chọn nhanh học phần bên dưới để vào luyện chặng, thẻ nhớ SRS hoặc thi thử tính giờ ngay.'
                  : `Vào thẳng ${quizInfo.title} để làm quen format thi và khóa kiến thức SRS.`}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-cyan-300 pt-2 border-t border-slate-200/70 dark:border-white/10">
              <span>{showOnboardingPicker ? 'Chọn môn ngay bên dưới' : 'Luyện chặng ngay'}</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-150" />
            </div>
          </Link>

          {/* Pillar 2: Instant Raw Text / Unanswered Quiz Parser */}
          <button
            type="button"
            onClick={() => setShowQuickParser(true)}
            className="group text-left p-4 sm:p-5 rounded-2xl glass-surface border border-purple-200/80 dark:border-purple-400/25 hover:border-purple-500 dark:hover:border-purple-400/70 hover:shadow-[0_0_26px_rgba(139,92,246,0.2)] transition-[transform,border-color,box-shadow] duration-150 flex flex-col justify-between gap-3 cursor-pointer active:scale-[0.98]"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/25 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
                  Vào thi trong 5s
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                2. Dán Đề Tự Do / Chưa Đáp Án
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Copy đề từ Word, PDF hoặc Web — hệ thống bóc tách tức thì và cho phép AI suy luận đáp án tại chỗ.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-300 pt-2 border-t border-slate-200/70 dark:border-white/10 w-full">
              <span>Mở bộ nhập đề thần tốc</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-150" />
            </div>
          </button>

          {/* Pillar 3: Zen Focus Studio (Music & Pomodoro) */}
          <button
            type="button"
            onClick={() => setZenModeOpen(true)}
            className="group text-left p-4 sm:p-5 rounded-2xl glass-surface border border-cyan-200/80 dark:border-cyan-400/25 hover:border-cyan-500 dark:hover:border-cyan-400/70 hover:shadow-[0_0_26px_rgba(34,211,238,0.2)] transition-[transform,border-color,box-shadow] duration-150 flex flex-col justify-between gap-3 cursor-pointer active:scale-[0.98]"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/25 flex items-center justify-center">
                  <Headphones className="w-4 h-4" />
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    isPlayingMusic
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25'
                  }`}
                >
                  {isPlayingMusic ? '● Đang phát' : 'Không quảng cáo'}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                3. Zen Focus Studio &amp; Nhạc
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Nghe Lofi/Piano, tiếng mưa rơi &amp; hẹn giờ Pomodoro 25/5 ngay trong app — dẹp bỏ xao nhãng YouTube.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-cyan-600 dark:text-cyan-300 pt-2 border-t border-slate-200/70 dark:border-white/10 w-full">
              <span>Mở không gian tập trung</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-150" />
            </div>
          </button>
        </div>
      </section>

      {showOnboardingPicker ? (
        /* First-Visit Subject Quick Picker */
        <div
          id="subject-picker"
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-7 glass-surface border border-indigo-200/80 dark:border-indigo-400/25 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                Chọn học phần bạn muốn ôn thi ngay
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Bấm chọn nhanh một trong {QUESTION_BANKS.length} môn bên dưới hoặc mở kho đề đầy đủ.
              </p>
            </div>
            <Link
              href="/quizzes"
              className="text-xs font-bold py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors inline-flex items-center gap-1.5 self-start sm:self-center shadow-sm"
            >
              <span>Mở toàn bộ {QUESTION_BANKS.reduce((acc, sec) => acc + sec.quizzes.length, 0)} chuyên đề</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
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
                        className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${section.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-150`}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                        {section.subjectCode}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {section.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {section.quizzes.length} bộ đề • Tới {totalSubQuestions} câu/đề
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-cyan-300 pt-2 border-t border-slate-200/70 dark:border-white/10">
                    <span>Chọn môn này</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-150" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Active Quiz Progress Summary Card */
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-7 glass-surface border border-indigo-200/80 dark:border-indigo-400/25 text-slate-900 dark:text-white transform-gpu">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
            <div className="space-y-2.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 dark:bg-white/10 text-indigo-700 dark:text-indigo-200 border border-indigo-300/60 dark:border-white/10">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Bộ đề đang kích hoạt</span>
                </div>
                <Link
                  href="/quizzes"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-colors"
                >
                  Đổi bộ đề
                </Link>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight text-slate-900 dark:text-white">
                {quizInfo.title}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed text-balance">
                Gồm <strong className="text-slate-900 dark:text-white">{totalWords || quizInfo.count || 0}</strong> câu hỏi trắc nghiệm sẵn sàng ôn theo chặng, thi thử hoặc tra cứu.
              </p>
            </div>

            {/* Quick Progress Badge */}
            <div className="flex items-center justify-between sm:justify-start gap-4 bg-white/85 dark:bg-white/[0.06] border border-indigo-200/70 dark:border-white/10 p-4 rounded-2xl shrink-0">
              <div>
                <p className="text-[11px] uppercase font-bold text-indigo-700 dark:text-indigo-200">
                  Đã thành thạo
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {masteredCount} / {totalWords || quizInfo.count || 0} câu
                </p>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/70 dark:border-indigo-400 border-t-emerald-500 dark:border-t-emerald-400 flex items-center justify-center font-black text-xs text-slate-900 dark:text-white">
                {masteredPercent}%
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 relative z-10">
            <div className="flex justify-between text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              <span>Tiến độ làm chủ kiến thức (Spaced Repetition)</span>
              <span>{masteredPercent}% Hoàn thành</span>
            </div>
            <GpuProgressBar
              percent={masteredPercent}
              minVisiblePercent={4}
              trackClassName="w-full h-2 bg-slate-200/80 dark:bg-black/40 rounded-full p-0.5"
              barClassName="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full duration-500"
            />
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

      {/* Direct Quick Text Parser Modal (Unanswered & Standard Quiz) */}
      <QuickTextParserModal
        isOpen={showQuickParser}
        onClose={() => setShowQuickParser(false)}
        onQuizCreated={(quiz) => setActiveCustomQuiz(quiz)}
      />
    </div>
  );
}
