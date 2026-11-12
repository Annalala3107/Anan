'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Flame, Sparkles, Moon, Sun, Layers, AlertTriangle, Smartphone } from 'lucide-react';
import { useQuizStore } from '@/lib/quizStore';
import { StorageEngine } from '@/lib/storage';
import { getQuizDisplayName } from '@/lib/defaultBanks';
import { useEffect, useState } from 'react';
import QrSyncModal from './QrSyncModal';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    selectedQuizPath,
    activeCustomQuiz,
    isExamActive,
    setIsExamActive,
  } = useQuizStore();
  const [streak, setStreak] = useState(1);
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

  const quizInfo = getQuizDisplayName(selectedQuizPath, activeCustomQuiz);

  return (
    <>
    <header className="sticky top-0 z-40 w-full backdrop-blur-md sm:backdrop-blur-xl bg-white/80 dark:bg-[#090E17]/85 border-b border-slate-200/80 dark:border-slate-800/80 transition-colors transform-gpu">
      <div className="w-full px-3 sm:px-6 md:px-8 lg:px-10 xl:px-12 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            onClick={(e) => handleNavClick(e, '/')}
            className="flex items-center gap-2 font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:rotate-12 transition-transform duration-200" />
            </div>
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-black">
              AnanQuiz
            </span>
          </Link>

          {/* Active Quiz Indicator */}
          <Link
            href="/quizzes"
            onClick={(e) => handleNavClick(e, '/quizzes')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 hover:bg-indigo-100 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="max-w-[240px] truncate">{quizInfo.shortName}</span>
          </Link>
        </div>

        {/* Navigation Links for Desktop */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link
            href="/"
            onClick={(e) => handleNavClick(e, '/')}
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
            onClick={(e) => handleNavClick(e, '/quizzes')}
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
            onClick={(e) => handleNavClick(e, '/library')}
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
            onClick={(e) => handleNavClick(e, '/profile')}
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
        <div className="flex items-center gap-1 sm:gap-2">
          {/* QR Device Sync */}
          <button
            onClick={() => setShowQrSync(true)}
            title="Đồng bộ 1-chạm sang điện thoại (Mã QR)"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl transition-[transform,background-color,border-color] duration-150 flex items-center gap-1.5 text-xs font-bold border bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 shadow-sm active:scale-95 touch-manipulation"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Đồng bộ ĐT</span>
          </button>

          {/* Streak Counter */}
          <div
            title="Chuỗi ngày học liên tục"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold shadow-sm select-none group"
          >
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-500 text-amber-500 group-hover:scale-110 transition-transform duration-200" />
            <span>
              <strong className="font-mono">{streak}</strong>
              <span className="hidden sm:inline"> ngày</span>
            </span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95 touch-manipulation"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>
        </div>
      </div>

      {/* Exam Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#111827] border border-rose-500/30 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Bạn đang trong phòng thi!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Rời khỏi trang lúc này sẽ hủy bỏ toàn bộ kết quả bài thi hiện tại và không được lưu. Bạn có chắc chắn muốn thoát không?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={cancelExitExam}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                onClick={confirmExitExam}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors text-sm shadow-sm"
              >
                Hủy bài & Thoát
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
    {/* Device Transfer QR Sync Modal (rendered outside transformed header via Portal) */}
    <QrSyncModal isOpen={showQrSync} onClose={() => setShowQrSync(false)} />
    </>
  );
}
