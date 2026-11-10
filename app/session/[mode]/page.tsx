'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuizStore } from '@/lib/quizStore';
import LearnMode from '@/components/study/LearnMode';
import DrillMode from '@/components/study/DrillMode';
import ExamMode from '@/components/study/ExamMode';
import MistakesMode from '@/components/study/MistakesMode';

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const mode = params?.mode as string;
  const { words, loadQuizWords, isLoadingWords } = useQuizStore();

  useEffect(() => {
    loadQuizWords();
  }, []);

  const handleExit = () => {
    router.push('/');
  };

  if (isLoadingWords || words.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Đang tải dữ liệu bộ từ vựng...
        </p>
      </div>
    );
  }

  if (mode === 'learn') {
    return <LearnMode words={words} onExit={handleExit} />;
  }

  if (mode === 'drill') {
    return <DrillMode words={words} onExit={handleExit} />;
  }

  if (mode === 'exam') {
    return <ExamMode words={words} onExit={handleExit} />;
  }

  if (mode === 'mistakes') {
    return <MistakesMode words={words} onExit={handleExit} />;
  }

  return (
    <div className="text-center py-20">
      <p className="text-slate-500 mb-4">Chế độ học không hợp lệ: &quot;{mode}&quot;</p>
      <button
        onClick={handleExit}
        className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold"
      >
        Về Trang chủ
      </button>
    </div>
  );
}
