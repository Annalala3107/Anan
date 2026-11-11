'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StorageEngine } from '@/lib/storage';
import { soundFx } from '@/lib/sound';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Flame,
  Brain,
  Layers,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';

function SyncContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [inputCode, setInputCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [restoredStats, setRestoredStats] = useState<{
    wordsCount: number;
    streak: number;
    customQuizzesCount: number;
    examCount: number;
  } | null>(null);
  const [countdown, setCountdown] = useState(4);

  // Decompress URL-safe Base64 gzip payload from hash `#d=...` if present
  const decompressFromHash = async (): Promise<string | null> => {
    try {
      if (typeof window === 'undefined' || typeof DecompressionStream === 'undefined') return null;
      const hash = window.location.hash;
      if (!hash.startsWith('#d=')) return null;
      const b64 = hash.slice(3).replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
      const binary = atob(b64 + pad);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      return await new Response(ds.readable).text();
    } catch {
      return null;
    }
  };

  // Auto-sync if code or hash payload is provided in URL (e.g. from camera QR scan)
  useEffect(() => {
    if (initialCode || (typeof window !== 'undefined' && window.location.hash.startsWith('#d='))) {
      handlePerformSync(initialCode);
    }
  }, [initialCode]);

  // Countdown timer to auto-redirect after successful sync
  useEffect(() => {
    if (!syncSuccess) return;

    if (countdown <= 0) {
      router.push('/');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [syncSuccess, countdown, router]);

  const handlePerformSync = async (codeToUse: string) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      let jsonStr: string | null = await decompressFromHash();

      if (!jsonStr) {
        const cleanCode = codeToUse.replace(/[^0-9]/g, '').trim();
        if (cleanCode.length !== 6) {
          setErrorMsg('Mã đồng bộ gồm đúng 6 chữ số (Ví dụ: 482915).');
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/sync/session?code=${cleanCode}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Mã đồng bộ không hợp lệ hoặc đã hết hạn.');
        }

        const payload = data.payload;
        jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
      }

      const importResult = StorageEngine.importAllData(jsonStr);

      if (!importResult.success) {
        throw new Error(importResult.message);
      }

      // Extract stats for congratulation summary
      const parsedData = JSON.parse(jsonStr);
      const innerData = parsedData.data || parsedData;
      const wordsCount = Object.keys(innerData.wordProgress || {}).length;
      const streak = innerData.streak || 1;
      const customQuizzesCount = (innerData.customQuizzes || []).length;
      const examCount = (innerData.examHistory || []).length;

      setRestoredStats({
        wordsCount,
        streak,
        customQuizzesCount,
        examCount,
      });

      setSyncSuccess(true);
      soundFx.playCelebration();

      // Trigger Confetti explosion
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi kết nối máy chủ.');
      soundFx.playWrong();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    handlePerformSync(inputCode);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 animate-fade-in">
      <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ==================== STATE 1: SYNC SUCCESS ==================== */}
        {syncSuccess && restoredStats ? (
          <div className="text-center space-y-6 animate-scale-up">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                1-Chạm Hoàn Tất
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white pt-2">
                Đồng Bộ Thành Công! 🎉
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Toàn bộ tiến trình học tập từ máy tính đã được đồng bộ nguyên vẹn sang điện thoại của bạn.
              </p>
            </div>

            {/* Restored Stats Grid */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Brain className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Tiến độ SRS</span>
                </div>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {restoredStats.wordsCount} câu
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Chuỗi Streak</span>
                </div>
                <p className="text-lg font-black text-amber-500">
                  {restoredStats.streak} ngày
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Layers className="w-3.5 h-3.5 text-purple-500" />
                  <span>Bộ đề tự tạo</span>
                </div>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {restoredStats.customQuizzesCount} bộ
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>Lịch sử thi</span>
                </div>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {restoredStats.examCount} lượt
                </p>
              </div>
            </div>

            {/* Redirect Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black flex items-center justify-center gap-2 shadow-glow text-sm transition-all"
              >
                <span>Vào Học Ngay Trên Điện Thoại ({countdown}s)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ==================== STATE 2: INPUT / LOADING ==================== */
          <div className="space-y-6">
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-sm">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  Device Transfer
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  Đồng Bộ Sang Điện Thoại
                </h1>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 space-y-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Đang nhận và giải nén dữ liệu từ máy tính...
                </p>
                <p className="text-xs text-slate-400">
                  Chuẩn bị cập nhật chuỗi streak và tiến độ thẻ nhớ SRS...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitManual} className="space-y-5">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Nếu bạn quét mã QR từ camera mà chưa nhận được dữ liệu tự động, hãy nhập <strong>mã 6 chữ số</strong> đang hiển thị trên màn hình máy tính của bạn:
                </p>

                {/* 6-Digit PIN Input Box */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Mã PIN chuyển dữ liệu (6 số)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={inputCode}
                    onChange={(e) => {
                      setInputCode(e.target.value.replace(/[^0-9]/g, ''));
                      setErrorMsg(null);
                    }}
                    placeholder="Ví dụ: 482915"
                    className="w-full py-4 px-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-center font-mono text-2xl sm:text-3xl font-black tracking-[0.3em] text-indigo-600 dark:text-indigo-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:tracking-normal placeholder:text-sm placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5 animate-shake">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="pt-2 space-y-3">
                  <button
                    type="submit"
                    disabled={inputCode.length !== 6}
                    className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black flex items-center justify-center gap-2 shadow-glow text-sm transition-all"
                  >
                    <span>Nhận Dữ Liệu Ngay</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <Link
                    href="/"
                    className="block text-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                  >
                    Hủy bỏ và quay về Trang chủ
                  </Link>
                </div>
              </form>
            )}

            {/* Quick Helper Tips */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 space-y-1.5">
              <p className="font-bold text-slate-500 dark:text-slate-300">
                💡 Làm thế nào để lấy mã trên máy tính?
              </p>
              <p>
                1. Mở AnanQuiz trên máy tính &rarr; Bấm nút <strong>&quot;Đồng bộ ĐT&quot;</strong> ở thanh trên cùng.
              </p>
              <p>
                2. Dùng camera điện thoại quét mã QR hoặc nhìn dãy 6 chữ số để nhập vào ô trên.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SyncPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-400">Đang chuẩn bị phiên đồng bộ...</p>
          </div>
        </div>
      }
    >
      <SyncContent />
    </Suspense>
  );
}
