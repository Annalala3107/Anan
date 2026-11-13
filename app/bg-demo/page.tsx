'use client';

import { useState } from 'react';
import Link from 'next/link';
import DynamicConstellationBackground from '@/components/DynamicConstellationBackground';
import CodeQuestionRenderer from '@/components/CodeQuestionRenderer';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  SlidersHorizontal,
  MousePointerClick,
  Smartphone,
  Eye,
} from 'lucide-react';

const SAMPLE_OPTIONS = [
  'A. 10 (hậu tố x++ in giá trị trước rồi mới tăng)',
  'B. 11 (giá trị x được tăng lên trước khi truyền vào printf)',
  'C. 12 (tăng hai lần trong cùng biểu thức)',
  'D. Lỗi biên dịch do thiếu biến trung gian',
];

const SAMPLE_QUESTION = `Đoạn code C sau sẽ in ra màn hình giá trị bao nhiêu?
#include <stdio.h>
int main() {
    int x = 10;
    printf("%d", x++);
    return 0;
}`;

export default function BackgroundSystemDemoPage() {
  const [showAmbientGlows, setShowAmbientGlows] = useState(true);
  const [showStars, setShowStars] = useState(true);
  const [pointerReact, setPointerReact] = useState(true);
  const [forceReducedMotion, setForceReducedMotion] = useState(false);
  const [density, setDensity] = useState<'low' | 'balanced' | 'rich'>('balanced');
  const [selectedOpt, setSelectedOpt] = useState<string | null>(SAMPLE_OPTIONS[0]);

  return (
    <>
      <DynamicConstellationBackground
        showAmbientGlows={showAmbientGlows}
        showStars={showStars}
        interactive={pointerReact && !forceReducedMotion}
        density={density}
        showHud={false}
        className="z-[1]"
      />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-28 md:pb-16 space-y-8 text-slate-100">
        {/* Top Navigation & Title */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-200 hover:border-indigo-400/50 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
                Quay lại trang chính
              </Link>
              <span className="glass-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-amber-300 border-amber-500/25">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Demo xem trước · Chưa áp dụng vào bản chính
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.025em] text-slate-50 leading-tight">
              Hệ thống nền Midnight Observatory
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-[65ch]">
              Thiết kế tối ưu cho việc đọc đề và code C dài hàng giờ: nền sâu{' '}
              <code className="font-mono text-sky-300 bg-sky-500/10 px-1.5 py-0.5 rounded">#070a13</code>,
              3 lớp radial glow dịu mắt, trường sao HTML5 Canvas phản hồi con trỏ chuột mượt mà và hệ thống
              card kính mờ viền mảnh giữ chữ sắc nét.
            </p>
          </div>

          {/* 2 Cool + 1 Warm Palette Swatches */}
          <div className="glass-surface rounded-2xl p-4 flex items-center gap-4 shrink-0 self-start md:self-auto">
            <div className="flex items-center gap-2.5">
              <span
                className="w-7 h-7 rounded-lg bg-[#6366f1] border border-indigo-300/30 shadow-sm"
                title="Cool 1: Indigo Nebula (#6366f1)"
              />
              <div className="text-xs leading-tight">
                <div className="font-semibold text-slate-100">Lạnh 1</div>
                <div className="font-mono text-indigo-300">#6366f1</div>
              </div>
            </div>
            <div className="w-px h-8 bg-slate-700/60" />
            <div className="flex items-center gap-2.5">
              <span
                className="w-7 h-7 rounded-lg bg-[#38bdf8] border border-sky-200/30 shadow-sm"
                title="Cool 2: Glacier Cyan (#38bdf8)"
              />
              <div className="text-xs leading-tight">
                <div className="font-semibold text-slate-100">Lạnh 2</div>
                <div className="font-mono text-sky-300">#38bdf8</div>
              </div>
            </div>
            <div className="w-px h-8 bg-slate-700/60" />
            <div className="flex items-center gap-2.5">
              <span
                className="w-7 h-7 rounded-lg bg-[#f59e0b] border border-amber-200/30 shadow-sm"
                title="Warm Accent: Amber Lantern (#f59e0b)"
              />
              <div className="text-xs leading-tight">
                <div className="font-semibold text-slate-100">Nhấn ấm</div>
                <div className="font-mono text-amber-300">#f59e0b</div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Interactive Split: Live Quiz Card Test + Background Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 cols: Real Quiz Arena Legibility Test over .glass-surface-elevated */}
          <section className="lg:col-span-7 glass-surface-elevated rounded-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-700/40 pb-4">
              <div className="flex items-center gap-2">
                <span className="glass-pill px-2.5 py-1 rounded-full text-xs font-semibold text-sky-300">
                  PRF192 · Câu hỏi mẫu
                </span>
                <span className="glass-pill px-2.5 py-1 rounded-full text-xs font-semibold text-amber-300">
                  Kiểm tra độ nét chữ
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">.glass-surface-elevated</span>
            </div>

            <CodeQuestionRenderer
              content={SAMPLE_QUESTION}
              className="text-base sm:text-lg font-semibold text-slate-50 leading-relaxed"
            />

            <div className="space-y-2.5">
              {SAMPLE_OPTIONS.map((opt) => {
                const isSelected = selectedOpt === opt;
                const isCorrect = opt === SAMPLE_OPTIONS[0];
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelectedOpt(opt)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-colors duration-150 flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? isCorrect
                          ? 'bg-emerald-500/12 border-emerald-400/50 text-emerald-100'
                          : 'bg-rose-500/12 border-rose-400/50 text-rose-100'
                        : 'bg-slate-900/45 border-slate-700/45 text-slate-200 hover:border-indigo-400/45 hover:bg-slate-800/55'
                    }`}
                  >
                    <span className="leading-snug">{opt}</span>
                    {isSelected &&
                      (isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      ))}
                  </button>
                );
              })}
            </div>

            {selectedOpt && (
              <div className="glass-surface rounded-xl p-4 border-indigo-400/20 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-1">
                <div className="font-semibold text-amber-300">
                  Giải thích mẫu (nền kính phụ .glass-surface)
                </div>
                <p>
                  Toán tử hậu tố <code className="font-mono text-sky-300">x++</code> trả về giá trị
                  hiện tại của <code className="font-mono text-sky-300">x</code> là{' '}
                  <strong className="text-slate-100">10</strong> cho hàm{' '}
                  <code className="font-mono text-sky-300">printf</code> trước, sau đó mới tăng{' '}
                  <code className="font-mono text-sky-300">x</code> lên 11.
                </p>
              </div>
            )}
          </section>

          {/* Right 5 cols: Live Controls & Spec Comparison */}
          <aside className="lg:col-span-5 space-y-5">
            <div className="glass-surface rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-50 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                  Bảng điều khiển thử nghiệm
                </h2>
                <span className="text-xs font-mono text-slate-400">Live Controls</span>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-700/40 cursor-pointer hover:border-indigo-400/40 transition-colors">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">3 lớp Ambient Glow</div>
                    <div className="text-xs text-slate-400">Indigo + Cyan lạnh + Amber ấm nhẹ</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showAmbientGlows}
                    onChange={(e) => setShowAmbientGlows(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-700/40 cursor-pointer hover:border-indigo-400/40 transition-colors">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">Canvas Sao Trôi Nổi</div>
                    <div className="text-xs text-slate-400">Pre-baked glow halo, 0 shadowBlur</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={showStars}
                    onChange={(e) => setShowStars(e.target.checked)}
                    className="w-4 h-4 accent-sky-400 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-700/40 cursor-pointer hover:border-indigo-400/40 transition-colors">
                  <div className="flex items-start gap-2">
                    <MousePointerClick className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-slate-100">Phản ứng con trỏ chuột</div>
                      <div className="text-xs text-slate-400">Di chuột quanh nền để xem parallax & rẽ sao</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={pointerReact}
                    onChange={(e) => setPointerReact(e.target.checked)}
                    className="w-4 h-4 accent-sky-400 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-700/40 cursor-pointer hover:border-amber-400/40 transition-colors">
                  <div className="flex items-start gap-2">
                    <Eye className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-slate-100">Mô phỏng Reduced Motion</div>
                      <div className="text-xs text-slate-400">Khóa đứng trôi nổi, tiết kiệm pin tối đa</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={forceReducedMotion}
                    onChange={(e) => setForceReducedMotion(e.target.checked)}
                    className="w-4 h-4 accent-amber-400 cursor-pointer"
                  />
                </label>
              </div>

              {/* Density Selector */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Mật độ sao (Desktop / Mobile tự giảm)</span>
                  <span className="font-mono text-sky-300">{density}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'balanced', 'rich'] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDensity(preset)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        density === preset
                          ? 'bg-indigo-500/20 border-indigo-400/60 text-indigo-100'
                          : 'bg-slate-900/50 border-slate-700/40 text-slate-300 hover:border-slate-500/50'
                      }`}
                    >
                      {preset === 'low' ? 'Tối giản' : preset === 'balanced' ? 'Cân bằng' : 'Dày sao'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Optimization Highlights */}
            <div className="glass-surface rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-50">
                <Smartphone className="w-4 h-4 text-amber-400" />
                Tối ưu hiệu năng & Utility Classes
              </div>
              <ul className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <li>
                  • <strong className="text-slate-100">Pre-baked Glow Sprites:</strong> Vẽ 3 sprite halo
                  ngoài màn hình 1 lần duy nhất, giữ ổn định 60–120 FPS không nghẽn{' '}
                  <code className="font-mono text-sky-300">shadowBlur</code>.
                </li>
                <li>
                  • <strong className="text-slate-100">Tối ưu Mobile & Pin:</strong> Tự giảm còn ~36 sao trên
                  màn nhỏ, giới hạn DPR ≤ 1.5–2, tự ngưng RAF khi chuyển tab và hỗ trợ{' '}
                  <code className="font-mono text-sky-300">prefers-reduced-motion</code>.
                </li>
                <li>
                  • <strong className="text-slate-100">Utility sẵn sàng:</strong>{' '}
                  <code className="font-mono text-indigo-300">.glass-surface</code>,{' '}
                  <code className="font-mono text-indigo-300">.glass-surface-elevated</code>,{' '}
                  <code className="font-mono text-indigo-300">.glass-pill</code>.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
