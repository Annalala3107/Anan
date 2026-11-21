'use client';

import React from 'react';
import {
  tokenizeSentenceWithMath,
  renderMathSafely,
  containsMath,
} from '@/lib/mathUtils';

interface MathTextProps {
  content?: string;
  className?: string;
  displayMode?: boolean;
  as?: 'span' | 'p' | 'div';
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

  // Fast path: if no math symbols present, render standard text
  if (!containsMath(content)) {
    const Component = as;
    return <Component className={className}>{content}</Component>;
  }

  const tokens = tokenizeSentenceWithMath(content);
  const Component = as;

  return (
    <Component className={className}>
      {tokens.map((token, idx) => {
        if (token.type === 'math') {
          const html = renderMathSafely(token.value, false);
          return (
            <span
              key={idx}
              className="inline mx-0.5 align-baseline select-text text-indigo-950 dark:text-indigo-200"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        return <React.Fragment key={idx}>{token.value}</React.Fragment>;
      })}
    </Component>
  );
}
