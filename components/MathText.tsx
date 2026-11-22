'use client';

import React from 'react';
import { containsMath, renderMathSafely } from '@/lib/mathUtils';
import { InlineSegment, tokenizeInlineRichText } from '@/lib/markdownUtils';

interface MathTextProps {
  content?: string;
  className?: string;
  displayMode?: boolean;
  as?: 'span' | 'p' | 'div';
}

function renderSegments(segments: InlineSegment[], keyPrefix = 'seg'): React.ReactNode {
  return segments.map((seg, idx) => {
    const key = `${keyPrefix}_${idx}`;

    if (seg.type === 'text') {
      return <React.Fragment key={key}>{seg.value}</React.Fragment>;
    }

    if (seg.type === 'code') {
      return (
        <code
          key={key}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800/90 text-indigo-700 dark:text-cyan-300 font-mono text-[0.88em] border border-slate-300/60 dark:border-slate-700/70 break-words"
        >
          {seg.value}
        </code>
      );
    }

    if (seg.type === 'math') {
      const html = renderMathSafely(seg.value, false);
      return (
        <span
          key={key}
          className="inline mx-0.5 align-baseline select-text text-indigo-950 dark:text-indigo-200"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    if (seg.type === 'bold') {
      return (
        <strong key={key} className="font-bold text-slate-950 dark:text-white">
          {renderSegments(seg.children, key)}
        </strong>
      );
    }

    if (seg.type === 'italic') {
      return (
        <em key={key} className="italic">
          {renderSegments(seg.children, key)}
        </em>
      );
    }

    return null;
  });
}

export default function MathText({
  content = '',
  className = '',
  displayMode = false,
  as = 'span',
}: MathTextProps) {
  if (!content) return null;

  if (displayMode) {
    const html = renderMathSafely(content, true);
    return (
      <div
        className={`overflow-x-auto py-1 text-center font-sans ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // Fast path: if neither math syntax nor inline markdown delimiters are present
  if (!containsMath(content) && !/[*`]/.test(content)) {
    const Component = as;
    return <Component className={className}>{content}</Component>;
  }

  const segments = tokenizeInlineRichText(content);
  const Component = as;

  return <Component className={className}>{renderSegments(segments)}</Component>;
}
