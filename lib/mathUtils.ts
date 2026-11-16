import katex from 'katex';

/**
 * Normalizes piecewise mathematical function definitions (e.g. f(x) = { piece1 if cond1; piece2 if cond2 })
 * into LaTeX cases environment.
 */
export function formatPiecewise(text: string): string {
  return text.replace(
    /([a-zA-Z]\([a-zA-Z]\)\s*=\s*)\{\s*([\s\S]*?)\}/g,
    (match, prefix, body) => {
      const lines = body
        .split(';')
        .map((l: string) => l.trim())
        .filter(Boolean);
      const caseLines = lines.map((line: string) => {
        const parts = line.split(/\bif\b/i);
        if (parts.length === 2) {
          return `${parts[0].trim()} & \\text{if } ${parts[1].trim()}`;
        }
        return line;
      });
      return `${prefix}\\begin{cases} ${caseLines.join(' \\\\ ')} \\end{cases}`;
    }
  );
}

/**
 * Converts multiline ASCII matrices and transpose vectors into standard LaTeX bmatrix format.
 */
export function convertAsciiMatrix(text: string): string {
  if (!text) return '';
  let s = text;

  // 1. Convert named matrices like "A = [\n  -4 3 1\n  3 6 -1\n  1 0 2\n]" or "C = [\n ... \n]"
  s = s.replace(
    /([A-Z]\s*=\s*)\[\s*\n([\s\S]*?)\n\s*\]/g,
    (match, prefix, matrixBody) => {
      const lines = matrixBody
        .split('\n')
        .map((l: string) => l.trim())
        .filter(Boolean);
      const rows = lines.map((row: string) => {
        return row.trim().split(/\s+/).join(' & ');
      });
      return `${prefix}\\begin{bmatrix} ${rows.join(' \\\\ ')} \\end{bmatrix}`;
    }
  );

  // 2. Convert indented matrix pairs like "(2A^T)^{-1} = [ 1 -1 ]\n [ 0 1 ]" or "(i) [ 2 0 ]\n [ -2 2 ]"
  s = s.replace(
    /([^\n\[]*?\[\s*[-+0-9a-zA-Z\^/.,\s]+\s*\])\s*\n\s*(\[\s*[-+0-9a-zA-Z\^/.,\s]+\s*\][\s.,;]*)/g,
    (match, top, bottom) => {
      const topMatch = top.match(/([\s\S]*?)\[\s*([\s\S]*?)\s*\]/);
      const bottomMatch = bottom.match(/\[\s*([\s\S]*?)\s*\]([\s.,;]*)/);
      if (topMatch && bottomMatch) {
        const prefix = topMatch[1];
        const r1 = topMatch[2].trim().split(/\s+/).join(' & ');
        const r2 = bottomMatch[1].trim().split(/\s+/).join(' & ');
        const suffix = bottomMatch[2] || '';
        return `${prefix}\\begin{bmatrix} ${r1} \\\\ ${r2} \\end{bmatrix}${suffix}`;
      }
      return match;
    }
  );

  // 3. Convert consecutive multiline matrices "[ ... ]\n[ ... ]\n[ ... ]"
  const lines = s.split('\n');
  let inMatrix = false;
  let matrixLines: string[] = [];
  const resultLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isMatrixRow = /^\[\s*[-+0-9a-zA-Z\^|.,\s]+\s*\][,;.]?$/.test(line);

    if (isMatrixRow) {
      inMatrix = true;
      matrixLines.push(line);
    } else {
      if (inMatrix) {
        if (matrixLines.length >= 2) {
          const rows = matrixLines.map((r) => {
            const inner = r.replace(/^\[\s*/, '').replace(/\s*\][,;.]?$/, '');
            if (inner.includes('|')) {
              const parts = inner.split('|');
              const left = parts[0].trim().split(/\s+/).join(' & ');
              const right = parts[1].trim().split(/\s+/).join(' & ');
              return `${left} & \\bigm| & ${right}`;
            }
            if (inner.includes(',')) {
              return inner.split(',').map((c) => c.trim()).join(' & ');
            }
            return inner.trim().split(/\s+/).join(' & ');
          });
          resultLines.push(`\\begin{bmatrix} ${rows.join(' \\\\ ')} \\end{bmatrix}`);
        } else {
          resultLines.push(...matrixLines);
        }
        matrixLines = [];
        inMatrix = false;
      }
      resultLines.push(lines[i]);
    }
  }

  if (matrixLines.length >= 2) {
    const rows = matrixLines.map((r) => {
      const inner = r.replace(/^\[\s*/, '').replace(/\s*\][,;.]?$/, '');
      if (inner.includes('|')) {
        const parts = inner.split('|');
        const left = parts[0].trim().split(/\s+/).join(' & ');
        const right = parts[1].trim().split(/\s+/).join(' & ');
        return `${left} & \\bigm| & ${right}`;
      }
      if (inner.includes(',')) {
        return inner.split(',').map((c) => c.trim()).join(' & ');
      }
      return inner.trim().split(/\s+/).join(' & ');
    });
    resultLines.push(`\\begin{bmatrix} ${rows.join(' \\\\ ')} \\end{bmatrix}`);
  } else if (matrixLines.length > 0) {
    resultLines.push(...matrixLines);
  }

  s = resultLines.join('\n');

  // 4. Convert transpose vectors like "[3 -1 2]^T" or "[-7 2 1]^T"
  s = s.replace(/\[\s*([-+0-9a-zA-Z\s,;]+?)\s*\]\^T/g, (match, inner) => {
    let cells;
    if (inner.includes(',')) {
      cells = inner.split(',').map((c: string) => c.trim()).join(' & ');
    } else if (inner.includes(';')) {
      cells = inner.split(';').map((c: string) => c.trim()).join(' & ');
    } else {
      cells = inner.trim().split(/\s+/).join(' & ');
    }
    return `\\begin{bmatrix} ${cells} \\end{bmatrix}^T`;
  });

  return s;
}

