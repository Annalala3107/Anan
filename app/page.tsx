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
  Flame,
  Layers,
  BookOpen,
  Volume2,
  TrendingUp,
  CheckCircle2,
  Clock,
  HelpCircle
} from 'lucide-react';
import { useQuizStore } from '@/lib/quizStore';
import { StorageEngine } from '@/lib/storage';
import { getQuizDisplayName } from '@/lib/defaultBanks';
import { Word, WordProgress } from '@/lib/types';
import WordModal from '@/components/WordModal';
import { SpeechService } from '@/lib/speech';

export default function Home() {
  const router = useRouter();
  const { words, loadQuizWords, selectedQuizPath, activeCustomQuiz } = useQuizStore();
  const [progressMap, setProgressMap] = useState<Record<string, WordProgress>>({});
  const [streak, setStreak] = useState(1);
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);

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
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 md:py-10 space-y-8 animate-fade-in">
      {/* Hero Active Quiz & Progress Card */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-indigo-900/90 via-purple-900/80 to-slate-900 border border-indigo-500/30 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-indigo-200 backdrop-blur-md border border-white/10">
              <Layers className="w-3.5 h-3.5" />
              <span>Đang kích hoạt</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
              {quizInfo.title}
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed text-balance">
              Bộ câu hỏi gồm <strong className="text-white">{totalWords}</strong> câu hỏi trắc nghiệm / từ vựng đã được chuẩn hoá với đáp án và giải thích chi tiết.
            </p>
          </div>

          {/* Quick Progress Badge */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-2xl shrink-0">
            <div>
              <p className="text-xs uppercase font-bold text-indigo-200">Đã thành thạo</p>
              <p className="text-2xl sm:text-3xl font-black">{masteredCount} / {totalWords} câu</p>
            </div>
            <div className="w-14 h-14 rounded-full border-4 border-indigo-400 border-t-emerald-400 flex items-center justify-center font-black text-sm">
              {masteredPercent}%
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs font-semibold text-slate-300 mb-2">
            <span>Tiến độ làm chủ kiến thức (Spaced Repetition)</span>
            <span>{masteredPercent}% Hoàn thành</span>
          </div>
          <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 rounded-full transition-all duration-500"
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
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500 text-white">
                V2.0 Cập Nhật Mới
              </span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                Thẻ Lật 3D SM-2 • Phản Xạ Thần Tốc (0.4s) • Mở Rộng Bộ Đề Động
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-2xl text-balance">
              Ghi nhớ chủ động (Active Recall), luyện phản xạ truy xuất thần tốc (0.4s) và cá nhân hóa bộ đề ôn thi chuẩn Spaced Repetition.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/session/learn"
            className="flex-1 sm:flex-none text-xs font-bold py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm text-center"
          >
            Học Thẻ 3D & Phản Xạ 🚀 &rarr;
          </Link>
          <Link
            href="/quizzes"
            className="flex-1 sm:flex-none text-xs font-bold py-2 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all text-center"
          >
            Kho Đề & Môn Học &rarr;
          </Link>
        </div>
      </div>

      {/* 4 Intelligent Study Modes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" /> 4 Chế Độ Học & Ôn Thi
          </h2>
          <Link href="/quizzes" className="text-xs font-bold text-indigo-500 hover:underline">
            Đổi bộ đề / chuyên đề &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mode 1: Learn */}
          <Link
            href="/session/learn"
            className="group relative p-6 rounded-3xl bg-white dark:bg-[#0F172A] border-2 border-indigo-500/40 dark:border-indigo-500/40 hover:border-indigo-500 shadow-xl hover:shadow-glow transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Brain className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-500 text-white shadow-sm">
                  Thẻ 3D SM-2 ⭐
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Học Thẻ 3D & Phản Xạ (Learn)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                Lật thẻ 3D tự đánh giá [1-3] chuẩn Spaced Repetition hoặc cày phản xạ cao tốc (0.4s) trước kỳ thi.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Bắt đầu học ngay</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Mode 2: Drill */}
          <Link
            href="/session/drill"
            className="group relative p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/60 shadow-lg hover:shadow-glow-success transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Dumbbell className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Luyện Trắc Nghiệm (Drill)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                Làm trắc nghiệm có phản hồi giải thích đúng/sai tức thì kèm phím tắt 1-4.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Luyện tập ngay</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Mode 3: Exam */}
          <Link
            href="/session/exam"
            className="group relative p-6 rounded-3xl bg-white dark:bg-[#0F172A] border-2 border-rose-500/40 dark:border-rose-500/40 hover:border-rose-500 shadow-xl hover:shadow-glow-danger transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-500 text-white shadow-sm">
                  Cấu Hình Mới ⭐
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Thi Thử Tính Giờ (Exam)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
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
            className="group relative p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-amber-500/60 dark:hover:border-amber-500/60 shadow-lg hover:shadow-glow transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Khắc Phục Lỗi (Mistakes)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
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
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-500 cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between"
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
    </div>
  );
}
