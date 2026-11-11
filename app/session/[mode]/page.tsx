'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuizStore } from '@/lib/quizStore';
import LearnMode from '@/components/study/LearnMode';
import DrillMode from '@/components/study/DrillMode';
import ExamMode from '@/components/study/ExamMode';
import MistakesMode from '@/components/study/MistakesMode';
import ZenFocusHUD from '@/components/study/ZenFocusHUD';

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const mode = params?.mode as string;
  const { words, loadQuizWords, isLoadingWords, zenMode, toggleZenMode } = useQuizStore();

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
          : 'py-2 px-2'
      }`}
    >
      {/* Zen Focus HUD Bar */}
      <ZenFocusHUD mode={mode} onExit={handleExit} />

      {/* Main Study Session View */}
      <div
        className={`transition-all duration-500 ${
          zenMode ? 'max-w-4xl mx-auto pt-2 pb-16 scale-[1.01]' : ''
        }`}
      >
        {mode === 'learn' && <LearnMode words={words} onExit={handleExit} />}
        {mode === 'drill' && <DrillMode words={words} onExit={handleExit} />}
        {mode === 'exam' && <ExamMode words={words} onExit={handleExit} />}
        {mode === 'mistakes' && <MistakesMode words={words} onExit={handleExit} />}
      </div>
    </div>
  );
}
