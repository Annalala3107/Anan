'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Flame, Sparkles, Moon, Sun, Layers, Smartphone } from 'lucide-react';
import { useQuizStore } from '@/lib/quizStore';
import { getQuizDisplayName } from '@/lib/defaultBanks';
import { useEffect, useState } from 'react';
import QrSyncModal from './QrSyncModal';
import ConfirmModal, { EXAM_EXIT_CONFIRM_COPY } from './ConfirmModal';
import HeaderMusicWidget from './music/HeaderMusicWidget';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    selectedQuizPath,
    activeCustomQuiz,
    hasHydratedSelection,
    hasExplicitSelection,
    streak,
    syncStreak,
    isExamActive,
    setIsExamActive,
  } = useQuizStore();
  const [isDark, setIsDark] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [showQrSync, setShowQrSync] = useState(false);

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (isExamActive && pathname?.includes('/session/exam')) {
      e.preventDefault();
      setPendingUrl(href);
      setShowExitConfirm(true);
    }
  };

  const confirmExitExam = () => {
    setIsExamActive(false);
    setShowExitConfirm(false);
    if (pendingUrl) {
      router.push(pendingUrl);
      setPendingUrl(null);
    }
  };

  const cancelExitExam = () => {
    setShowExitConfirm(false);
    setPendingUrl(null);
  };

  useEffect(() => {
    useQuizStore.getState().hydrateSelection();

    const savedTheme = localStorage.getItem('theme');
    const shouldBeDark = savedTheme
      ? savedTheme === 'dark'
      : document.documentElement.classList.contains('dark');
    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    syncStreak();
  }, [pathname, syncStreak]);

  useEffect(() => {
    const handleSync = () => syncStreak();
    window.addEventListener('ananquiz:stats-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('ananquiz:stats-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [syncStreak]);

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

  const quizInfo = getQuizDisplayName(selectedQuizPath, activeCustomQuiz);

  return (
    <>
    <header className="sticky top-0 z-40 w-full max-w-full bg-white/95 dark:bg-[#090E17]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors transform-gpu">
      <div className="w-full px-2.5 sm:px-4 md:px-5 lg:px-8 xl:px-10 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <Link
            href="/"
            onClick={(e) => handleNavClick(e, '/')}
            className="flex items-center gap-1.5 sm:gap-2 font-extrabold text-base sm:text-xl tracking-tight text-slate-900 dark:text-white group shrink-0"
          >
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:rotate-12 transition-transform duration-200" />
            </div>
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-black whitespace-nowrap">
              AnanQuiz
            </span>
          </Link>

          {/* Active Quiz Indicator (visible from lg / laptop screens upward) */}
          <Link
            href="/quizzes"
            onClick={(e) => handleNavClick(e, '/quizzes')}
            title={
              hasHydratedSelection && !hasExplicitSelection && !activeCustomQuiz
                ? 'Chọn môn học bắt đầu'
                : quizInfo.title
            }
            className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shrink-0"
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="max-w-[140px] xl:max-w-[180px] truncate">
              {hasHydratedSelection && !hasExplicitSelection && !activeCustomQuiz
                ? 'Chọn môn học'
                : quizInfo.shortName}
            </span>
          </Link>
        </div>

        {/* Navigation Links for Desktop */}
        <nav className="hidden md:flex items-center gap-0.5 lg:gap-1.5 text-xs lg:text-sm font-medium whitespace-nowrap min-w-0">
          <Link
            href="/"
            onClick={(e) => handleNavClick(e, '/')}
            className={`px-2 lg:px-2.5 xl:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              pathname === '/'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Trang chủ
          </Link>
          <Link
            href="/quizzes"
            onClick={(e) => handleNavClick(e, '/quizzes')}
            className={`px-2 lg:px-2.5 xl:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              pathname === '/quizzes'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="xl:hidden">Kho Đề</span>
            <span className="hidden xl:inline">Kho Đề Thi &amp; Chuyên Đề</span>
          </Link>
          <Link
            href="/library"
            onClick={(e) => handleNavClick(e, '/library')}
            className={`px-2 lg:px-2.5 xl:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              pathname === '/library'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="xl:hidden">Tra cứu</span>
            <span className="hidden xl:inline">Ngân hàng câu hỏi</span>
          </Link>
          <Link
            href="/profile"
            onClick={(e) => handleNavClick(e, '/profile')}
            className={`px-2 lg:px-2.5 xl:px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              pathname === '/profile'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="xl:hidden">Thống kê</span>
            <span className="hidden xl:inline">Thống kê SRS</span>
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Global Study Music Widget */}
          <HeaderMusicWidget />

          {/* QR Device Transfer */}
          <button
            onClick={() => setShowQrSync(true)}
            title="Chuyển dữ liệu qua QR / Mã PIN 15 phút"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl transition-[transform,background-color,border-color] duration-150 flex items-center gap-1.5 text-xs font-bold border bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 shadow-sm active:scale-95 touch-manipulation whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="hidden xl:inline">Chuyển QR / PIN</span>
          </button>

          {/* Streak Counter */}
          <div
            title="Chuỗi ngày học liên tục"
            className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold shadow-sm select-none group whitespace-nowrap shrink-0"
          >
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-500 text-amber-500 group-hover:scale-110 transition-transform duration-200 shrink-0" />
            <span>
              <strong className="font-mono">{streak}</strong>
              <span className="hidden lg:inline"> ngày</span>
            </span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 touch-manipulation shrink-0"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showExitConfirm}
        {...EXAM_EXIT_CONFIRM_COPY}
        onCancel={cancelExitExam}
        onConfirm={confirmExitExam}
      />
    </header>
    {/* Device Transfer QR Sync Modal (rendered outside transformed header via Portal) */}
    <QrSyncModal isOpen={showQrSync} onClose={() => setShowQrSync(false)} />
    </>
  );
}
