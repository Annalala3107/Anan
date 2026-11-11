'use client';

import React from 'react';
import { Word } from '@/lib/types';
import { Settings2, Layers, Clock, BookOpen, Check, Play } from 'lucide-react';

interface ExamConfigViewProps {
  words: Word[];
  filteredAvailableCount: number;
  targetCount: number;
  setTargetCount: (n: number) => void;
  targetMinutes: number;
  setTargetMinutes: (n: number) => void;
  availableTopics: { name: string; count: number }[];
  selectedTopics: string[];
  toggleAllTopics: () => void;
  handleToggleTopic: (name: string) => void;
  estimatedSecsPerQ: string;
  onExit: () => void;
  onStartExam: () => void;
}

export default function ExamConfigView({
  words,
  filteredAvailableCount,
  targetCount,
  setTargetCount,
  targetMinutes,
  setTargetMinutes,
  availableTopics,
  selectedTopics,
  toggleAllTopics,
  handleToggleTopic,
  estimatedSecsPerQ,
  onExit,
  onStartExam,
}: ExamConfigViewProps) {
  return (
    <div className="w-full max-w-4xl mx-auto py-4 sm:py-6 px-3.5 sm:px-6 animate-fade-in">
      <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold shadow-sm">
            <Settings2 className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">
                Chế độ Thi Thử
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {words[0]?.subject || 'Ngân hàng đề thi'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              Thiết Lập Phòng Thi Linh Hoạt
            </h1>
          </div>
        </div>

        {/* Section 1: Question Count Selector */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" /> Số lượng câu hỏi
            </span>
            <span className="text-indigo-500 font-bold font-mono text-sm">
              {Math.min(targetCount, filteredAvailableCount)} / {filteredAvailableCount} câu khả dụng
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[25, 50, 60].map((num) => {
              const disabled = num > filteredAvailableCount;
              const isSelected = targetCount === num;
              return (
                <button
                  key={num}
                  type="button"
                  disabled={disabled}
                  onClick={() => setTargetCount(num)}
                  className={`p-3.5 rounded-2xl border-2 font-bold text-xs transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-500/15 dark:bg-indigo-950/50 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.02]'
                      : disabled
                      ? 'opacity-30 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed bg-slate-50 dark:bg-slate-900/30'
                      : 'bg-white/60 dark:bg-[#0F172A]/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#131D31]'
                  }`}
                >
                  <span className={`text-xl font-black block ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>{num}</span>
                  <span className={`text-[11px] ${isSelected ? 'text-indigo-600 dark:text-indigo-300 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                    {num === 25 ? 'Thi nhanh' : num === 50 ? 'Chuẩn kỳ thi' : 'Đề chính quy'}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setTargetCount(filteredAvailableCount)}
              className={`p-3.5 rounded-2xl border-2 font-bold text-xs transition-all text-center cursor-pointer ${
                targetCount === filteredAvailableCount
                  ? 'bg-indigo-500/15 dark:bg-indigo-950/50 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.02]'
                  : 'bg-white/60 dark:bg-[#0F172A]/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#131D31]'
              }`}
            >
              <span className={`text-xl font-black block ${targetCount === filteredAvailableCount ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>Tất cả</span>
              <span className={`text-[11px] ${targetCount === filteredAvailableCount ? 'text-indigo-600 dark:text-indigo-300 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                {filteredAvailableCount} câu (Speed Run)
              </span>
            </button>
          </div>
        </div>

        {/* Section 2: Duration Selector */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-500" /> Thời gian làm bài
            </span>
            <span className="text-rose-500 font-bold font-mono text-sm">
              {targetMinutes === -1 ? 'Không giới hạn' : `${targetMinutes} phút`}
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[10, 30, 45, 60].map((mins) => {
              const isSelected = targetMinutes === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setTargetMinutes(mins)}
                  className={`p-3.5 rounded-2xl border-2 font-bold text-xs transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-rose-500/15 dark:bg-rose-950/50 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)] text-rose-600 dark:text-rose-300 scale-[1.02]'
                      : 'bg-white/60 dark:bg-[#0F172A]/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#131D31]'
                  }`}
                >
                  <span className={`text-xl font-black block ${isSelected ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>{mins}&apos;</span>
                  <span className={`text-[11px] ${isSelected ? 'text-rose-600 dark:text-rose-300 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                    {mins === 10 ? 'Tốc độ cao' : mins === 45 ? 'Chuẩn 50 câu' : 'Vừa phải'}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setTargetMinutes(-1)}
              className={`col-span-2 sm:col-span-4 p-3 rounded-2xl border-2 font-bold text-xs transition-all text-center flex items-center justify-center gap-2 cursor-pointer ${
                targetMinutes === -1
                  ? 'bg-emerald-500/15 dark:bg-emerald-950/50 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-emerald-600 dark:text-emerald-300 scale-[1.01]'
                  : 'bg-white/60 dark:bg-[#0F172A]/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#131D31]'
              }`}
            >
              <span>∞ Không giới hạn thời gian (Tự luyện thong thả)</span>
            </button>
          </div>
        </div>

        {/* Section 3: Topic Scope Filter */}
        {availableTopics.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" /> Phạm vi Chuyên đề (
                {selectedTopics.length}/{availableTopics.length})
              </label>
              <button
                type="button"
                onClick={toggleAllTopics}
                className="text-xs text-indigo-500 hover:text-indigo-400 font-semibold"
              >
                {selectedTopics.length === availableTopics.length
                  ? 'Bỏ chọn tất cả'
                  : 'Chọn tất cả'}
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {availableTopics.map((top) => {
                const isChecked = selectedTopics.includes(top.name);
                return (
                  <button
                    key={top.name}
                    type="button"
                    onClick={() => handleToggleTopic(top.name)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                      isChecked
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                          isChecked
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'border-slate-400 dark:border-slate-600'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate max-w-[240px] sm:max-w-md">{top.name}</span>
                    </div>
                    <span className="text-[11px] font-mono opacity-70 shrink-0">
                      {top.count} câu
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Metrics Bar */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-around text-center text-xs">
          <div>
            <p className="text-slate-400 font-bold uppercase text-[10px]">Đề thi</p>
            <p className="font-mono font-black text-base text-indigo-600 dark:text-indigo-400">
              {Math.min(targetCount, filteredAvailableCount)} câu
            </p>
          </div>
          <div className="w-[1px] h-8 bg-indigo-200 dark:bg-indigo-800" />
          <div>
            <p className="text-slate-400 font-bold uppercase text-[10px]">Thời gian</p>
            <p className="font-mono font-black text-base text-rose-500">
              {targetMinutes === -1 ? '∞' : `${targetMinutes}p`}
            </p>
          </div>
          <div className="w-[1px] h-8 bg-indigo-200 dark:bg-indigo-800" />
          <div>
            <p className="text-slate-400 font-bold uppercase text-[10px]">Ước tính mỗi câu</p>
            <p className="font-mono font-black text-base text-emerald-500">{estimatedSecsPerQ}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3 pt-2">
          <button
            type="button"
            onClick={onExit}
            className="w-full sm:w-auto py-3.5 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm active:scale-95 touch-manipulation"
          >
            Quay lại
          </button>
          <button
            type="button"
            disabled={filteredAvailableCount === 0}
            onClick={onStartExam}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-black flex items-center justify-center gap-2 shadow-glow text-sm transition-all disabled:opacity-50 active:scale-95 touch-manipulation select-none"
          >
            <Play className="w-4 h-4 fill-current" />
            <span className="sm:hidden">BẮT ĐẦU LÀM BÀI THI</span>
            <span className="hidden sm:inline">BẮT ĐẦU LÀM BÀI [Enter]</span>
          </button>
        </div>
      </div>
    </div>
  );
}
