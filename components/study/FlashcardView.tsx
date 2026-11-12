'use client';

import { StandardQuestion } from '@/lib/quizHelpers';
import { isAnswerMatch, cleanOptionText } from '@/lib/utils';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  BookOpen,
  HelpCircle,
  Shuffle,
} from 'lucide-react';

interface FlashcardViewProps {
  currentQ: StandardQuestion;
  questionIndex: number;
  totalCount: number;
  streak: number;
  streakTarget: number;
  isFlipped: boolean;
  shuffleChoices?: boolean;
  onToggleFlip: () => void;
  onRate: (quality: 1 | 3 | 5) => void;
}

export default function FlashcardView({
  currentQ,
  questionIndex,
  totalCount,
  streak,
  streakTarget,
  isFlipped,
  shuffleChoices = true,
  onToggleFlip,
  onRate,
}: FlashcardViewProps) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* 3D Flip Container */}
      <div
        onClick={() => {
          if (!isFlipped) onToggleFlip();
        }}
        className={`relative w-full min-h-[360px] sm:min-h-[420px] rounded-3xl transition-all duration-300 cursor-pointer select-none ${
          isFlipped
            ? 'bg-gradient-to-br from-slate-900 via-[#0F172A] to-indigo-950/90 border-2 border-indigo-500/60 shadow-[0_0_35px_rgba(99,102,241,0.2)]'
            : 'bg-white dark:bg-[#0F172A] border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500/60 shadow-2xl'
        } p-6 sm:p-10 flex flex-col justify-between`}
      >
        {/* Top Card Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {currentQ.originalNumber && (
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Câu #{currentQ.originalNumber}
              </span>
            )}
            <span
              className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                isFlipped
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60'
              }`}
            >
              {isFlipped
                ? '💡 MẶT SAU: ĐÁP ÁN & GIẢI THÍCH'
                : `📌 MẶT TRƯỚC • ${currentQ.topic || currentQ.subject || 'CÂU HỎI ÔN TẬP'}`}
            </span>

            <span className="text-xs font-bold text-slate-400 hidden sm:inline">
              • Tiến độ: {questionIndex}/{totalCount}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFlip();
            }}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:text-indigo-500 dark:hover:text-indigo-400 flex items-center gap-1.5 transition-colors border border-slate-200/60 dark:border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isFlipped ? 'Xem lại câu hỏi [Space]' : 'Lật xem đáp án [Space]'}</span>
          </button>
        </div>

        {/* Center Content */}
        {!isFlipped ? (
          /* FRONT SIDE: Question + Options Preview */
          <div className="my-6 space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <CodeQuestionRenderer
                  content={currentQ.sentence}
                  className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-relaxed"
                />
              </div>
            </div>

            {/* Preview Options on Front so user can mentally solve MCQ before flipping */}
            {currentQ.options && currentQ.options.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Các phương án lựa chọn (Hãy nhẩm chọn trước khi lật thẻ):
                  </span>
                  {shuffleChoices && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1">
                      <Shuffle className="w-3 h-3" /> Đã đảo thứ tự A–D
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentQ.options.map((opt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const cleaned = cleanOptionText(opt);
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium flex items-start gap-2.5"
                      >
                        <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-black text-xs flex items-center justify-center shrink-0">
                          {letter}
                        </span>
                        <span className="leading-relaxed">{cleaned}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* BACK SIDE: Correct Answer + Highlighted Options + Deep Explanation */
          <div className="my-6 space-y-5 animate-fade-in">
            {/* Compact Question Reminder */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-300 line-clamp-2">
              <span className="font-bold text-indigo-400 mr-1.5">Câu hỏi:</span>
              {currentQ.sentence}
            </div>

            {/* Highlighted Correct Answer Box */}
            <div className="p-5 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/50 shadow-glow-success">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400 mb-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Đáp án chính xác</span>
              </div>
              <p className="text-lg sm:text-2xl font-black text-white leading-snug">
                {cleanOptionText(currentQ.correctWord)}
              </p>
            </div>

            {/* Full Options Breakdown with Correct Checkmark */}
            {currentQ.options && currentQ.options.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Các phương án trắc nghiệm {shuffleChoices ? '(Đã trộn thứ tự chống học vẹt vị trí)' : ''}:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentQ.options.map((opt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const cleaned = cleanOptionText(opt);
                    const isTrue = isAnswerMatch(
                      opt,
                      currentQ.correctWord,
                      shuffleChoices ? undefined : currentQ.answerKey
                    );
                    return (
                      <div
                        key={i}
                        className={`p-2.5 px-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-2 ${
                          isTrue
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                            : 'bg-white/5 border-white/10 text-slate-400 opacity-65'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                              isTrue
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-white/10 text-slate-400'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="truncate">{cleaned}</span>
                        </div>
                        {isTrue && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Explanation Box */}
            {currentQ.explanation && (
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-xs sm:text-sm text-indigo-100 leading-relaxed flex items-start gap-3">
                <BookOpen className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-indigo-300">Giải thích bản chất: </span>
                  {currentQ.explanation}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Hint Bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>
            Chu kỳ ghi nhớ câu này: <strong className="text-indigo-400">{streak}/{streakTarget}</strong>
          </span>
          {!isFlipped ? (
            <span className="font-bold text-indigo-500 dark:text-indigo-400 animate-pulse">
              👆 Nhấn vào thẻ hoặc bấm [Space] để lật xem đáp án
            </span>
          ) : (
            <span className="text-emerald-400 font-semibold">
              👇 Tự đánh giá mức độ nhớ của bạn bên dưới (Phím 1, 2, 3)
            </span>
          )}
        </div>
      </div>

      {/* Self-Evaluation SRS Rating Bar (Visible or active after flipping) */}
      {isFlipped ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
          <button
            type="button"
            onClick={() => onRate(1)}
            className="p-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border-2 border-rose-500/40 hover:border-rose-500 text-left transition-all flex items-center justify-between group active:scale-95"
          >
            <div>
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-black text-sm">
                <XCircle className="w-4 h-4" />
                <span>Chưa thuộc / Quên</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Đưa vào hàng đợi ôn lại ngay (Reset chu kỳ)
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-500 dark:text-rose-300 font-mono font-bold text-xs">
              [1]
            </span>
          </button>

          <button
            type="button"
            onClick={() => onRate(3)}
            className="p-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border-2 border-amber-500/40 hover:border-amber-500 text-left transition-all flex items-center justify-between group active:scale-95"
          >
            <div>
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-black text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Nhớ mang máng</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Tăng +1 chu kỳ nhớ, sẽ kiểm tra lại thêm 1 vòng
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono font-bold text-xs">
              [2]
            </span>
          </button>

          <button
            type="button"
            onClick={() => onRate(5)}
            className="p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border-2 border-emerald-500/40 hover:border-emerald-500 text-left transition-all flex items-center justify-between group active:scale-95 shadow-glow-success"
          >
            <div>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Đã thuộc lầu!</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {streakTarget > 1 && streak === 0
                  ? 'Nắm chắc bản chất — Qua câu ngay!'
                  : 'Hoàn thành câu này vào trí nhớ dài hạn'}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-mono font-bold text-xs">
              [3]
            </span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggleFlip}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm sm:text-base shadow-glow transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>LẬT THẺ XEM ĐÁP ÁN & GIẢI THÍCH [Phím Space]</span>
        </button>
      )}
    </div>
  );
}
