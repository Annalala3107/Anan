'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  const { words, loadQuizWords, isLoadingWords, isExamActive, setIsExamActive } =
    useQuizStore();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    loadQuizWords();
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
