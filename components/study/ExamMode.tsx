'use client';

import { useState, useEffect } from 'react';
import { Word, ExamQuestion } from '@/lib/types';
import { StorageEngine } from '@/lib/storage';
import { Clock, CheckCircle2, XCircle, AlertCircle, ArrowLeft, ArrowRight, Trophy, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExamModeProps {
  words: Word[];
  onExit: () => void;
}

export default function ExamMode({ words, onExit }: ExamModeProps) {
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes (300s)
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Generate exam questions
  useEffect(() => {
    if (!words || words.length === 0) return;

    const list: ExamQuestion[] = [];
    const pool = [...words].sort(() => 0.5 - Math.random());
    const count = Math.min(pool.length, 10);

    for (let i = 0; i < count; i++) {
      const target = pool[i];
      const rawSentence =
        target.advanced_example ||
        target.simple_examples?.[0] ||
        `The author's argument was remarkably ________, convincing even his fiercest critics.`;

      const regex = new RegExp(`\\b${target.word}\\w*`, 'gi');
      const sentence = rawSentence.replace(regex, '________');

      // Distractors
      const distractors = words
        .filter((w) => w.word.toLowerCase() !== target.word.toLowerCase())
        .map((w) => w.word)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const options = [target.word, ...distractors].sort(() => 0.5 - Math.random());

      list.push({
        id: `exam_q_${i}`,
        sentence,
        correctWord: target.word,
        options,
        explanation: `${target.word} (${target.vi || target.ru || 'chính xác'})`,
      });
    }

    setQuestions(list);
  }, [words]);

  // Countdown Timer
  useEffect(() => {
    if (isSubmitted || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted]);

  const handleSubmit = () => {
    setIsSubmitted(true);

    // Calculate score
    let correctCount = 0;
    questions.forEach((q, idx) => {
      const ans = answers[idx];
      const isCorrect = ans?.toLowerCase() === q.correctWord.toLowerCase();
      if (isCorrect) correctCount++;
      StorageEngine.updateWordProgress(q.correctWord, isCorrect ? 5 : 1);
    });

    const percent = Math.round((correctCount / questions.length) * 100);
    StorageEngine.recordActivity('exam', percent);

    if (percent >= 70) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!questions.length) {
    return <div className="text-center py-20 text-slate-500">Đang chuẩn bị đề thi...</div>;
  }

  // --- RESULT SCORE SHEET ---
  if (isSubmitted) {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (answers[idx]?.toLowerCase() === q.correctWord.toLowerCase()) correctCount++;
    });
    const percent = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-in">
        {/* Score Card */}
        <div className="text-center p-8 rounded-3xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 shadow-2xl mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 mx-auto flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            Kết Quả Bài Thi Thử SAT
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Đánh giá độ nhạy từ vựng & khả năng suy luận ngữ cảnh học thuật
          </p>

          <div className="flex justify-center items-center gap-8 mb-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Điểm số</p>
              <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                {correctCount} / {questions.length}
              </p>
            </div>
            <div className="w-[1px] h-12 bg-slate-200 dark:bg-slate-700" />
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Tỉ lệ đạt</p>
              <p
                className={`text-4xl font-black ${
                  percent >= 80
                    ? 'text-emerald-500'
                    : percent >= 50
                    ? 'text-amber-500'
                    : 'text-rose-500'
                }`}
              >
                {percent}%
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setIsSubmitted(false);
                setAnswers({});
                setTimeLeft(300);
                setCurrentIndex(0);
              }}
              className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-glow flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Thi lại đề mới
            </button>
            <button
              onClick={onExit}
              className="py-3 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Về Trang chủ
            </button>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Chi tiết từng câu hỏi:
        </h3>
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const userAns = answers[idx];
            const isCorrect = userAns?.toLowerCase() === q.correctWord.toLowerCase();
            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl border transition-all ${
                  isCorrect
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                    : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Câu {idx + 1}
                  </span>
                  {isCorrect ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> Đúng
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                      <XCircle className="w-4 h-4" /> Sai
                    </span>
                  )}
                </div>

                <p className="text-base text-slate-900 dark:text-slate-100 mb-3">
                  &quot;{q.sentence}&quot;
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                  <div>
                    <span className="text-slate-400">Bạn chọn: </span>
                    <span
                      className={`font-bold ${
                        isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {userAns || '(Bỏ trống)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Đáp án đúng: </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {q.correctWord}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- EXAM TAKING VIEW ---
  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Chế độ Thi Thử SAT (Timed Exam)
          </span>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Câu hỏi {currentIndex + 1} / {questions.length}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold ${
              timeLeft < 60
                ? 'bg-rose-500/20 text-rose-500 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={handleSubmit}
            className="py-1.5 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-glow-danger"
          >
            Nộp bài
          </button>
        </div>
      </div>

      {/* Question Navigator Grid */}
      <div className="flex flex-wrap gap-2 mb-6 p-3 rounded-2xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-800">
        {questions.map((_, idx) => {
          const isAnswered = Boolean(answers[idx]);
          const isCurrent = idx === currentIndex;
          return (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                isCurrent
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                  : isAnswered
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Question Card */}
      <div className="p-8 rounded-3xl bg-white dark:bg-[#131D31] border border-slate-200 dark:border-slate-800 shadow-xl mb-6">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Chọn đáp án điền vào ngữ cảnh học thuật
        </p>
        <p className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white leading-relaxed">
          &quot;{currentQ.sentence}&quot;
        </p>
      </div>

      {/* Choices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {currentQ.options.map((opt, idx) => {
          const isChosen = answers[currentIndex] === opt;
          return (
            <button
              key={idx}
              onClick={() => {
                setAnswers((prev) => ({ ...prev, [currentIndex]: opt }));
              }}
              className={`p-4 rounded-2xl font-bold border text-left transition-all flex items-center justify-between ${
                isChosen
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-glow'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-lg text-xs flex items-center justify-center font-mono ${
                    isChosen
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-base">{opt}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-30 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Câu trước
        </button>

        {currentIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-glow transition-all"
          >
            Câu tiếp theo <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-glow-success transition-all"
          >
            Nộp bài thi <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