/**
 * Converts ASCII / MathType equation notation commonly found in exam sources into standard LaTeX.
 */
export function cleanMathToLatex(expr: string): string {
  let s = formatPiecewise(convertAsciiMatrix(expr.trim()));

  // Strip trailing period if not an ellipsis
  const hasTrailingPeriod = s.endsWith('.') && !s.endsWith('..');
  if (hasTrailingPeriod) s = s.slice(0, -1).trim();

  // If already delimited with LaTeX delimiters ($...$ or $$...$$), strip them
  if (s.startsWith('$$') && s.endsWith('$$')) {
    s = s.slice(2, -2).trim();
  } else if (s.startsWith('$') && s.endsWith('$') && s.length > 2) {
    s = s.slice(1, -1).trim();
  } else if (s.startsWith('\\(') && s.endsWith('\\)')) {
    s = s.slice(2, -2).trim();
  } else if (s.startsWith('\\[') && s.endsWith('\\]')) {
    s = s.slice(2, -2).trim();
  }

  // 1. Greek, set notation, and special mathematical symbols
  s = s.replace(/→/g, '\\to ');
  s = s.replace(/\+∞/g, '+\\infty ');
  s = s.replace(/-∞/g, '-\\infty ');
  s = s.replace(/∞/g, '\\infty ');
  s = s.replace(/±/g, '\\pm ');
  s = s.replace(/∓/g, '\\mp ');
  s = s.replace(/·/g, '\\cdot ');
  s = s.replace(/⇒/g, '\\implies ');
  s = s.replace(/≠/g, '\\neq ');
  s = s.replace(/≤/g, '\\le ');
  s = s.replace(/≥/g, '\\ge ');
  s = s.replace(/Δx/g, '\\Delta x');
  s = s.replace(/θ/g, '\\theta ');
  s = s.replace(/π/g, '\\pi ');
  s = s.replace(/∈/g, '\\in ');
  s = s.replace(/\bR\b(?=\s*(?:[,\s\])}]|is in))/g, '\\mathbb{R}');

  // 2. Units with carets: cm^2/s -> \text{cm}^2/\text{s}, cm^2 -> \text{cm}^2
  s = s.replace(
    /\b(cm|m|km|s|ft|in)\^(\d+)\/([a-zA-Z]+)\b/g,
    '\\text{$1}^{$2}/\\text{$3}'
  );
  s = s.replace(/\b(cm|m|km|s|ft|in)\^(\d+)\b/g, '\\text{$1}^{$2}');

  // 3. Subscripts: x_1 -> x_{1}, L_3 -> L_{3}, R_8 -> R_{8}, x_n -> x_{n}
  s = s.replace(/\b([a-zA-Z])_([0-9a-zA-Z]+)\b/g, '$1_{$2}');

  // 4. Standard upright functions: \ln, \sin, \cos, \tan, etc.
  s = s.replace(
    /\b(sin|cos|tan|ln|log|exp|arcsin|arccos|arctan|sec|csc|cot|det|span)\b(?![a-zA-Z])/g,
    '\\$1 '
  );

  // 5. Differential spacing: dx, dy, dt, dz, dp
  s = s.replace(/\b(dx|dy|dt|dz|dp|d\theta)\b/g, '\\, $1');

  // 6. Simple exponents
  s = s.replace(/([a-zA-Z0-9_]+)\^\(([^)]+)\)/g, '$1^{$2}');
  s = s.replace(/([a-zA-Z0-9_]+)\^(\d+)/g, '$1^{$2}');

  // 7. Limits: lim_{x \to 1-} or lim_{x \to 0+} or lim_{x \to a}
  s = s.replace(/lim_\{([^}]+)\}/g, (m, p1) => {
    let sub = p1.trim().replace(/([0-9a-zA-Z\\]+)([-+])$/, '$1^{$2}');
    return '\\lim_{' + sub + '} ';
  });

  // 8. Sums: ∑_{i=1}^{n}
  s = s.replace(/∑_\{([^}]+)\}\^\{([^}]+)\}/g, '\\sum_{$1}^{$2} ');
  s = s.replace(/∑/g, '\\sum ');

  // 9. Integrals: ∫_{a}^{b} or ∫
  s = s.replace(/∫_\{([^}]+)\}\^\{([^}]+)\}/g, '\\int_{$1}^{$2} ');
  s = s.replace(/∫/g, '\\int ');

  // 10. Roots: ³√(expr) or √(expr) or √num
  s = s.replace(/³√\(([^)]+)\)/g, '\\sqrt[3]{$1}');
  s = s.replace(/³√([a-zA-Z0-9]+)/g, '\\sqrt[3]{$1}');
  s = s.replace(/√\(([^)]+)\)/g, '\\sqrt{$1}');
  s = s.replace(/√([a-zA-Z0-9]+)/g, '\\sqrt{$1}');

  // 11. Fractions:
  s = s.replace(/\|([^|]+)\|\s*\/\s*\(([^)]+)\)/g, '\\frac{|$1|}{$2}');
  s = s.replace(/\(\s*\(([^()]+)\)\s*\/\s*([^()]+)\s*\)/g, '\\frac{$1}{$2}');
  s = s.replace(/\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}');
  s = s.replace(/\(([^)]+)\)\s*\/\s*([a-zA-Z0-9_^{}]+)/g, '\\frac{$1}{$2}');
  s = s.replace(/(\b[-+]?\d+)\s*\/\s*(\\sqrt\{[^}]+\}|\b\d+)/g, '\\frac{$1}{$2}');
  s = s.replace(/([a-zA-Z0-9]+)\s*\/\s*(\\sqrt\{[^}]+\})/g, '\\frac{$1}{$2}');

  // 12. Derivatives: dz/dt, dy/dt, dy/dx, d^2y/dx^2
  s = s.replace(/\bd\^2y\/dx\^2\b/g, '\\frac{d^2y}{dx^2}');
  s = s.replace(/\b(d[a-z])\/(d[a-z])\b/g, '\\frac{$1}{$2}');

  // 13. Matrices from JSON: [[1, 2], [3, 4]]
  s = s.replace(/\[\[(.*?)\]\]/g, (m, inner) => {
    const rows = inner
      .split(/\],\s*\[/)
      .map((r: string) => r.split(',').map((c: string) => c.trim()).join(' & '));
    return '\\begin{bmatrix}' + rows.join(' \\\\ ') + '\\end{bmatrix}';
  });

  // Handle unclosed braces safely to avoid KaTeX parse crashes
  const openBraces = (s.match(/\{/g) || []).length;
  const closeBraces = (s.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    s += '}'.repeat(openBraces - closeBraces);
  }

  return hasTrailingPeriod ? s + '.' : s;
}

