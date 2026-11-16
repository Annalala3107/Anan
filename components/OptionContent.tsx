'use client';

import React from 'react';
import { cleanOptionText } from '@/lib/utils';

interface OptionContentProps {
  content?: string;
  className?: string;
  skipClean?: boolean;
}

export default function OptionContent({
  content = '',
  className = '',
  skipClean = false,
}: OptionContentProps) {
  if (!content) return null;

  const displayText = skipClean ? content : cleanOptionText(content);
  const isMultilineOrCode =
    displayText.includes('\n') ||
    /\b(return|printf|print|def|int|char|float|void)\b/.test(displayText) ||
    /^\s*\[.*\]\s*$/.test(displayText);

  if (isMultilineOrCode) {
    return (
      <span
        className={`whitespace-pre-wrap font-mono text-xs sm:text-sm leading-relaxed text-left inline-block w-full ${className}`}
      >
        {displayText}
      </span>
    );
  }

  return (
    <span
      className={`whitespace-pre-line break-words leading-relaxed text-left inline-block w-full ${className}`}
    >
      {displayText}
    </span>
  );
}
