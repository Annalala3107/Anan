'use client';

import { useState, useEffect, useCallback } from 'react';
import { ZoomIn, X, Image as ImageIcon } from 'lucide-react';

interface QuestionMediaProps {
  src?: string;
  caption?: string;
  alt?: string;
  className?: string;
}

export default function QuestionMedia({
  src,
  caption,
  alt = 'Sơ đồ minh họa câu hỏi',
  className = '',
}: QuestionMediaProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!src || hasError) return null;

  return (
    <div className={`my-4 ${className}`}>
      {/* Media Card Container */}
      <div className="relative group overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/60 p-2 sm:p-3 shadow-sm transition-all hover:border-indigo-400 dark:hover:border-indigo-500/60">
        {/* Inner high-contrast canvas for technical diagrams */}
        <div
          onClick={() => setIsOpen(true)}
          className="relative flex items-center justify-center rounded-xl bg-white p-2 sm:p-4 cursor-zoom-in overflow-hidden transition-transform active:scale-[0.99]"
          title="Nhấn để phóng to sơ đồ"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onError={() => setHasError(true)}
            className="w-full max-h-72 sm:max-h-80 object-contain mx-auto select-none"
            loading="lazy"
          />

          {/* Hover Zoom Badge */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-xs font-semibold backdrop-blur-sm opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity shadow-md pointer-events-none">
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Phóng to</span>
          </div>
        </div>

        {/* Caption */}
        {caption && (
          <p className="mt-2 text-center text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>{caption}</span>
          </p>
        )}
      </div>

      {/* Lightbox Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20"
            aria-label="Đóng"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Modal Content */}
          <div
            className="relative max-w-5xl max-h-[85vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl bg-white p-3 sm:p-6 shadow-2xl max-h-[75vh] w-full flex items-center justify-center overflow-auto border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="max-h-[70vh] w-auto max-w-full object-contain mx-auto select-none"
              />
            </div>

            {caption && (
              <p className="mt-3 text-center text-xs sm:text-sm font-semibold text-slate-200 bg-slate-900/70 px-4 py-1.5 rounded-full border border-white/10">
                {caption}
              </p>
            )}

            <p className="mt-2 text-[11px] text-slate-400">
              Nhấn <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">Esc</kbd> hoặc chạm vùng ngoài để đóng
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
