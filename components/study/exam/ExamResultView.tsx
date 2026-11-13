'use client';

import React from 'react';
import { ExamQuestion } from '@/lib/types';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import {
  Trophy,
  RotateCcw,
  Settings2,
  BarChart3,
  Zap,
  AlertTriangle,
  Flag,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export interface TopicStatItem {
  topic: string;
  total: number;
  correct: number;
  wrong: number;
  percent: number;
  status: 'mastered' | 'review' | 'critical';
}

interface ExamResultViewProps {
  questions: ExamQuestion[];
  answers: Record<number, string>;
  flags: Record<number, boolean>;
  topicStats: TopicStatItem[];
  weakestTopic: TopicStatItem | null;
  resultFilterMode: 'all' | 'wrong' | 'flagged';
  setResultFilterMode: (mode: 'all' | 'wrong' | 'flagged') => void;
  resultFilterTopic: string | null;
  setResultFilterTopic: React.Dispatch<React.SetStateAction<string | null>>;
  filteredReviewQuestions: { q: ExamQuestion; idx: number }[];
  onRetake: () => void;
  onReconfigure: () => void;
  onExit: () => void;
  onDrillWeakTopic: (topic: string) => void;
  isAnswerCorrect: (ans: string | undefined, q: ExamQuestion) => boolean;
  flaggedCount: number;
}

export default function ExamResultView({
  questions,
  answers,
  flags,
  topicStats,
  weakestTopic,
  resultFilterMode,
  setResultFilterMode,
  resultFilterTopic,
  setResultFilterTopic,
  filteredReviewQuestions,
  onRetake,
  onReconfigure,
  onExit,
  onDrillWeakTopic,
  isAnswerCorrect,
  flaggedCount,
}: ExamResultViewProps) {
  let correctCount = 0;
  questions.forEach((q, idx) => {
    if (isAnswerCorrect(answers[idx], q)) correctCount++;
  });
  const percent = Math.round((correctCount / questions.length) * 100);

  return (
    <div className="w-full max-w-5xl xl:max-w-6xl mx-auto py-8 px-4 sm:px-6 animate-fade-in">
      {/* Score Card */}
      <div className="text-center p-8 rounded-3xl story-glass-strong shadow-2xl mb-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 mx-auto flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
          Kết Quả Bài Thi Thử
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Đánh giá kiến thức & mức độ nắm vững các chủ đề trọng tâm
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

        <div className="flex justify-center flex-wrap gap-3">
          <button
            type="button"
            onClick={onRetake}
            className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-glow flex items-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" /> Làm lại đề này
          </button>
          <button
            type="button"
            onClick={onReconfigure}
            className="py-3 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-2 text-sm"
          >
            <Settings2 className="w-4 h-4 text-indigo-500" /> Cấu hình đề mới
          </button>
          <button
            type="button"
            onClick={onExit}
            className="py-3 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm"
          >
            Về Danh sách Đề
          </button>
        </div>
      </div>

      {/* TOPIC WEAKNESS BREAKDOWN */}
      {topicStats.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl story-glass shadow-xl mb-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Phân Tích Lỗ Hổng Theo Chuyên Đề
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Định vị phần kiến thức đã vững vàng và phần còn bị &quot;liệt&quot; để ôn tập có trọng tâm
                </p>
              </div>
            </div>

            {weakestTopic && weakestTopic.percent < 80 && (
              <button
                type="button"
                onClick={() => onDrillWeakTopic(weakestTopic.topic)}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-glow-danger transition-all"
                title="Tự động bốc đề thi riêng cho chuyên đề yếu nhất này"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Cày ngay chuyên đề yếu nhất: {weakestTopic.topic}</span>
              </button>
            )}
          </div>

          {/* Critical Alert if any topic < 50% */}
          {weakestTopic && weakestTopic.percent < 50 && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-800 dark:text-rose-200">
                  Cảnh báo lỗ hổng nghiêm trọng ở chuyên đề &quot;{weakestTopic.topic}&quot; ({weakestTopic.percent}%)
                </p>
                <p className="text-rose-600 dark:text-rose-300/80 leading-relaxed">
                  Bạn làm sai {weakestTopic.wrong}/{weakestTopic.total} câu ở phần này. Nhấn nút màu đỏ ở trên để cày riêng 25 câu của chuyên đề này nhằm lấp lỗ hổng ngay trước ngày thi!
                </p>
              </div>
            </div>
          )}

          {/* Topic List with Progress Bars */}
          <div className="space-y-3.5">
            {topicStats.map((item) => {
              const isSelected = resultFilterTopic === item.topic;
              return (
                <div
                  key={item.topic}
                  onClick={() => {
                    setResultFilterTopic((prev) => (prev === item.topic ? null : item.topic));
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-400/30'
                      : 'bg-slate-50/60 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {item.topic}
                      </span>
                      {item.status === 'mastered' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          ✓ Vững vàng
                        </span>
                      ) : item.status === 'review' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          ⚠ Cần củng cố
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          ✖ Lỗ hổng lớn
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        Đúng: <strong className="text-slate-900 dark:text-white font-mono">{item.correct}</strong>/{item.total} câu
                      </span>
                      <span
                        className={`font-black font-mono text-base ${
                          item.percent >= 80
                            ? 'text-emerald-500'
                            : item.percent >= 50
                            ? 'text-amber-500'
                            : 'text-rose-500'
                        }`}
                      >
                        {item.percent}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        item.percent >= 80
                          ? 'bg-emerald-500'
                          : item.percent >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                    <span>
                      {isSelected
                        ? '✓ Đang lọc câu hỏi chuyên đề này bên dưới'
                        : '👉 Bấm vào đây để lọc danh sách câu hỏi phần này'}
                    </span>
                    {item.wrong > 0 && (
                      <span className="text-rose-400 font-medium font-mono">{item.wrong} câu sai</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Question Review Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Chi tiết từng câu hỏi ({filteredReviewQuestions.length}/{questions.length} câu):
        </h3>

        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          <button
            type="button"
            onClick={() => {
              setResultFilterMode('all');
              setResultFilterTopic(null);
            }}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              resultFilterMode === 'all' && !resultFilterTopic
                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tất cả ({questions.length})
          </button>
          <button
            type="button"
            onClick={() => setResultFilterMode('wrong')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              resultFilterMode === 'wrong'
                ? 'bg-rose-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Chỉ câu sai ({questions.length - correctCount})
          </button>
          <button
            type="button"
            onClick={() => setResultFilterMode('flagged')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              resultFilterMode === 'flagged'
                ? 'bg-amber-600 text-white font-bold shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Đã cắm cờ ({flaggedCount})
          </button>
          {resultFilterTopic && (
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center gap-1 font-semibold">
              Lọc: {resultFilterTopic}
              <button
                type="button"
                onClick={() => setResultFilterTopic(null)}
                className="hover:text-white font-bold ml-1"
              >
                ×
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Questions List */}
      {filteredReviewQuestions.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
          Không có câu hỏi nào khớp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviewQuestions.map(({ q, idx }) => {
            const userAns = answers[idx];
            const isCorrect = isAnswerCorrect(userAns, q);
            const wasFlagged = Boolean(flags[idx]);

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
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Câu {idx + 1}
                    </span>
                    {q.topic && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {q.topic}
                      </span>
                    )}
                    {wasFlagged && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        <Flag className="w-3 h-3 fill-current" /> Đã gắn cờ
                      </span>
                    )}
                  </div>
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

                <CodeQuestionRenderer
                  content={q.sentence}
                  className="text-base font-medium text-slate-900 dark:text-slate-100 mb-3"
                />

                <div className="space-y-1.5 text-xs font-medium pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                  <div>
                    <span className="text-slate-400">Bạn chọn: </span>
                    <span
                      className={`font-bold ${
                        isCorrect
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
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
                  {q.explanation && (
                    <p className="text-slate-500 dark:text-slate-400 italic mt-1">
                      💡 Giải thích: {q.explanation}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
