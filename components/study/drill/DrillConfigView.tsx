'use client';

import React from 'react';
import {
  ListChecks,
  Trophy,
  Sparkles,
  Play,
  Layers,
  Check,
  AlertTriangle,
  RotateCcw,
  Shuffle,
  Zap,
} from 'lucide-react';
import GpuProgressBar from '@/components/ui/GpuProgressBar';
import { CheckpointPart } from './types';

interface DrillConfigViewProps {
  subjectLabel?: string;
  totalItemsCount: number;
  totalMastered: number;
  partSize: number;
  setPartSize: (val: number) => void;
  sequentialParts: CheckpointPart[];
  unmasteredPart: CheckpointPart | null;
  mistakesPart: CheckpointPart | null;
  retryMistakesAtEnd: boolean;
  setRetryMistakesAtEnd: React.Dispatch<React.SetStateAction<boolean>>;
  shuffleOptions: boolean;
  setShuffleOptions: React.Dispatch<React.SetStateAction<boolean>>;
  autoAdvanceCorrect: boolean;
  setAutoAdvanceCorrect: React.Dispatch<React.SetStateAction<boolean>>;
  onStartPart: (part: CheckpointPart) => void;
  onExit: () => void;
}

export default function DrillConfigView({
  subjectLabel,
  totalItemsCount,
  totalMastered,
  partSize,
  setPartSize,
  sequentialParts,
  unmasteredPart,
  mistakesPart,
  retryMistakesAtEnd,
  setRetryMistakesAtEnd,
  shuffleOptions,
  setShuffleOptions,
  autoAdvanceCorrect,
  setAutoAdvanceCorrect,
  onStartPart,
  onExit,
}: DrillConfigViewProps) {
  const overallPercent =
    totalItemsCount > 0 ? Math.round((totalMastered / totalItemsCount) * 100) : 0;

  return (
    <div className="w-full max-w-5xl xl:max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-8 animate-fade-in">
      <div className="p-5 sm:p-8 md:p-10 rounded-3xl glass-elevated space-y-7">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-lg shrink-0">
              <ListChecks className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  🎯 Chia Chặng Không Sót Câu • Đảo Đáp Án Chống Học Vẹt
                </span>
                <span className="text-xs text-slate-400 font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                  {subjectLabel || 'Bộ đề ôn tập'} • {totalItemsCount} câu
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                Luyện Theo Chặng &amp; Hiểu Bản Chất (Checkpoint Tutor)
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="self-start sm:self-center px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Quay lại
          </button>
        </div>

        {/* Overall Deck Mastery Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-2.5">
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
            <span className="text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-500" />
              Tiến độ phá đảo toàn bộ đề này:
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono">
              Đã thuộc {totalMastered} / {totalItemsCount} câu ({overallPercent}%)
            </span>
          </div>
          <GpuProgressBar
            percent={overallPercent}
            minVisiblePercent={totalMastered > 0 ? 4 : 0}
            trackClassName="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full"
            barClassName="bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full duration-500"
          />
        </div>

        {/* Smart Special Checkpoints (Unmastered & Mistakes) */}
        {(unmasteredPart || mistakesPart) && (
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Chặng Thông Minh (Gom câu lẻ &amp; Câu sai)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {unmasteredPart && (
                <button
                  type="button"
                  onClick={() => onStartPart(unmasteredPart)}
                  className="p-4 sm:p-5 rounded-2xl border-2 border-indigo-500/40 hover:border-indigo-500 bg-indigo-500/5 dark:bg-indigo-950/30 text-left transition-all flex items-center justify-between gap-4 group cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-600 text-white">
                        Khuyên dùng
                      </span>
                      <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-indigo-400 transition-colors">
                        🔥 {unmasteredPart.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {unmasteredPart.subtitle} — Học dứt điểm không trùng câu đã thuộc.
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-md">
                    <Play className="w-4 h-4 fill-white" />
                  </div>
                </button>
              )}

              {mistakesPart && (
                <button
                  type="button"
                  onClick={() => onStartPart(mistakesPart)}
                  className="p-4 sm:p-5 rounded-2xl border-2 border-rose-500/40 hover:border-rose-500 bg-rose-500/5 dark:bg-rose-950/30 text-left transition-all flex items-center justify-between gap-4 group cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-600 text-white">
                        Cấp tốc
                      </span>
                      <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-rose-400 transition-colors">
                        🛠️ {mistakesPart.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {mistakesPart.subtitle} — Xóa bỏ hoàn toàn các lỗ hổng hay nhầm.
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-md">
                    <Play className="w-4 h-4 fill-white" />
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Part Size + Sequential Checkpoints Grid */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" /> Chọn Chặng theo thứ tự đề (Không bao giờ sót câu lẻ)
            </label>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Chia mỗi chặng:</span>
              {[
                { label: '15 câu', val: 15 },
                { label: '20 câu', val: 20 },
                { label: '30 câu', val: 30 },
                { label: `Tất cả (${totalItemsCount})`, val: totalItemsCount },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setPartSize(opt.val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    partSize === opt.val
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {sequentialParts.map((part) => {
              const pct = Math.round((part.masteredCount / part.items.length) * 100);
              const isDone = part.masteredCount === part.items.length;
              const isStarted = part.masteredCount > 0 || part.learningCount > 0;

              return (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => onStartPart(part)}
                  className={`p-4 sm:p-5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between group cursor-pointer ${
                    isDone
                      ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/50 hover:border-emerald-500'
                      : isStarted
                      ? 'bg-indigo-500/5 dark:bg-indigo-950/20 border-indigo-500/40 hover:border-indigo-500'
                      : 'bg-white/60 dark:bg-[#131D31]/70 border-slate-200 dark:border-slate-800 hover:border-emerald-500/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-black text-base text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                        {part.title}
                      </span>
                      {isDone ? (
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Đã phá đảo
                        </span>
                      ) : isStarted ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                          Đang cày ({pct}%)
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                          Chưa học
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                      {part.subtitle}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-500 dark:text-slate-400">
                        Đã thuộc: {part.masteredCount}/{part.items.length}
                      </span>
                      {part.mistakeCount > 0 ? (
                        <span className="text-rose-500 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {part.mistakeCount} câu từng sai
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">Bắt đầu &rarr;</span>
                      )}
                    </div>
                    <GpuProgressBar
                      percent={pct}
                      minVisiblePercent={isStarted ? 6 : 0}
                      trackClassName="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"
                      barClassName={`rounded-full ${isDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tutor Mode Settings Toggles */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">
            Cấu hình hỗ trợ học sâu trong chặng
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setRetryMistakesAtEnd((v) => !v)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                retryMistakesAtEnd
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-slate-900 dark:text-white'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              <RotateCcw
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  retryMistakesAtEnd ? 'text-emerald-500' : 'text-slate-400'
                }`}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold">Ép làm lại câu sai cuối chặng</p>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      retryMistakesAtEnd
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {retryMistakesAtEnd ? 'BẬT' : 'TẮT'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Sai câu nào sẽ được hỏi lại ở cuối chặng đến khi đúng 100%.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShuffleOptions((v) => !v)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                shuffleOptions
                  ? 'bg-indigo-500/10 border-indigo-500/50 text-slate-900 dark:text-white'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              <Shuffle
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  shuffleOptions ? 'text-indigo-500' : 'text-slate-400'
                }`}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold">Đảo vị trí đáp án A/B/C/D</p>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      shuffleOptions
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {shuffleOptions ? 'ĐANG BẬT' : 'TẮT'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Chống học vẹt vị trí đáp án khi ôn đi ôn lại nhiều lần.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAutoAdvanceCorrect((v) => !v)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                autoAdvanceCorrect
                  ? 'bg-amber-500/10 border-amber-500/50 text-slate-900 dark:text-white'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              <Zap
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  autoAdvanceCorrect ? 'text-amber-500' : 'text-slate-400'
                }`}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold">Tự qua câu khi ĐÚNG (1.1s)</p>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      autoAdvanceCorrect
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {autoAdvanceCorrect ? 'BẬT' : 'TẮT'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Tắt để tự bấm Enter sau khi đọc kỹ giải thích chi tiết.
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
