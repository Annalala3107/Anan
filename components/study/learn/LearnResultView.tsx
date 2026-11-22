'use client';

import React from 'react';
import { Trophy, AlertTriangle, Zap, RotateCcw } from 'lucide-react';
import { cleanOptionText, splitCorrectChoices } from '@/lib/utils';
import { StandardQuestion } from '@/lib/quizHelpers';

interface LearnResultViewProps {
  availableCount: number;
  masteredCount: number;
  unmasteredCount: number;
  totalInitialCount: number;
  studyMethod: 'flashcard' | 'rapid';
  streakTarget: number;
  batchMode: 'preset' | 'all' | 'remaining' | 'due';
  batchSize: number;
  startTime: number;
  totalAttempts: number;
  correctAttempts: number;
  maxCombo: number;
  problemQuestions: StandardQuestion[];
  onStartNextBatch: (nextCount: number) => void;
  onReconfigure: () => void;
  onExit: () => void;
}

export default function LearnResultView({
  availableCount,
  masteredCount,
  unmasteredCount,
  totalInitialCount,
  studyMethod,
  streakTarget,
  batchMode,
  batchSize,
  startTime,
  totalAttempts,
  correctAttempts,
  maxCombo,
  problemQuestions,
  onStartNextBatch,
  onReconfigure,
  onExit,
}: LearnResultViewProps) {
  const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
  const avgSecsPerQ = totalAttempts > 0 ? (elapsedSeconds / totalAttempts).toFixed(1) : '1.5';
  const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100;
  const nextBatchCount =
    batchMode === 'all' || batchMode === 'remaining'
      ? unmasteredCount
      : Math.min(batchSize, unmasteredCount);

  return (
    <div className="w-full max-w-5xl xl:max-w-6xl mx-auto py-8 px-4 sm:px-8 animate-fade-in space-y-6">
      <div className="text-center p-8 rounded-3xl glass-elevated">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white mx-auto flex items-center justify-center mb-4 shadow-glow-success">
          <Trophy className="w-8 h-8 animate-bounce" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
          {unmasteredCount === 0
            ? 'ĐÃ PHÁ ĐẢO TRỌN VẸN 100% CẢ ĐỀ!'
            : studyMethod === 'rapid' && streakTarget === 1
            ? `HOÀN THÀNH LƯỢT LƯỚT NHANH (${totalInitialCount} CÂU)!`
            : `ĐÃ THUỘC LẦU ĐỢT NÀY (${totalInitialCount} CÂU)!`}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-lg mx-auto">
          {unmasteredCount === 0
            ? `Tuyệt đỉnh! Bạn đã thuộc sạch sẽ ${availableCount}/${availableCount} câu của bộ đề này mà không sót bất kỳ câu lẻ nào.`
            : studyMethod === 'rapid' && streakTarget === 1
            ? `Tổng cộng ${masteredCount}/${availableCount} câu trong bộ đề đã đạt Thành thạo ≥80%. Chọn lại chế độ 2 chu kỳ hoặc học tiếp 1 lượt để khóa chắc kiến thức!`
            : `Bạn đã thuộc tổng cộng ${masteredCount}/${availableCount} câu trong bộ đề. Còn ${unmasteredCount} câu chưa thuộc đang chờ bạn quét sạch!`}
        </p>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 max-w-2xl mx-auto">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Tiến độ cả đề</p>
            <p className="text-2xl font-black text-emerald-500 mt-0.5">
              {masteredCount}/{availableCount}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Combo kỷ lục</p>
            <p className="text-2xl font-black text-amber-500 mt-0.5">
              🔥 {maxCombo}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Tốc độ phản xạ</p>
            <p className="text-2xl font-black text-indigo-500 mt-0.5">
              {avgSecsPerQ}s <span className="text-xs font-normal text-slate-400">/câu</span>
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Độ chuẩn xác</p>
            <p className="text-2xl font-black text-purple-500 mt-0.5">
              {accuracy}%
            </p>
          </div>
        </div>

        {/* Problem questions list (if any) */}
        {problemQuestions.length > 0 && (
          <div className="text-left mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Các câu từng bị bấm nhầm ({problemQuestions.length} câu đã sửa thành công):
              </h3>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {problemQuestions.map((pq, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs flex items-center justify-between gap-3"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1 flex-1">
                    {pq.sentence}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                    ✓{' '}
                    {splitCorrectChoices(pq.correctWord, pq.answerKey, pq.options)
                      .map((c) => cleanOptionText(c) || c)
                      .join(' | ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          {unmasteredCount > 0 && (
            <button
              type="button"
              onClick={() => onStartNextBatch(nextBatchCount)}
              className="w-full sm:flex-1 py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black transition-all shadow-glow-success text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>
                Học tiếp {nextBatchCount} câu chưa thuộc còn lại (Còn {unmasteredCount} câu) [Enter]
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onReconfigure}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-glow text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Tuỳ chỉnh đợt mới
          </button>

          <button
            type="button"
            onClick={onExit}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm cursor-pointer"
          >
            Về Trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
