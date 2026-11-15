'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle, Trash2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const EXAM_EXIT_CONFIRM_COPY = {
  title: 'Bạn đang trong phòng thi!',
  message:
    'Rời khỏi trang lúc này sẽ hủy bỏ toàn bộ kết quả bài thi hiện tại và không được lưu. Bạn có chắc chắn muốn thoát không?',
  confirmText: 'Hủy bài & Thoát',
  cancelText: 'Tiếp tục làm bài',
  variant: 'danger' as const,
};

/**
 * Accessible, portal-rendered confirmation dialog with Escape and backdrop dismissal.
 */
export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const focusTimer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 10);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(focusTimer);
    };
  }, [isOpen, onCancel]);

  if (!isOpen || !mounted) return null;

  const iconStyles =
    variant === 'danger'
      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
      : variant === 'warning'
      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
      : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20';

  const confirmBtnStyles =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : variant === 'warning'
      ? 'bg-amber-500 hover:bg-amber-600 text-white'
      : 'bg-indigo-600 hover:bg-indigo-700 text-white';

  const borderTone =
    variant === 'danger'
      ? 'border-rose-500/30'
      : variant === 'warning'
      ? 'border-amber-500/30'
      : 'border-indigo-500/30';

  const IconComp =
    variant === 'danger' ? AlertTriangle : variant === 'warning' ? Trash2 : HelpCircle;

  const modalContent = (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in cursor-pointer"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md glass-elevated bg-white dark:bg-[#111827] border ${borderTone} rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-scale-up cursor-default`}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Đóng hộp thoại"
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className={`w-14 h-14 rounded-2xl ${iconStyles} mx-auto flex items-center justify-center`}>
          <IconComp className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h3 id={titleId} className="text-xl font-black text-slate-900 dark:text-white">
            {title}
          </h3>
          <div
            id={descId}
            className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
          >
            {message}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-colors text-sm shadow-sm cursor-pointer ${confirmBtnStyles}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
