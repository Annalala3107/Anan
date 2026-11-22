'use client';

import React from 'react';
import { cleanOptionText } from '@/lib/utils';
import { containsMath } from '@/lib/mathUtils';
import MathText from '@/components/MathText';

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
  const isCode =
    displayText.includes('\n') ||
    /\b(return|printf|print|def|int|char|float|void)\b/.test(displayText) ||
    /^\s*\[\[.*\]\]\s*$/.test(displayText) === false &&
      /^\s*\[[0-9,\s]+\]\s*$/.test(displayText);

  if (isCode) {
    return (
      <span
        className={`whitespace-pre-wrap font-mono text-xs sm:text-sm leading-relaxed text-left inline-block w-full ${className}`}
      >
        {displayText}
      </span>
    );
  }

  if (containsMath(displayText)) {
    return (
      <span
        className={`font-reading whitespace-normal break-words leading-relaxed text-left inline-block w-full ${className}`}
      >
        <MathText content={displayText} />
      </span>
    );
  }

  return (
    <span
      className={`font-reading whitespace-pre-line break-words leading-relaxed text-left inline-block w-full ${className}`}
    >
      {displayText}
    </span>
  );
}
