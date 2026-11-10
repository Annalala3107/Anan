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
  Clock
} from 'lucide-react';
import { useQuizStore } from '@/lib/quizStore';
import { StorageEngine } from '@/lib/storage';
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
  const progressList = Object.values(progressMap);
  const masteredCount = words.filter(
    (w) => progressMap[w.word]?.status === 'mastered'
  ).length;
  const learningCount = words.filter(
    (w) => progressMap[w.word]?.status === 'learning'
  ).length;
  const needReviewCount = words.filter((w) => {
    const p = progressMap[w.word];
    return p && p.nextDue <= Date.now() && p.seenCount > 0;
  }).length;

  const masteredPercent = Math.round((masteredCount / totalWords) * 100);

  const getActiveQuizTitle = () => {
    if (activeCustomQuiz) return activeCustomQuiz.name;
    if (selectedQuizPath.includes('vi-en-ielts')) return 'IELTS / SAT Tiếng Việt Chọn Lọc';
    if (selectedQuizPath.includes('1.json')) return 'Bộ từ vựng SAT Cốt lõi (Set 1)';
    if (selectedQuizPath.includes('2.json')) return 'Bộ từ vựng SAT Nâng cao (Set 2)';
    if (selectedQuizPath.includes('archaic.json')) return 'Từ vựng Cổ & Văn học (Archaic)';
    return 'Bộ Đề Tuỳ Chọn';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 space-y-8 animate-fade-in">
      {/* Hero Active Quiz & Progress Card */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-indigo-900/90 via-purple-900/80 to-slate-900 border border-indigo-500/30 text-white shadow-2xl">
        {/* Glow orb */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-indigo-200 backdrop-blur-md border border-white/10">
              <Layers className="w-3.5 h-3.5" />
              <span>Đang học</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
              {getActiveQuizTitle()}
            </h1>
            <p className="text-slate-300 text-sm">
              Bộ đề gồm <strong className="text-white">{totalWords}</strong> từ vựng kèm ngữ cảnh học thuật và giải thích chi tiết.
            </p>
          </div>

          {/* Quick Progress Badge */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl shrink-0">
            <div>
              <p className="text-xs uppercase font-bold text-indigo-200">Đã thành thạo</p>
              <p className="text-2xl font-black">{masteredCount} / {totalWords} từ</p>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-indigo-400 border-t-emerald-400 flex items-center justify-center font-bold text-xs">
              {masteredPercent}%
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs font-semibold text-slate-300 mb-2">
            <span>Tiến độ ghi nhớ dài hạn (Spaced Repetition)</span>
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

      {/* 4 Intelligent Study Modes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" /> 4 Chế Độ Học Thông Minh
          </h2>
          <span className="text-xs text-slate-500">Chọn phương pháp phù hợp</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mode 1: Learn */}
          <Link
            href="/session/learn"
            className="group relative p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-indigo-500/60 dark:hover:border-indigo-500/60 shadow-lg hover:shadow-glow transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Chế độ Học (Learn)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                3 bước vi mô: Lật thẻ nhớ, điền ngữ cảnh và phân biệt từ dễ nhầm lẫn.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <span>Bắt đầu học</span>
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
                Luyện Ngữ Cảnh (Drill)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                Điền từ vào đoạn văn học thuật kèm giải thích lý do đúng/sai tức thì.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>Luyện tập ngay</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Mode 3: Exam */}
          <Link
            href="/session/exam"
            className="group relative p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 hover:border-rose-500/60 dark:hover:border-rose-500/60 shadow-lg hover:shadow-glow-danger transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                Thi Thử SAT (Exam)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                Đề thi chuẩn cấu trúc SAT bấm giờ, xuất phiếu điểm và xem lại từng câu.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400">
              <span>Vào phòng thi</span>
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
                Tập trung xử lý các từ hay làm sai và các từ đến hạn ôn tập theo SRS.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
              <span>Củng cố từ yếu</span>
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
          <p className="text-[11px] text-slate-400 mt-1">Ghi nhớ dài hạn (≥80%)</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-bold text-indigo-500 uppercase">Đang Học</p>
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
          <p className="text-xs font-bold text-purple-500 uppercase">Tổng Số Từ</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            {totalWords}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Trong bộ đề hiện hành</p>
        </div>
      </div>

      {/* Vocabulary Quick Preview Spotlight */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Tra Cứu Nhanh Từ Vựng
            </h3>
            <p className="text-xs text-slate-500">
              Nhấp vào từ bất kỳ để nghe phát âm, xem ví dụ câu và phân biệt lỗi bẫy.
            </p>
          </div>
          <Link
            href="/library"
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {words.slice(0, 8).map((w, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedWord(w)}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-500 cursor-pointer transition-all hover:scale-[1.02] flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  {w.word}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                  {w.vi || w.ru || w.definition}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  SpeechService.speak(w.word);
                }}
                className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Word Detail Modal */}
      <WordModal word={selectedWord} onClose={() => setSelectedWord(null)} />
    </div>
  );
}
