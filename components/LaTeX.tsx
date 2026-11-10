'use client';

import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface LaTeXProps {
  children: string;
  block?: boolean;
}

export default function LaTeX({ children, block = false }: LaTeXProps) {
  if (!children) return null;

  try {
    if (block) {
      return <BlockMath math={children} />;
    }
    return <InlineMath math={children} />;
  } catch (err) {
    console.warn('LaTeX render error:', err);
    return <span>{children}</span>;
  }
}
