'use client';

import React from 'react';
import {
  Zap,
  Trophy,
  Sparkles,
  BookOpen,
  Layers,
  Clock,
  Target,
  ListOrdered,
  Shuffle,
  Flame,
} from 'lucide-react';
import { QuestionSelectionMode } from '@/lib/quizHelpers';

interface LearnConfigViewProps {
  subjectLabel?: string;
  availableCount: number;
  masteredCount: number;
  unmasteredCount: number;
  dueCount: number;
  effectiveTargetCount: number;
  studyMethod: 'flashcard' | 'rapid';
  setStudyMethod: (val: 'flashcard' | 'rapid') => void;
  batchMode: 'preset' | 'all' | 'remaining' | 'due';
  setBatchMode: (val: 'preset' | 'all' | 'remaining' | 'due') => void;
  batchSize: number;
  setBatchSize: (val: number) => void;
  selectionMode: QuestionSelectionMode;
  setSelectionMode: (val: QuestionSelectionMode) => void;
  shuffleChoices: boolean;
  setShuffleChoices: React.Dispatch<React.SetStateAction<boolean>>;
  streakTarget: number;
  setStreakTarget: (val: number) => void;
  onStartSession: () => void;
  onExit: () => void;
}

export default function LearnConfigView({
  subjectLabel,
  availableCount,
  masteredCount,
  unmasteredCount,
  dueCount,
  effectiveTargetCount,
  studyMethod,
  setStudyMethod,
  batchMode,
  setBatchMode,
  batchSize,
  setBatchSize,
  selectionMode,
  setSelectionMode,
  shuffleChoices,
  setShuffleChoices,
  streakTarget,
  setStreakTarget,
  onStartSession,
  onExit,
}: LearnConfigViewProps) {
  const overallPct =
    availableCount > 0 ? Math.round((masteredCount / availableCount) * 100) : 0;
  const presetNumbers = [10, 20, 35].filter((n) => n < availableCount);
  const hasPartialRemaining =
    unmasteredCount > 0 && unmasteredCount < availableCount;

  return (
    <div className="w-full max-w-5xl xl:max-w-6xl mx-auto py-6 sm:py-8 px-4 sm:px-8 animate-fade-in">
      <div className="p-6 sm:p-8 md:p-10 rounded-3xl glass-elevated space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold shadow-glow shrink-0">
              <Zap className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 whitespace-nowrap">
                  ⚡ Không Sót Câu Lẻ • Đảo Đáp Án Chống Học Vẹt
                </span>
                <span className="text-xs text-slate-400 font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 whitespace-nowrap">
                  {subjectLabel || 'Ngân hàng câu hỏi'} • {availableCount} câu
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                Chế Độ Thẻ Lật 3D & Cày Phản Xạ (Rapid Muscle Memory)
              </h1>
            </div>
          </div>

          {/* Live Deck Mastery Pill */}
          <div className="px-4 py-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center gap-3 self-start sm:self-center">
            <Trophy className="w-4 h-4 text-indigo-400 shrink-0" />
            <div className="text-xs">
              <span className="text-slate-400 font-semibold block">Tiến độ bộ đề này:</span>
              <span className="font-black text-indigo-600 dark:text-indigo-300">
                Đã thuộc {masteredCount}/{availableCount} câu ({overallPct}%)
              </span>
            </div>
          </div>
        </div>

        {/* Method Selector: Flashcard 3D vs Speed MCQ */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" /> 1. Chọn hình thức học đợt này
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setStudyMethod('flashcard')}
              className={`p-5 rounded-2xl border-2 text-left transition-all relative cursor-pointer ${
                studyMethod === 'flashcard'
                  ? 'bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.25)] text-slate-900 dark:text-white scale-[1.01]'
                  : 'bg-white/60 dark:bg-[#0F172A]/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#131D31]'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span
                  className={`font-black text-sm sm:text-base flex items-center gap-2 ${
                    studyMethod === 'flashcard'
                      ? 'text-indigo-600 dark:text-indigo-300'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-indigo-500" /> Thẻ Lật 3D (Khuyên dùng)
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                    studyMethod === 'flashcard'
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Chuẩn SRS SM-2
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                Lật thẻ 3D, đọc giải thích chi tiết và tự đánh giá [1-3]. Giúp hiểu sâu bản chất và ghi nhớ bền vững vào trí nhớ dài hạn.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStudyMethod('rapid')}
              className={`p-5 rounded-2xl border-2 text-left transition-all relative cursor-pointer ${
                studyMethod === 'rapid'
                  ? 'bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.25)] text-slate-900 dark:text-white scale-[1.01]'
                  : 'bg-white/60 dark:bg-[#0F172A]/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#131D31]'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span
                  className={`font-black text-sm sm:text-base flex items-center gap-2 ${
                    studyMethod === 'rapid'
                      ? 'text-indigo-600 dark:text-indigo-300'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-500" /> Cày Phản Xạ Trắc Nghiệm
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                    studyMethod === 'rapid'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Tốc độ 0.4s
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                Chọn nhanh 1-4, đúng tự lướt qua trong 0.4s, sai bị ép làm lại sau 3 câu để rèn phản xạ nhanh trước kỳ thi.
              </p>
            </button>
          </div>
        </div>

        {/* Batch Size Selector */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" /> 2. Chọn số lượng câu muốn cày đợt này
            </span>
            <span className="text-indigo-500 font-bold font-mono text-xs sm:text-sm">
              Đợt này: {effectiveTargetCount} / {availableCount} câu
              {unmasteredCount > 0 && unmasteredCount < availableCount
                ? ` (Còn ${unmasteredCount} câu chưa thuộc)`
                : ''}
            </span>
          </label>

          <div
            className={`grid grid-cols-2 ${
              hasPartialRemaining ? 'sm:grid-cols-5' : 'sm:grid-cols-4'
            } gap-3`}
          >
            {presetNumbers.map((num) => {
              const isSelected = batchMode === 'preset' && batchSize === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setBatchMode('preset');
                    setBatchSize(num);
                  }}
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 font-bold transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-500/15 dark:bg-indigo-950/50 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.02]'
                      : 'bg-white/60 dark:bg-[#0F172A]/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#131D31]'
                  }`}
                >
                  <span
                    className={`text-2xl sm:text-3xl font-black block ${
                      isSelected
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {num}
                  </span>
                  <span
                    className={`text-xs font-semibold mt-1 block whitespace-nowrap ${
                      isSelected
                        ? 'text-indigo-600 dark:text-indigo-300 font-bold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {num === 10 ? 'Cực nhanh (5p)' : num === 20 ? 'Chuẩn đợt học' : 'Chuyên sâu'}
                  </span>
                </button>
              );
            })}

            {hasPartialRemaining && (
              <button
                type="button"
                onClick={() => setBatchMode('remaining')}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 font-bold transition-all text-center cursor-pointer relative overflow-hidden ${
                  batchMode === 'remaining'
                    ? 'bg-emerald-500/15 dark:bg-emerald-950/50 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)] scale-[1.02]'
                    : 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/40 text-slate-700 dark:text-slate-200 hover:border-emerald-500'
                }`}
              >
                <span className="text-2xl sm:text-3xl font-black block text-emerald-600 dark:text-emerald-400">
                  Còn {unmasteredCount}
                </span>
                <span className="text-xs font-bold mt-1 block whitespace-nowrap text-emerald-600 dark:text-emerald-300">
                  ⚡ Quét nốt câu lẻ
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setBatchMode('all')}
              className={`p-3.5 sm:p-4 rounded-2xl border-2 font-bold transition-all text-center cursor-pointer ${
                batchMode === 'all'
                  ? 'bg-indigo-500/15 dark:bg-indigo-950/50 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.25)] scale-[1.02]'
                  : 'bg-white/60 dark:bg-[#0F172A]/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-[#131D31]'
              }`}
            >
              <span
                className={`text-2xl sm:text-3xl font-black block ${
                  batchMode === 'all'
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                Tất cả ({availableCount})
              </span>
              <span
                className={`text-xs font-semibold mt-1 block whitespace-nowrap ${
                  batchMode === 'all'
                    ? 'text-indigo-600 dark:text-indigo-300 font-bold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                🔥 Làm hết cả đề
              </span>
            </button>
          </div>

          {dueCount > 0 && (
            <button
              type="button"
              onClick={() => setBatchMode('due')}
              className={`mt-3 w-full p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                batchMode === 'due'
                  ? 'bg-amber-500/15 dark:bg-amber-950/45 border-amber-500 shadow-[0_0_22px_rgba(245,158,11,0.25)]'
                  : 'bg-amber-500/5 dark:bg-amber-950/15 border-amber-500/35 hover:border-amber-500/70'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    ⏰ Ôn câu đến hạn SRS hôm nay ({dueCount} câu)
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Chỉ lọc các câu đã tới lịch nhắc lại theo thuật toán lặp lại ngắt quãng SM-2.
                  </p>
                </div>
              </div>
              <span
                className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-full shrink-0 ${
                  batchMode === 'due'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                }`}
              >
                {batchMode === 'due' ? 'Đang chọn' : 'Chọn ôn'}
              </span>
            </button>
          )}
        </div>

        {/* Smart Queue Order & Anti-Rote Option Shuffle */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-500" /> 3. Chế độ bốc câu & Chống học vẹt vị trí đáp án A/B/C/D
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSelectionMode('smart')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectionMode === 'smart'
                  ? 'bg-indigo-500/10 border-indigo-500 text-slate-900 dark:text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Ưu tiên Chưa thuộc
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                  Mặc định
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tự lấy các câu chưa học & hay sai theo thứ tự, không lặp lại câu đã thuộc ở đợt trước.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectionMode('sequential')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectionMode === 'sequential'
                  ? 'bg-indigo-500/10 border-indigo-500 text-slate-900 dark:text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-emerald-500" /> Tuần tự (Câu 1 &rarr; {availableCount})
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Đi lần lượt từ Câu 1 đến hết theo đúng thứ tự trong đề gốc.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setShuffleChoices((v) => !v)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                shuffleChoices
                  ? 'bg-amber-500/10 border-amber-500 text-slate-900 dark:text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <Shuffle className="w-3.5 h-3.5 text-amber-500" /> Đảo vị trí đáp án A–D
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    shuffleChoices
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {shuffleChoices ? 'ĐANG BẬT' : 'TẮT'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Trộn ngẫu nhiên thứ tự A/B/C/D ở mỗi lượt xoay tua để nhớ nội dung chứ không học vẹt vị trí.
              </p>
            </button>
          </div>
        </div>

        {/* Mastery Threshold Selector */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" /> 4. Tiêu chuẩn tốt nghiệp mỗi câu
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setStreakTarget(2)}
              className={`p-4 sm:p-5 rounded-2xl border-2 text-left transition-all relative cursor-pointer touch-manipulation select-none active:scale-[0.99] ${
                streakTarget === 2
                  ? 'bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.25)] text-slate-900 dark:text-white scale-[1.01]'
                  : 'bg-white/60 dark:bg-[#0F172A]/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#131D31]'
              }`}
            >
              <div className="flex items-start sm:items-center justify-between gap-2 mb-1.5">
                <span
                  className={`font-black text-sm sm:text-base ${
                    streakTarget === 2
                      ? 'text-indigo-600 dark:text-indigo-300'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {studyMethod === 'flashcard'
                    ? 'Chuẩn ghi nhớ sâu (Khuyên dùng)'
                    : 'Chuẩn ghi nhớ sắt đá (Khuyên dùng)'}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                    streakTarget === 2
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  2 chu kỳ
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                {studyMethod === 'flashcard'
                  ? 'Đạt đánh giá [Đã thuộc lầu] hoặc tự tin nhớ đúng qua 2 lượt ôn ngắt quãng.'
                  : 'Phải chọn đúng 2 lần liên tiếp (với vị trí đáp án đảo mới) mới tính là thuộc lầu lầu.'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setStreakTarget(1)}
              className={`p-4 sm:p-5 rounded-2xl border-2 text-left transition-all relative cursor-pointer touch-manipulation select-none active:scale-[0.99] ${
                streakTarget === 1
                  ? 'bg-indigo-500/10 dark:bg-indigo-950/40 border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.25)] text-slate-900 dark:text-white scale-[1.01]'
                  : 'bg-white/60 dark:bg-[#0F172A]/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#131D31]'
              }`}
            >
              <div className="flex items-start sm:items-center justify-between gap-2 mb-1.5">
                <span
                  className={`font-black text-sm sm:text-base ${
                    streakTarget === 1
                      ? 'text-indigo-600 dark:text-indigo-300'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  Speed Run (Lướt nhanh)
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                    streakTarget === 1
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  1 chu kỳ
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                {studyMethod === 'flashcard'
                  ? 'Đạt đánh giá [Đã thuộc lầu] 1 lần là đánh dấu Thành thạo ngay. Dành cho người đã ôn trước.'
                  : 'Đúng 1 lần là qua câu trong đợt này (đưa vào Đang ôn; hoàn thành thêm 1 lượt nữa để đạt Thành thạo ≥80%).'}
              </p>
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 sm:gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onExit}
            className="w-full sm:w-auto py-3.5 sm:py-4 px-6 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm active:scale-95 touch-manipulation"
          >
            Quay lại
          </button>
          <button
            type="button"
            onClick={onStartSession}
            className="w-full sm:flex-1 py-4 px-6 sm:px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black flex items-center justify-center gap-2.5 shadow-glow text-sm sm:text-base transition-all active:scale-95 touch-manipulation select-none cursor-pointer"
          >
            {studyMethod === 'flashcard' ? (
              <>
                <BookOpen className="w-5 h-5" />
                <span className="sm:hidden">
                  HỌC THẺ 3D ({effectiveTargetCount} CÂU)
                </span>
                <span className="hidden sm:inline">
                  BẮT ĐẦU HỌC THẺ LẬT 3D ({effectiveTargetCount} CÂU) [Enter]
                </span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 fill-current" />
                <span className="sm:hidden">
                  CÀY PHẢN XẠ ({effectiveTargetCount} CÂU)
                </span>
                <span className="hidden sm:inline">
                  BẮT ĐẦU CÀY PHẢN XẠ ({effectiveTargetCount} CÂU) [Enter]
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
