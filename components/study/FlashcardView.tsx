'use client';

import { StandardQuestion } from '@/lib/quizHelpers';
import {
  isAnswerMatch,
  cleanOptionText,
  getQuestionAnswerMeta,
  formatExplanationForCurrentOptions,
  formatChoicesWithDisplayLetters,
} from '@/lib/utils';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import OptionContent from '@/components/OptionContent';
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
  const answerMeta = getQuestionAnswerMeta(
    currentQ.correctWord,
    shuffleChoices ? undefined : currentQ.answerKey,
    currentQ.options,
    currentQ.correctOptions
  );
  const displayedCorrectList = formatChoicesWithDisplayLetters(
    answerMeta.correctChoices,
    currentQ.options,
    shuffleChoices
  );
  const displayedExplanation = formatExplanationForCurrentOptions(
    currentQ.explanation,
    currentQ.options,
    currentQ.correctWord,
    currentQ.answerKey,
    shuffleChoices,
    currentQ.correctOptions
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5">
      {/* Real CSS 3D Flip Scene */}
      <div className="perspective-1200 w-full">
        <div
          className={`flashcard-3d-inner relative grid w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] preserve-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT FACE */}
          <div
            onClick={() => {
              if (!isFlipped) onToggleFlip();
            }}
            aria-hidden={isFlipped}
            className={`col-start-1 row-start-1 backface-hidden w-full min-h-[360px] sm:min-h-[420px] rounded-3xl glass-surface border-2 hover:border-cyan-500/50 dark:hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.16)] p-6 sm:p-10 flex flex-col justify-between select-none cursor-pointer transition-colors ${
              isFlipped ? 'pointer-events-none' : ''
            }`}
          >
            {/* Top Card Header (Front) */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {currentQ.originalNumber && (
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Câu #{currentQ.originalNumber}
                  </span>
                )}
                <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60">
                  📌 MẶT TRƯỚC • {currentQ.topic || currentQ.subject || 'CÂU HỎI ÔN TẬP'}
                </span>

                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
                  • Tiến độ: {questionIndex}/{totalCount}
                </span>
              </div>

              <button
                type="button"
                tabIndex={isFlipped ? -1 : 0}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFlip();
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Lật xem đáp án [Space]</span>
              </button>
            </div>

            {/* Center Content (Front: Question + Options Preview) */}
            <div className="my-6 space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <CodeQuestionRenderer
                    content={currentQ.sentence}
                    image={currentQ.image}
                    imageCaption={currentQ.imageCaption}
                    className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-relaxed"
                  />
                </div>
              </div>

              {currentQ.options && currentQ.options.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Các phương án lựa chọn (Hãy nhẩm chọn trước khi lật thẻ):
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {answerMeta.isMultiSelect && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                          Chọn {answerMeta.requiredCount} đáp án
                        </span>
                      )}
                      {shuffleChoices && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 flex items-center gap-1">
                          <Shuffle className="w-3 h-3" /> Đã đảo thứ tự A–D
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentQ.options.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i);
                      return (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-300 font-medium flex items-start gap-2.5"
                        >
                          <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-mono font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {letter}
                          </span>
                          <div className="flex-1 min-w-0">
                            <OptionContent content={opt} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Hint Bar (Front) */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
              <span>
                Chu kỳ ghi nhớ câu này:{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {streak}/{streakTarget}
                </strong>
              </span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 animate-pulse">
                👆 Nhấn vào thẻ hoặc bấm [Space] để lật xem đáp án
              </span>
            </div>
          </div>

          {/* BACK FACE */}
          <div
            aria-hidden={!isFlipped}
            className={`col-start-1 row-start-1 backface-hidden rotate-y-180 w-full min-h-[360px] sm:min-h-[420px] rounded-3xl glass-elevated bg-gradient-to-br from-white/95 via-indigo-50/60 to-sky-50/60 dark:from-slate-900/75 dark:via-[#0F172A]/70 dark:to-indigo-950/75 border-2 border-indigo-400/50 dark:border-indigo-500/60 shadow-[0_0_35px_rgba(99,102,241,0.18)] p-6 sm:p-10 flex flex-col justify-between select-none ${
              !isFlipped ? 'pointer-events-none' : ''
            }`}
          >
            {/* Top Card Header (Back) */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {currentQ.originalNumber && (
                  <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Câu #{currentQ.originalNumber}
                  </span>
                )}
                <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35">
                  💡 MẶT SAU: ĐÁP ÁN & GIẢI THÍCH
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
                  • Tiến độ: {questionIndex}/{totalCount}
                </span>
              </div>

              <button
                type="button"
                tabIndex={isFlipped ? 0 : -1}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFlip();
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xem lại câu hỏi [Space]</span>
              </button>
            </div>

            {/* Center Content (Back: Reminder + Correct Answer + Breakdown + Explanation) */}
            <div className="my-6 space-y-5">
              {/* Compact Question Reminder */}
              <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1.5">Câu hỏi:</span>
                {currentQ.sentence}
              </div>

              {/* Highlighted Correct Answer Box */}
              <div className="p-5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border-2 border-emerald-500/50 shadow-glow-success">
                <div className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1.5">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {answerMeta.isMultiSelect
                        ? `Các đáp án chính xác (${answerMeta.requiredCount} đáp án)`
                        : 'Đáp án chính xác'}
                    </span>
                  </span>
                </div>
                {displayedCorrectList.length > 1 ? (
                  <ul className="space-y-1.5 mt-1">
                    {displayedCorrectList.map((ans, idx) => (
                      <li
                        key={idx}
                        className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-snug flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{ans}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
                    {displayedCorrectList[0] || cleanOptionText(currentQ.correctWord)}
                  </p>
                )}
              </div>

              {/* Full Options Breakdown with Correct Checkmark */}
              {currentQ.options && currentQ.options.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Các phương án trắc nghiệm {shuffleChoices ? '(Đã trộn thứ tự chống học vẹt vị trí)' : ''}:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentQ.options.map((opt, i) => {
                      const letter = String.fromCharCode(65 + i);
                      const isTrue = isAnswerMatch(
                        opt,
                        currentQ.correctWord,
                        shuffleChoices ? undefined : currentQ.answerKey,
                        currentQ.correctOptions
                      );
                      return (
                        <div
                          key={i}
                          className={`p-2.5 px-3 rounded-xl border text-xs sm:text-sm flex items-start justify-between gap-2 ${
                            isTrue
                              ? 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/60 dark:border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold'
                              : 'bg-slate-50/90 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 opacity-75'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <span
                              className={`w-6 h-6 rounded-lg font-mono font-black text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                                isTrue
                                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950'
                                  : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {letter}
                            </span>
                            <div className="flex-1 min-w-0">
                              <OptionContent content={opt} />
                            </div>
                          </div>
                          {isTrue && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Explanation Box */}
              {displayedExplanation && (
                <div className="p-4 rounded-2xl bg-indigo-50/90 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-xs sm:text-sm text-slate-800 dark:text-indigo-100 leading-relaxed flex items-start gap-3">
                  <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">
                      Giải thích bản chất:{' '}
                    </span>
                    {displayedExplanation}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Hint Bar (Back) */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
              <span>
                Chu kỳ ghi nhớ câu này:{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {streak}/{streakTarget}
                </strong>
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                👇 Tự đánh giá mức độ nhớ của bạn bên dưới (Phím 1, 2, 3)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Self-Evaluation SRS Rating Bar (Visible or active after flipping) */}
      {isFlipped ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
          <button
            type="button"
            onClick={() => onRate(1)}
            className="p-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border-2 border-rose-500/40 hover:border-rose-500 text-left transition-all flex items-center justify-between group active:scale-95 cursor-pointer"
          >
            <div>
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-black text-sm">
                <XCircle className="w-4 h-4" />
                <span>Chưa thuộc / Quên</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Đưa vào hàng đợi ôn lại ngay (Reset chu kỳ)
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-300 font-mono font-bold text-xs">
              [1]
            </span>
          </button>

          <button
            type="button"
            onClick={() => onRate(3)}
            className="p-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border-2 border-amber-500/40 hover:border-amber-500 text-left transition-all flex items-center justify-between group active:scale-95 cursor-pointer"
          >
            <div>
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-black text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Nhớ mang máng</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Tăng +1 chu kỳ nhớ, sẽ kiểm tra lại thêm 1 vòng
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs">
              [2]
            </span>
          </button>

          <button
            type="button"
            onClick={() => onRate(5)}
            className="p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border-2 border-emerald-500/40 hover:border-emerald-500 text-left transition-all flex items-center justify-between group active:scale-95 shadow-glow-success cursor-pointer"
          >
            <div>
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-black text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Đã thuộc lầu!</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                {streakTarget > 1 && streak === 0
                  ? 'Nắm chắc bản chất — Qua câu ngay!'
                  : 'Hoàn thành câu này vào trí nhớ dài hạn'}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs">
              [3]
            </span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggleFlip}
          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm sm:text-base shadow-glow transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>LẬT THẺ XEM ĐÁP ÁN & GIẢI THÍCH [Phím Space]</span>
        </button>
      )}
    </div>
  );
}
