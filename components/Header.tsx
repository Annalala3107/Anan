'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Sparkles, Volume2, VolumeX, Moon, Sun, BookOpen, Layers } from 'lucide-react';
import { useQuizStore } from '@/lib/quizStore';
import { StorageEngine } from '@/lib/storage';
import { useEffect, useState } from 'react';

export default function Header() {
  const pathname = usePathname();
  const { soundEnabled, toggleSound, selectedQuizPath, activeCustomQuiz } = useQuizStore();
  const [streak, setStreak] = useState(1);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setStreak(StorageEngine.getStreak());

    const savedTheme = localStorage.getItem('theme');
    const shouldBeDark = savedTheme ? savedTheme === 'dark' : true;
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const getQuizName = () => {
    if (activeCustomQuiz) return activeCustomQuiz.name;
    if (selectedQuizPath.includes('cea201_all')) return 'CEA201 - Full (347 câu)';
    if (selectedQuizPath.includes('cea_')) return 'CEA201 Chuyên Đề';
    if (selectedQuizPath.includes('ssl101_all')) return 'SSL101 - Full (370 câu)';
    if (selectedQuizPath.includes('ssl_')) return 'SSL101 Chuyên Đề';
    if (selectedQuizPath.includes('prf192_all')) return 'PRF192 - C (253 câu)';
    if (selectedQuizPath.includes('prf_')) return 'PRF192 Chuyên Đề';
    if (selectedQuizPath.includes('vi-en-ielts')) return 'IELTS/SAT Tiếng Việt';
    if (selectedQuizPath.includes('1.json')) return 'SAT Core Set 1';
    if (selectedQuizPath.includes('2.json')) return 'SAT Advanced Set 2';
    if (selectedQuizPath.includes('archaic.json')) return 'Archaic Words';
    return 'Bộ Đề Tuỳ Chọn';
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/70 dark:bg-[#090E17]/80 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight text-slate-900 dark:text-white group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-black">
              AnanQuiz
            </span>
          </Link>

          {/* Active Quiz Indicator */}
          <Link
            href="/quizzes"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="max-w-[160px] truncate">{getQuizName()}</span>
          </Link>
        </div>

        {/* Navigation Links for Desktop */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link
            href="/"
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              pathname === '/'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Trang chủ
          </Link>
          <Link
            href="/quizzes"
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              pathname === '/quizzes'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Kho Đề Thi & Chuyên Đề
          </Link>
          <Link
            href="/library"
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              pathname === '/library'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Ngân hàng câu hỏi
          </Link>
          <Link
            href="/profile"
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              pathname === '/profile'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Thống kê SRS
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Streak Counter */}
          <div
            title="Chuỗi ngày học liên tục"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold shadow-sm"
          >
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-bounce" />
            <span>{streak} ngày</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Tắt âm thanh phát âm' : 'Bật âm thanh phát âm'}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-indigo-500" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </div>
    </header>
  );
}
