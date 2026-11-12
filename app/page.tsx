'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Brain,
  Dumbbell,
  Award,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Layers,
  Smartphone,
} from 'lucide-react';
import { useQuizStore } from '@/lib/quizStore';
import { StorageEngine } from '@/lib/storage';
import { getQuizDisplayName } from '@/lib/defaultBanks';
import { Word, WordProgress } from '@/lib/types';
import WordModal from '@/components/WordModal';
import QrSyncModal from '@/components/QrSyncModal';

export default function Home() {
  const router = useRouter();
  const { words, loadQuizWords, selectedQuizPath, activeCustomQuiz } = useQuizStore();
  const [progressMap, setProgressMap] = useState<Record<string, WordProgress>>({});
  const [streak, setStreak] = useState(1);
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [showQrSync, setShowQrSync] = useState(false);

  useEffect(() => {
    loadQuizWords();
    setProgressMap(StorageEngine.getWordProgress());
    setStreak(StorageEngine.getStreak());
    setDailyStats(StorageEngine.getDailyStats());
  }, []);

  const totalWords = words.length || 1;
  const masteredCount = words.filter(
    (w) => StorageEngine.getItemProgress(w, progressMap)?.status === 'mastered'
  ).length;
  const learningCount = words.filter(
    (w) => StorageEngine.getItemProgress(w, progressMap)?.status === 'learning'
  ).length;
  const needReviewCount = words.filter((w) => {
    const p = StorageEngine.getItemProgress(w, progressMap);
    return p && p.nextDue <= Date.now() && p.seenCount > 0;
  }).length;

  const masteredPercent = Math.round((masteredCount / totalWords) * 100);
  const quizInfo = getQuizDisplayName(selectedQuizPath, activeCustomQuiz, words);

  return (
    <div className="w-full px-3.5 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-5 md:py-10 pb-28 md:pb-12 space-y-6 sm:space-y-8 animate-fade-in">
      {/* Hero Active Quiz & Progress Card */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-8 bg-gradient-to-br from-indigo-900/90 via-purple-900/80 to-slate-900 border border-indigo-500/30 text-white shadow-2xl transform-gpu">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none transform-gpu" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-indigo-200 backdrop-blur-md border border-white/10">
              <Layers className="w-3.5 h-3.5" />
              <span>Đang kích hoạt</span>
            </div>
            <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
              {quizInfo.title}
            </h1>
            <p className="text-slate-300 text-xs sm:text-base max-w-2xl leading-relaxed text-balance">
              Bộ câu hỏi gồm <strong className="text-white">{totalWords}</strong> câu hỏi trắc nghiệm / từ vựng đã được chuẩn hoá với đáp án và giải thích chi tiết.
            </p>
          </div>

          {/* Quick Progress Badge */}
          <div className="flex items-center justify-between sm:justify-start gap-4 bg-white/10 backdrop-blur-md border border-white/10 p-4 sm:p-5 rounded-2xl shrink-0">
            <div>
              <p className="text-[11px] sm:text-xs uppercase font-bold text-indigo-200">Đã thành thạo</p>
              <p className="text-xl sm:text-3xl font-black">{masteredCount} / {totalWords} câu</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 border-indigo-400 border-t-emerald-400 flex items-center justify-center font-black text-xs sm:text-sm">
              {masteredPercent}%
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 sm:mt-6">
          <div className="flex justify-between text-[11px] sm:text-xs font-semibold text-slate-300 mb-2">
            <span>Tiến độ làm chủ kiến thức (Spaced Repetition)</span>
            <span>{masteredPercent}% Hoàn thành</span>
          </div>
          <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 rounded-full transition-[width] duration-500 ease-out transform-gpu"
              style={{ width: `${Math.max(masteredPercent, 4)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Update Highlights Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500 text-white">
                V2.1 Cập Nhật Mới
              </span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                Thẻ Lật 3D SM-2 • Phản Xạ (0.4s) • Luyện Theo Chặng Không Sót Câu
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-2xl text-balance">
              Ghi nhớ chủ động (Active Recall), luyện phản xạ truy xuất thần tốc (0.4s) và chia chặng tuần tự (Câu 1–20, 21–40...) kèm vòng ép sửa câu sai.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <Link
            href="/session/learn"
            className="col-span-2 sm:col-span-1 text-xs font-bold py-2.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-[transform,background-color] duration-150 shadow-sm text-center touch-manipulation active:scale-95 transform-gpu"
          >
            Học Thẻ 3D & Phản Xạ 🚀 &rarr;
          </Link>
          <button
            type="button"
            onClick={() => setShowQrSync(true)}
            className="text-xs font-bold py-2.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-[transform,background-color] duration-150 text-center flex items-center justify-center gap-1 shadow-sm touch-manipulation active:scale-95 transform-gpu"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
            <span>Đồng bộ ĐT</span>
          </button>
          <Link
            href="/quizzes"
            className="text-xs font-bold py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-[transform,background-color] duration-150 text-center touch-manipulation active:scale-95 transform-gpu"
          >
            Kho Đề & Môn &rarr;
          </Link>
        </div>
      </div>

      {/* 4 Intelligent Study Modes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" /> 4 Chế Độ Học & Ôn Thi
          </h2>
          <Link href="/quizzes" className="text-xs font-bold text-indigo-500 hover:underline">
            Đổi bộ đề / chuyên đề &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Mode 1: Learn */}
          <Link
            href="/session/learn"
            className="group relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0F172A] border-2 border-indigo-500/40 dark:border-indigo-500/40 hover:border-indigo-500 shadow-xl hover:shadow-glow gpu-card flex flex-col justify-between touch-manipulation select-none active:scale-[0.98]"
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
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3 sm:mb-4">
                Lật thẻ 3D tự đánh giá [1-3] chuẩn Spaced Repetition hoặc cày phản xạ cao tốc (0.4s) trước kỳ thi.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Bắt đầu học ngay</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Mode 2: Drill (Upgraded to Checkpoint Tutor Mode) */}
          <Link
            href="/session/drill"
            className="group relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 shadow-lg hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] gpu-card flex flex-col justify-between touch-manipulation select-none active:scale-[0.98]"
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
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3 sm:mb-4">
                Chia đề thành các chặng cố định (Câu 1–20, 21–40...), đọc giải thích sâu và ép sửa câu sai cuối chặng.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Chọn chặng học ngay</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Mode 3: Exam */}
          <Link
            href="/session/exam"
            className="group relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-rose-500/60 dark:hover:border-rose-500/60 shadow-lg hover:shadow-[0_0_25px_rgba(244,63,94,0.15)] gpu-card flex flex-col justify-between touch-manipulation select-none active:scale-[0.98]"
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
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3 sm:mb-4">
                Tự chọn chuyên đề, căn thời gian, chống thoát nhầm và xem phân tích lỗ hổng kiến thức.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Vào phòng thi mới</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Mode 4: Mistakes */}
          <Link
            href="/session/mistakes"
            className="group relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-amber-500/60 dark:hover:border-amber-500/60 shadow-lg hover:shadow-[0_0_25px_rgba(245,158,11,0.15)] gpu-card flex flex-col justify-between touch-manipulation select-none active:scale-[0.98]"
          >
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Củng Cố Điểm Yếu
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">
                Khắc Phục Lỗi (Mistakes)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3 sm:mb-4">
                Thuật toán SRS tự động gom các câu bạn từng làm sai để luyện lại.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Củng cố điểm yếu</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* SRS Memory Distribution Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-emerald-500 uppercase">Đã Thành Thạo</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            {masteredCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Độ nhớ dài hạn (≥80%)</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-indigo-500 uppercase">Đang Học / Ôn Luyện</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            {learningCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Đang trong chu kỳ lặp lại</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-amber-500 uppercase">Cần Ôn Hôm Nay</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            {needReviewCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Đến hạn ngắt quãng SRS</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-purple-500 uppercase">Tổng Số Câu</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            {totalWords}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Trong bộ đề hiện tại</p>
        </div>
      </div>

      {/* Quick Question Preview Spotlight */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Xem Nhanh Các Câu Hỏi Trong Bộ Đề
            </h3>
            <p className="text-xs text-slate-500">
              Nhấp vào câu hỏi bất kỳ để xem các phương án, đáp án đúng và giải thích chi tiết.
            </p>
          </div>
          <Link
            href="/library"
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            Mở ngân hàng câu hỏi <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3.5">
          {words.slice(0, 12).map((w, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedWord(w)}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-500 cursor-pointer content-auto-card gpu-card active:scale-[0.98] touch-manipulation select-none flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-2 inline-block">
                  {w.topic || 'Câu hỏi ' + (idx + 1)}
                </span>
                <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 mb-2">
                  {w.question || w.word}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span>Đáp án: <strong className="text-emerald-500">{w.answer || w.correctWord || ''}</strong></span>
                <span className="text-indigo-500 font-semibold hover:underline">Chi tiết &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Word / Question Detail Modal */}
      <WordModal word={selectedWord} onClose={() => setSelectedWord(null)} />

      {/* QR Sync Device Transfer Modal */}
      <QrSyncModal isOpen={showQrSync} onClose={() => setShowQrSync(false)} />
    </div>
  );
}
