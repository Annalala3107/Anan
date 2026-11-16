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
 * Converts ASCII / MathType equation notation commonly found in exam sources into standard LaTeX.
 */
export function cleanMathToLatex(expr: string): string {
  let s = formatPiecewise(expr.trim());

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

  // 2. Simple exponents first so e^(5t) -> e^{5t}, x^2 -> x^{2}
  s = s.replace(/([a-zA-Z0-9_]+)\^\(([^)]+)\)/g, '$1^{$2}');
  s = s.replace(/([a-zA-Z0-9_]+)\^(\d+)/g, '$1^{$2}');

  // 3. Limits: lim_{x \to 1-} or lim_{x \to 0+} or lim_{x \to a}
  s = s.replace(/lim_\{([^}]+)\}/g, (m, p1) => {
    let sub = p1.trim().replace(/([0-9a-zA-Z\\]+)([-+])$/, '$1^{$2}');
    return '\\lim_{' + sub + '} ';
  });

  // 4. Sums: ∑_{i=1}^{n}
  s = s.replace(/∑_\{([^}]+)\}\^\{([^}]+)\}/g, '\\sum_{$1}^{$2} ');
  s = s.replace(/∑/g, '\\sum ');

  // 5. Integrals: ∫_{a}^{b} or ∫
  s = s.replace(/∫_\{([^}]+)\}\^\{([^}]+)\}/g, '\\int_{$1}^{$2} ');
  s = s.replace(/∫/g, '\\int ');

  // 6. Roots: ³√(expr) or √(expr) or √num
  s = s.replace(/³√\(([^)]+)\)/g, '\\sqrt[3]{$1}');
  s = s.replace(/³√([a-zA-Z0-9]+)/g, '\\sqrt[3]{$1}');
  s = s.replace(/√\(([^)]+)\)/g, '\\sqrt{$1}');
  s = s.replace(/√([a-zA-Z0-9]+)/g, '\\sqrt{$1}');

  // 7. Fractions:
  // |A| / (B) -> \frac{|A|}{B}
  s = s.replace(/\|([^|]+)\|\s*\/\s*\(([^)]+)\)/g, '\\frac{|$1|}{$2}');
  // ((A) / B) -> \frac{A}{B}
  s = s.replace(/\(\s*\(([^()]+)\)\s*\/\s*([^()]+)\s*\)/g, '\\frac{$1}{$2}');
  // (A) / (B) -> \frac{A}{B}
  s = s.replace(/\(([^()]+)\)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}');
  // (A) / B -> \frac{A}{B}
  s = s.replace(/\(([^()]+)\)\s*\/\s*([a-zA-Z0-9_^{}]+)/g, '\\frac{$1}{$2}');
  // num / num or num / \sqrt{...}
  s = s.replace(/(\b[-+]?\d+)\s*\/\s*(\\sqrt\{[^}]+\}|\b\d+)/g, '\\frac{$1}{$2}');
  s = s.replace(/([a-zA-Z0-9]+)\s*\/\s*(\\sqrt\{[^}]+\})/g, '\\frac{$1}{$2}');

  // 8. Derivatives: dz/dt, dy/dt, dy/dx, d^2y/dx^2
  s = s.replace(/\bd\^2y\/dx\^2\b/g, '\\frac{d^2y}{dx^2}');
  s = s.replace(/\b(d[a-z])\/(d[a-z])\b/g, '\\frac{$1}{$2}');

  // 9. Standard function names: sin, cos, tan, ln, log, exp
  s = s.replace(/\b(sin|cos|tan|ln|log|exp)\b\s*([a-zA-Z0-9])/g, '\\$1 $2');

  // 10. Matrices: [[1, 2], [3, 4]]
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
    /\[\[.*?\]\]/.test(text) ||
    /[-+]?\d+\/√\d+/.test(text) ||
    /\$[^$]+\$/.test(text) ||
    /\\\([^\)]+\\\)/.test(text) ||
    /\\\[[^\\]+\\\]/.test(text)
  );
}

/**
 * Master regex for capturing inline math tokens in sentences
 */
const INLINE_MATH_REGEX =
  /(?:\$[^$]+\$|\\\([^\)]+\\\)|lim_\{[^}]+\}\s*(?:\([^)]+\)|[a-zA-Z0-9_|^+\-*()]+)*(?:\s*=\s*[-+0-9a-zA-Z()]+)?|∫_\{[^}]+\}\^\{[^}]+\}[^,.:;]*\bd[a-z]\b|∫[^,.:;]*\bd[a-z]\b|\|[a-zA-Z0-9^+\-*\s()]+\|\s*=\s*[a-zA-Z0-9()^+\-*\s]+|(?:\b\d*[a-zA-Z](?:\^[0-9]+)?(?:\s*[-+*]\s*\d*[a-zA-Z](?:\^[0-9]+)?)*\s*=\s*[-+]?\d*[a-zA-Z0-9√^/().+-]+)|\(?[a-zA-Z0-9()^+\-*]+\)?\s*(?:<|>|<=|>=|≤|≥)\s*[-+]?\d+|\b[a-zA-Z]\s*→\s*[-+0-9a-zA-Z∞]+\b|\b(?:dy\/dt|dz\/dt|dy\/dx|d\^2y\/dx\^2|y'\(1\)|f'\(x\)|f\(x\)|g\(x\)|w'\(t\))\b|³?√\([^)]+\)|³?√[0-9a-zA-Z]+|\b[a-zA-Z]\^[0-9]+|\b[a-zA-Z]\^\([^)]+\)|±\s*\d+(?:\/√\d+)?|\[\s*[-+]?(?:\d+|π|∞|\w+)(?:\/\d+)?\s*,\s*[-+]?(?:\d+|π|∞|\w+)(?:\/\d+)?\s*\])/g;

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
