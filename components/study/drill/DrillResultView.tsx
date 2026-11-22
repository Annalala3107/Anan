'use client';

import React from 'react';
import { Trophy, ArrowRight } from 'lucide-react';
import { CheckpointPart } from './types';

interface DrillResultViewProps {
  activePart: CheckpointPart;
  nextSequentialPart: CheckpointPart | null;
  totalItemsCount: number;
  totalMastered: number;
  firstTryScore: number;
  totalMistakesMade: number;
  retryMistakesAtEnd: boolean;
  onStartPart: (part: CheckpointPart) => void;
  onReconfigure: () => void;
  onExit: () => void;
}

export default function DrillResultView({
  activePart,
  nextSequentialPart,
  totalItemsCount,
  totalMastered,
  firstTryScore,
  totalMistakesMade,
  retryMistakesAtEnd,
  onStartPart,
  onReconfigure,
  onExit,
}: DrillResultViewProps) {
  const totalInPart = activePart.items.length || 1;
  const accuracy = Math.round((firstTryScore / totalInPart) * 100);

  return (
    <div className="max-w-lg mx-auto text-center py-10 px-6 animate-fade-in">
      <div className="p-7 sm:p-8 rounded-3xl glass-elevated">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-5 shadow-glow">
          <Trophy className="w-10 h-10 animate-bounce" />
        </div>

        <span className="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          Hoàn thành {activePart.title}
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-3 mb-1">
          {activePart.subtitle}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-xs sm:text-sm">
          {totalMistakesMade > 0 && retryMistakesAtEnd
            ? `Bạn đã khắc phục xong toàn bộ ${totalMistakesMade} lượt sai để nắm chắc 100% chặng này!`
            : 'Tuyệt vời! Bạn đã nắm vững toàn bộ kiến thức của chặng này.'}
        </p>

        <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 mb-7 grid grid-cols-3 gap-2 items-center">
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase">Đúng ngay lượt 1</p>
            <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {firstTryScore}/{totalInPart}
            </p>
          </div>
          <div className="border-x border-slate-300 dark:border-slate-700 px-2">
            <p className="text-[11px] text-slate-500 font-bold uppercase">Tỉ lệ lượt 1</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-500">{accuracy}%</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase">Đã sửa sai</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-500">{totalMistakesMade}</p>
          </div>
        </div>

        <div className="space-y-3">
          {nextSequentialPart && (
            <button
              type="button"
              onClick={() => onStartPart(nextSequentialPart)}
              className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                🚀 Học tiếp {nextSequentialPart.title} ({nextSequentialPart.subtitle}) [Enter]
              </span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={onReconfigure}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all cursor-pointer"
          >
            📋 Chọn chặng khác ({totalMastered}/{totalItemsCount} câu đã thuộc)
          </button>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => onStartPart(activePart)}
              className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              🔄 Làm lại chặng này
            </button>
            <button
              type="button"
              onClick={onExit}
              className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Về Trang chủ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
