'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface QrSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
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

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize transfer session when modal opens
  useEffect(() => {
    if (!isOpen) return;

    generateTransferSession();
  }, [isOpen]);

  // Countdown timer for code expiry
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

  // Compress JSON string into URL-safe Base64 (gzip) when small enough for zero-server reliability
  const compressToUrlSafeBase64 = async (text: string): Promise<string | null> => {
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
      // Keep QR URL under 1800 chars so any phone camera scans it in <0.2s
      return b64.length <= 1800 ? b64 : null;
    } catch {
      return null;
    }
  };

  const generateTransferSession = async () => {
    setLoading(true);
    setErrorMsg(null);
    setCopiedCode(false);
    setCopiedUrl(false);

    try {
      const backupJson = StorageEngine.exportAllData();
      const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      const publicOrigin =
        typeof window !== 'undefined' && !isLocalhost
          ? window.location.origin
          : 'https://anan-mocha.vercel.app';

      // Post to cloud relay if on localhost so the phone scanning https://anan-mocha.vercel.app can claim the 6-digit PIN!
      const apiEndpoint = isLocalhost
        ? `${publicOrigin}/api/sync/session`
        : '/api/sync/session';

      let res: Response;
      try {
        res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: backupJson }),
        });
      } catch {
        // Fallback to local API if offline
        res = await fetch('/api/sync/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: backupJson }),
        });
      }

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Không thể tạo phiên đồng bộ.');
      }

      const code = resData.code;
      const compressedPayload = await compressToUrlSafeBase64(backupJson);
      const targetUrl = compressedPayload
        ? `${publicOrigin}/sync?code=${code}#d=${compressedPayload}`
        : `${publicOrigin}/sync?code=${code}`;

      // Generate sharp vector/PNG QR Code
      const qrImage = await QRCode.toDataURL(targetUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0F172A', // Dark navy ink
          light: '#FFFFFF', // Pure white background
        },
        errorCorrectionLevel: 'L',
      });

      setSyncCode(code);
      setSyncUrl(`${publicOrigin}/sync?code=${code}`);
      setQrDataUrl(qrImage);
      setTimeLeft(resData.ttlSeconds || 900);
    } catch (err: any) {
      console.error('Failed to generate sync session:', err);
      setErrorMsg(err?.message || 'Lỗi kết nối khi chuẩn bị mã QR.');
    } finally {
      setLoading(false);
    }
  };

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
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 space-y-3.5 sm:space-y-4 animate-scale-up my-auto"
      >
        {/* Glow corner */}
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
                  1-Chạm Siêu Tốc
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-400">Không cần tài khoản</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Đồng Bộ Sang Điện Thoại (QR)
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Đang đóng gói dữ liệu và tạo mã QR...
            </p>
          </div>
        ) : errorMsg ? (
          <div className="py-8 text-center space-y-4">
            <p className="text-sm font-bold text-rose-500">{errorMsg}</p>
            <button
              type="button"
              onClick={generateTransferSession}
              className="py-2.5 px-5 rounded-xl bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-2"
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
                    alt="Mã QR đồng bộ dữ liệu sang điện thoại"
                    className="w-40 h-40 sm:w-44 sm:h-44 block rounded-lg"
                  />

                  {/* Expired Overlay */}
                  {timeLeft === 0 && (
                    <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 text-center space-y-2 text-white">
                      <p className="text-xs font-bold text-rose-400">Mã QR đã hết hạn (15 phút)</p>
                      <button
                        type="button"
                        onClick={generateTransferSession}
                        className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Tạo mã mới
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Expiration Countdown Bar */}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  Mã có hiệu lực trong:{' '}
                  <strong className={`font-mono ${timeLeft < 120 ? 'text-rose-500' : 'text-indigo-500'}`}>
                    {formatTimer(timeLeft)}
                  </strong>
                </span>
                {timeLeft > 0 && (
                  <button
                    type="button"
                    onClick={generateTransferSession}
                    title="Tạo lại mã mới"
                    className="p-1 hover:text-indigo-500 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Alternative: 6-Digit PIN & Direct Link */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Mã nhập tay (Nếu camera không quét được)
                </p>
                <p className="text-xl sm:text-2xl font-black font-mono tracking-widest text-indigo-600 dark:text-indigo-300">
                  {syncCode ? `${syncCode.slice(0, 3)} - ${syncCode.slice(3)}` : '------'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  title="Sao chép mã PIN 6 số"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span className="hidden sm:inline">{copiedCode ? 'Đã chép' : 'Chép mã'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  title="Sao chép đường dẫn đồng bộ"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-emerald-500" /> : <ExternalLink className="w-4 h-4" />}
                  <span className="hidden sm:inline">{copiedUrl ? 'Đã chép link' : 'Chép link'}</span>
                </button>
              </div>
            </div>

            {/* 3-Step Scan Instructions */}
            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Hướng dẫn nhận dữ liệu trên điện thoại:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] sm:text-xs">
                <li>Cầm điện thoại mở ứng dụng <strong>Camera</strong> (hoặc Zalo/QR Scanner).</li>
                <li>Hướng camera vào mã QR ở trên &rarr; Chạm vào thông báo để mở web.</li>
                <li>Điện thoại sẽ tự động nhận <strong>100% câu hỏi SRS, streak và bộ đề</strong>!</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
