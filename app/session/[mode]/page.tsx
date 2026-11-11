'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuizStore } from '@/lib/quizStore';
import LearnMode from '@/components/study/LearnMode';
import DrillMode from '@/components/study/DrillMode';
import ExamMode from '@/components/study/ExamMode';
import MistakesMode from '@/components/study/MistakesMode';
import ZenFocusHUD from '@/components/study/ZenFocusHUD';
import { AlertTriangle } from 'lucide-react';

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const mode = params?.mode as string;
  const { words, loadQuizWords, isLoadingWords, zenMode, toggleZenMode, isExamActive, setIsExamActive } =
    useQuizStore();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    loadQuizWords();
  }, []);

  // Global Hotkey 'Z' to toggle Zen Focus Mode & 'Escape' to exit Zen Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key.toLowerCase() === 'z' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleZenMode();
      } else if (e.key === 'Escape' && zenMode) {
        e.preventDefault();
        toggleZenMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zenMode, toggleZenMode]);

  const handleExit = () => {
    if (isExamActive && mode === 'exam') {
      setShowExitConfirm(true);
      return;
    }
    if (zenMode) toggleZenMode(false);
    router.push('/');
  };

  const confirmExit = () => {
    setIsExamActive(false);
    setShowExitConfirm(false);
    if (zenMode) toggleZenMode(false);
    router.push('/');
  };

  if (isLoadingWords || words.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Đang nạp ngân hàng câu hỏi ôn tập...
        </p>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen transition-all duration-500 ${
        zenMode
          ? 'bg-[#06080E] text-slate-100 py-4 px-2 sm:px-6 fixed inset-0 z-50 overflow-y-auto'
          : 'w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-4'
      }`}
    >
      {/* Zen Focus HUD Bar */}
      <ZenFocusHUD mode={mode} onExit={handleExit} />

      {/* Main Study Session View */}
      <div
        className={`transition-all duration-500 ${
          zenMode ? 'max-w-5xl xl:max-w-6xl mx-auto pt-2 pb-16 scale-[1.01]' : 'w-full'
        }`}
      >
        {mode === 'learn' && <LearnMode words={words} onExit={handleExit} />}
        {mode === 'drill' && <DrillMode words={words} onExit={handleExit} />}
        {mode === 'exam' && <ExamMode words={words} onExit={handleExit} />}
        {mode === 'mistakes' && <MistakesMode words={words} onExit={handleExit} />}
      </div>

      {/* Exam Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
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
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                onClick={confirmExit}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors text-sm shadow-sm"
              >
                Hủy bài & Thoát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