/**
 * Safely renders LaTeX to HTML via KaTeX. Falls back to clean text if parsing fails.
 */
export function renderMathSafely(expr: string, displayMode = false): string {
  try {
    const ltx = cleanMathToLatex(expr);
    return katex.renderToString(ltx, {
      displayMode,
      throwOnError: false,
      output: 'html',
    });
  } catch {
    return expr;
  }
}

export interface RomanItem {
  numeral: string;
  content: string;
}

/**
 * Extracts Roman numeral sub-items like (i), (ii), (iii), (iv) from question stems.
 */
export function extractRomanChoices(questionText: string): {
  stem: string;
  romanChoices: RomanItem[] | null;
} {
  if (!questionText) return { stem: '', romanChoices: null };

  const lines = questionText.split('\n');
  const romanChoices: RomanItem[] = [];
  const stemLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^\(([ivxIVX]+)\)\s*(.*)$/);
    if (match) {
      romanChoices.push({
        numeral: match[1],
        content: match[2].trim(),
      });
    } else {
      stemLines.push(line);
    }
  }

  return {
    stem: stemLines.join('\n').trim(),
    romanChoices: romanChoices.length > 0 ? romanChoices : null,
  };
}

/**
 * Checks if a line or string is a standalone mathematical formula line
 */
