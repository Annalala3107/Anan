'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useQuizStore } from '@/lib/quizStore';
import LearnMode from '@/components/study/LearnMode';
import DrillMode from '@/components/study/DrillMode';
import ExamMode from '@/components/study/ExamMode';
import MistakesMode from '@/components/study/MistakesMode';
import ConfirmModal, { EXAM_EXIT_CONFIRM_COPY } from '@/components/ConfirmModal';

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const mode = params?.mode as string;
  const {
    words,
    loadQuizWords,
    isLoadingWords,
    loadError,
    isExamActive,
    setIsExamActive,
  } = useQuizStore();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    void loadQuizWords();
  }, [loadQuizWords]);

  const handleExit = () => {
    if (isExamActive && mode === 'exam') {
      setShowExitConfirm(true);
      return;
    }
    router.push('/');
  };

  const confirmExit = () => {
    setIsExamActive(false);
    setShowExitConfirm(false);
    router.push('/');
  };

  if (!isLoadingWords && loadError) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl glass-surface text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Không thể nạp bộ đề ôn tập
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {loadError}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => void loadQuizWords()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Thử tải lại</span>
            </button>
            <Link
              href="/quizzes"
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm inline-flex items-center justify-center"
            >
              Chọn đề khác
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-4">
      <div className="w-full">
        {mode === 'learn' && <LearnMode words={words} onExit={handleExit} />}
        {mode === 'drill' && <DrillMode words={words} onExit={handleExit} />}
        {mode === 'exam' && <ExamMode words={words} onExit={handleExit} />}
        {mode === 'mistakes' && <MistakesMode words={words} onExit={handleExit} />}
      </div>

      <ConfirmModal
        isOpen={showExitConfirm}
        {...EXAM_EXIT_CONFIRM_COPY}
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={confirmExit}
      />
    </div>
  );
}
