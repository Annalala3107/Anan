'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { StorageEngine } from '@/lib/storage';
import {
  X,
  Smartphone,
  Copy,
  Check,
  RotateCcw,
  Clock,
  ShieldCheck,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface QrSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getConfiguredAppOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

async function compressToUrlSafeBase64(text: string): Promise<string | null> {
  try {
    if (typeof CompressionStream === 'undefined') return null;
    const bytes = new TextEncoder().encode(text);
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const compressedBuf = await new Response(cs.readable).arrayBuffer();
    const uint8 = new Uint8Array(compressedBuf);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const b64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return b64.length <= 1800 ? b64 : null;
  } catch {
    return null;
  }
}

export default function QrSyncModal({ isOpen, onClose }: QrSyncModalProps) {
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [syncCode, setSyncCode] = useState<string | null>(null);
  const [syncUrl, setSyncUrl] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const generateTransferSession = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setWarningMsg(null);
    setSyncCode(null);
    setSyncUrl(null);
    setQrDataUrl(null);
    setCopiedCode(false);
    setCopiedUrl(false);

    try {
      const backupJson = StorageEngine.exportAllData();
      const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const isLocalhost =
        hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

      const configuredOrigin = getConfiguredAppOrigin();
      const targetOrigin =
        isLocalhost && configuredOrigin ? configuredOrigin : browserOrigin;

      if (isLocalhost && !configuredOrigin) {
        setWarningMsg(
          'Bạn đang mở app ở localhost: điện thoại ngoài mạng máy tính sẽ không quét mở được địa chỉ localhost này. Hãy truy cập qua domain thật, cấu hình NEXT_PUBLIC_APP_URL trong .env.local, hoặc dùng tính năng Xuất File (.json) trong Hồ sơ.'
        );
      }

      const compressedPayload = await compressToUrlSafeBase64(backupJson);

      const res = await fetch('/api/sync/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: backupJson }),
      });

      const rawText = await res.text();
      let resData: {
        success?: boolean;
        code?: string;
        ttlSeconds?: number;
        error?: string;
      } = {};
      try {
        resData = rawText ? JSON.parse(rawText) : {};
      } catch {
        resData = {};
      }

      if (!res.ok || !resData.success || !resData.code) {
        // If server Redis is unconfigured (503) but backup fits directly inside gzip QR hash, fall back safely
        if (res.status === 503 && compressedPayload && targetOrigin) {
          const offlineTargetUrl = `${targetOrigin}/sync#d=${compressedPayload}`;
          const qrImage = await QRCode.toDataURL(offlineTargetUrl, {
            width: 300,
            margin: 2,
            color: { dark: '#0F172A', light: '#FFFFFF' },
            errorCorrectionLevel: 'L',
          });

          setQrDataUrl(qrImage);
          setSyncUrl(offlineTargetUrl);
          setWarningMsg(
            resData.error ||
              'Máy chủ chưa bật Upstash Redis nên tạm thời tắt Mã PIN 6 số. Bạn vẫn có thể quét trực tiếp mã QR nén ở trên để chuyển dữ liệu!'
          );
          return;
        }

        throw new Error(resData.error || 'Không thể tạo phiên chuyển dữ liệu qua QR.');
      }

      const code = resData.code;
      const targetUrl = compressedPayload
        ? `${targetOrigin}/sync?code=${code}#d=${compressedPayload}`
        : `${targetOrigin}/sync?code=${code}`;

      const qrImage = await QRCode.toDataURL(targetUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'L',
      });

      setSyncCode(code);
      setSyncUrl(`${targetOrigin}/sync?code=${code}`);
      setQrDataUrl(qrImage);
      setTimeLeft(resData.ttlSeconds || 900);
    } catch (err: unknown) {
      console.error('Failed to generate sync session:', err);
      const msg =
        err instanceof Error ? err.message : 'Lỗi kết nối khi chuẩn bị mã QR / PIN.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    generateTransferSession();
  }, [isOpen, generateTransferSession]);

  // Countdown timer for 15-minute PIN expiry
  useEffect(() => {
    if (!isOpen || timeLeft <= 0 || !syncCode) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeLeft, syncCode]);

  const handleCopyCode = () => {
    if (!syncCode) return;
    navigator.clipboard.writeText(syncCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyUrl = () => {
    if (!syncUrl) return;
    navigator.clipboard.writeText(syncUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 space-y-3.5 sm:space-y-4 animate-scale-up my-auto cursor-default"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500 text-white">
                  15 Phút • Dùng 1 Lần
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-400">
                  Không cần tài khoản
                </span>
              </div>
              <h2
                id={titleId}
                className="text-base sm:text-lg font-black text-slate-900 dark:text-white"
              >
                Chuyển dữ liệu qua QR / Mã PIN 15 phút
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Localhost / Fallback Warning Banner */}
        {warningMsg && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/35 border border-amber-300/70 dark:border-amber-700/50 text-amber-800 dark:text-amber-300 text-[11px] sm:text-xs flex items-start gap-2 leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <span>{warningMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Đang đóng gói dữ liệu và tạo mã QR / Mã PIN 15 phút...
            </p>
          </div>
        ) : errorMsg ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-sm font-bold text-rose-500">{errorMsg}</p>
            <button
              type="button"
              onClick={generateTransferSession}
              className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Thử lại
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* QR Code Presentation Box */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 relative group">
              {qrDataUrl && (
                <div className="relative p-2.5 bg-white rounded-2xl shadow-md border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="Mã QR chuyển dữ liệu sang điện thoại"
                    className="w-40 h-40 sm:w-44 sm:h-44 block rounded-lg"
                  />

                  {syncCode && timeLeft === 0 && (
                    <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 text-center space-y-2 text-white">
                      <p className="text-xs font-bold text-rose-400">
                        Mã PIN đã hết hạn (15 phút)
                      </p>
                      <button
                        type="button"
                        onClick={generateTransferSession}
                        className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Tạo mã mới
                      </button>
                    </div>
                  )}
                </div>
              )}

              {syncCode && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    Mã PIN tự hủy sau khi nhận hoặc hết:{' '}
                    <strong
                      className={`font-mono ${
                        timeLeft < 120 ? 'text-rose-500' : 'text-indigo-500'
                      }`}
                    >
                      {formatTimer(timeLeft)}
                    </strong>
                  </span>
                  {timeLeft > 0 && (
                    <button
                      type="button"
                      onClick={generateTransferSession}
                      title="Tạo lại mã mới"
                      className="p-1 hover:text-indigo-500 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 6-Digit PIN & Direct Link */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Mã PIN 15 phút (nhận 1 lần)
                </p>
                <p className="text-xl sm:text-2xl font-black font-mono tracking-widest text-indigo-600 dark:text-indigo-300">
                  {syncCode ? `${syncCode.slice(0, 3)} - ${syncCode.slice(3)}` : 'CHỈ QR'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {syncCode && (
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Sao chép mã PIN 6 số"
                  >
                    {copiedCode ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {copiedCode ? 'Đã chép' : 'Chép mã'}
                    </span>
                  </button>
                )}

                {syncUrl && (
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Sao chép đường dẫn chuyển dữ liệu"
                  >
                    {copiedUrl ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {copiedUrl ? 'Đã chép link' : 'Chép link'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* 3-Step Scan Instructions */}
            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Cơ chế bảo mật chuyển dữ liệu tạm thời:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] sm:text-xs">
                <li>
                  Dùng <strong>Camera điện thoại</strong> quét mã QR hoặc mở đường dẫn nhận dữ liệu.
                </li>
                <li>
                  Mã PIN được lưu tạm trong Redis tối đa <strong>15 phút</strong> và bị{' '}
                  <strong>xóa ngay lập tức sau 1 lần nhận thành công</strong>.
                </li>
                <li>
                  Toàn bộ tiến độ SRS, streak và bộ đề tự tạo sẽ được nạp sang thiết bị mới!
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