export function isStandaloneFormula(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  return (
    /^(?:lim_\{|∫|\b\w+\(x\)\s*=|Evaluate the limit lim_|Find the limit\s*lim_)/.test(
      trimmed
    ) ||
    /^[a-zA-Z]\([a-zA-Z]\)\s*=\s*\{/.test(trimmed) ||
    /^\\begin\{bmatrix\}/.test(trimmed) ||
    /^\$\$[\s\S]+\$\$$/.test(trimmed) ||
    /^\\\[[\s\S]+\\\]$/.test(trimmed)
  );
}

/**
 * Checks if a string contains any mathematical syntax requiring KaTeX formatting
 */
export function containsMath(text: string): boolean {
  if (!text) return false;
  return (
    /[∫∑√±∓·⇒≠≤≥Δθπ∈]/.test(text) ||
    /\b(?:lim_\{|dy\/dt|dz\/dt|dy\/dx|d\^2y\/dx\^2|y'\(1\)|f'\(x\)|f\(x\)|w'\(t\))\b/.test(
      text
    ) ||
    /\b[a-zA-Z0-9_]+\^[-+0-9a-zA-Z()]+\b/.test(text) ||
    /\b[a-zA-Z]_[0-9a-zA-Z]+\b/.test(text) ||
    /\[\[.*?\]\]/.test(text) ||
    /\\begin\{bmatrix\}/.test(text) ||
    /[-+]?\d+\/√\d+/.test(text) ||
    /\$(?!\s|\d)[^$\n]+(?<!\s)\$/.test(text) ||
    /\\\([^\)]+\\\)/.test(text) ||
    /\\\[[^\\]+\\\]/.test(text)
  );
}

/**
 * Master regex for capturing inline math tokens in sentences.
 * Strictly separates currency ($20,000) from LaTeX delimiters ($x^2$).
 */
const INLINE_MATH_REGEX =
  /(?:\$(?!\s|\d)[^$\n]+(?<!\s)\$|\\\([^\)]+\\\)|\\begin\{bmatrix\}[\s\S]*?\\end\{bmatrix\}(?:\^T)?|lim_\{[^}]+\}\s*(?:\([^)]+\)|[a-zA-Z0-9_|^+\-*()]+)*(?:\s*=\s*[-+0-9a-zA-Z()]+)?|∫_\{[^}]+\}\^\{[^}]+\}[^,.:;]*\bd[a-z]\b|∫[^,.:;]*\bd[a-z]\b|\|[a-zA-Z0-9_|^+\-*\s()]+\||(?:\b\d*[a-zA-Z](?:_[0-9a-zA-Z]+|\^[0-9]+)?(?:\s*[-+*]\s*\d*[a-zA-Z](?:_[0-9a-zA-Z]+|\^[0-9]+)?)*\s*=\s*[-+]?\d*[a-zA-Z0-9√^/().+-]+)|\b[a-zA-Z]_[0-9a-zA-Z]+\s*=\s*[-+]?\d+|\(?[a-zA-Z0-9()^+\-*]+\)?\s*(?:<|>|<=|>=|≤|≥)\s*[-+]?\d+|\b[a-zA-Z]\s*→\s*[-+0-9a-zA-Z∞]+\b|\b(?:dy\/dt|dz\/dt|dy\/dx|d\^2y\/dx\^2|y'\(1\)|f'\(x\)|f\(x\)|g\(x\)|w'\(t\))\b|³?√\([^)]+\)|³?√[0-9a-zA-Z]+|\b[a-zA-Z]\^[0-9]+|\b[a-zA-Z]\^\([^)]+\)|\b[a-zA-Z]_[0-9a-zA-Z]+\b|\b[a-zA-Z]_\{[^}]+\}\b|\b\d*\s*(?:cm|m|km|s|ft|in)\^[0-9]+(?:\/[a-zA-Z]+)?\b|±\s*\d+(?:\/√\d+)?|\[\s*[-+]?(?:\d+|π|∞|\w+)(?:\/\d+)?\s*,\s*[-+]?(?:\d+|π|∞|\w+)(?:\/\d+)?\s*\])/g;

export interface MathToken {
  type: 'text' | 'math';
  value: string;
}

/**
 * Tokenizes a sentence into plain text fragments and inline math formulas
 */
export function tokenizeSentenceWithMath(text: string): MathToken[] {
  if (!text) return [];
  if (!containsMath(text)) {
    return [{ type: 'text', value: text }];
  }

  const tokens: MathToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INLINE_MATH_REGEX.lastIndex = 0;
  while ((match = INLINE_MATH_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        value: text.substring(lastIndex, match.index),
      });
    }

    // Strip trailing punctuation like '.' or ',' from math token
    let mathVal = match[0];
    let trailingPunc = '';
    if (/[.,;:]$/.test(mathVal) && !mathVal.endsWith('..')) {
      trailingPunc = mathVal.slice(-1);
      mathVal = mathVal.slice(0, -1);
    }

    tokens.push({ type: 'math', value: mathVal });
    if (trailingPunc) {
      tokens.push({ type: 'text', value: trailingPunc });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.substring(lastIndex) });
  }

  return tokens;
}
