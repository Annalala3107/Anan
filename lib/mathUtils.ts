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
 * Converts text-based numerical data tables (e.g. x: 2.00, 2.25... \n f(x): 1.50, 1.57...)
 * into standard markdown pipe tables for rich rendering.
 */
export function convertDataTableToMarkdown(text: string): string {
  if (!text) return '';
  return text.replace(
    /(?:from the table:?|Table:?)?\s*\n\s*x:\s*([0-9.,\s]+)\s*\n\s*f\(x\):\s*([0-9.,\s]+)/gi,
    (match, xValsStr: string, fValsStr: string) => {
      const xVals = xValsStr
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      const fVals = fValsStr
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      const headerRow = '| x | ' + xVals.join(' | ') + ' |';
      const dividerRow = '|---' + xVals.map(() => '|---').join('') + '|';
      const bodyRow = '| f(x) | ' + fVals.join(' | ') + ' |';
      return `\n${headerRow}\n${dividerRow}\n${bodyRow}\n`;
    }
  );
}

const C_KEYWORDS =
  /\b(?:int|float|double|char|void|long|short|unsigned|signed|struct|union|enum|typedef|const|static|extern|return|if|else|switch|case|default|break|continue|for|while|do|goto|sizeof|printf|scanf|malloc|free|fopen|include|def|class|print|cout|cin|Algorithm|Purpose)\b/i;
const C_OPERATORS =
  /(?:!=|==|\+=|-=|\*=|\/=|%=|\+\+|--|&&|\|\||<<|>>|->|#include|<stdio|<stdlib)/;

function isLinearEquationLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (C_OPERATORS.test(trimmed)) return false;
  if (C_KEYWORDS.test(trimmed)) return false;
  if (
    trimmed.includes('"') ||
    trimmed.includes("'") ||
    trimmed.includes(';') ||
    trimmed.includes('{') ||
    trimmed.includes('}')
  )
    return false;
  const parts = trimmed.split('=');
  if (parts.length !== 2) return false;
  const lhs = parts[0].trim();
  const rhs = parts[1].trim();
  if (!lhs || !rhs) return false;
  if (!/^[-+0-9a-zA-Z\s*/^()_.]+$/.test(lhs)) return false;
  if (!/^[-+0-9a-zA-Z\s*/^()_.]+$/.test(rhs)) return false;
  return true;
}

/**
 * Converts systems of linear equations wrapped in curly braces into standard LaTeX cases environments.
 */
export function convertLinearSystem(text: string): string {
  if (!text) return '';
  let s = text;
  // 1. Multiline system: {\n ... \n}
  s = s.replace(/\{\s*\n([\s\S]*?)\n\s*\}/g, (match, body: string) => {
    const lines = body
      .split('\n')
      .map((l: string) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) return match;
    const allEqs = lines.every(isLinearEquationLine);
    if (!allEqs) return match;

    return `\\begin{cases} ${lines.join(' \\\\ ')} \\end{cases}`;
  });

  // 2. Semicolon single-line system: { eq1; eq2; eq3 }
  s = s.replace(
    /\{\s*([^{}\n]+=[^{}\n]+;[^{}\n]+)\s*\}/g,
    (match, body: string) => {
      const lines = body
        .split(';')
        .map((l: string) => l.trim())
        .filter(Boolean);

      if (lines.length < 2) return match;
      const allEqs = lines.every(isLinearEquationLine);
      if (!allEqs) return match;

      return `\\begin{cases} ${lines.join(' \\\\ ')} \\end{cases}`;
    }
  );
  return s;
}

/**
 * Converts multiline ASCII matrices, column vectors with semicolons, and transpose vectors into LaTeX bmatrix format.
 */
export function convertAsciiMatrix(text: string): string {
  if (!text) return '';
  let s = text;

  // 1. Convert text data tables to markdown pipe tables
  s = convertDataTableToMarkdown(s);

  // 2. Convert systems of equations
  s = convertLinearSystem(s);

  // 3. Convert semicolon matrices/column vectors like [1 0 ; 0 -1], [1; 0; 0], [12; 7]
  s = s.replace(
    /\[\s*([-+0-9a-zA-Z\s,]+(?:;\s*[-+0-9a-zA-Z\s,]+)+)\s*\]/g,
    (match, inner: string) => {
      const rawRows = inner.split(';');
      const rows = rawRows.map((r: string) => {
        if (r.includes(',')) {
          return r
            .split(',')
            .map((c: string) => c.trim())
            .join(' & ');
        }
        return r.trim().split(/\s+/).join(' & ');
      });
      return `\\begin{bmatrix} ${rows.join(' \\\\ ')} \\end{bmatrix}`;
    }
  );

  // 4. Convert named multiline matrices like "A = [\n  -4 3 1\n  3 6 -1\n  1 0 2\n]" or "C = [\n ... \n]"
  s = s.replace(
    /([A-Z]\s*=\s*)\[\s*\n([\s\S]*?)\n\s*\]/g,
    (match, prefix: string, matrixBody: string) => {
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

  // 5. Convert indented matrix pairs like "(2A^T)^{-1} = [ 1 -1 ]\n [ 0 1 ]" or "(i) [ 2 0 ]\n [ -2 2 ]"
  s = s.replace(
    /([^\n\[]*?\[\s*[-+0-9a-zA-Z\^/.,\s]+\s*\])\s*\n\s*(\[\s*[-+0-9a-zA-Z\^/.,\s]+\s*\][\s.,;]*)/g,
    (match, top: string, bottom: string) => {
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

  // 6. Convert consecutive multiline matrices "[ ... ]\n[ ... ]\n[ ... ]"
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
              return inner.split(',').map((c: string) => c.trim()).join(' & ');
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
        return inner.split(',').map((c: string) => c.trim()).join(' & ');
      }
      return inner.trim().split(/\s+/).join(' & ');
    });
    resultLines.push(`\\begin{bmatrix} ${rows.join(' \\\\ ')} \\end{bmatrix}`);
  } else if (matrixLines.length > 0) {
    resultLines.push(...matrixLines);
  }

  s = resultLines.join('\n');

  // 7. Convert transpose vectors like "[3 -1 2]^T" or "[-7 2 1]^T"
  s = s.replace(/\[\s*([-+0-9a-zA-Z\s,;]+?)\s*\]\^T/g, (match, inner: string) => {
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

  // Linear transformation with vectors: L(\begin{bmatrix} ... \end{bmatrix}) -> L\left(\begin{bmatrix} ... \end{bmatrix}\right)
  s = s.replace(
    /L\(\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}\)/g,
    'L\\left(\\begin{bmatrix}$1\\end{bmatrix}\\right)'
  );

  // Set builder notation like { (x, y) | cond } or span{ ... }
  s = s.replace(/\{\s*([^{}\n|]+?)\s*\|\s*([^{}\n|]+?)\s*\}/g, '\\{ $1 \\mid $2 \\}');
  s = s.replace(/(?:^|\b)(span|dim)\s*\{\s*([^{}\n]+?)\s*\}/g, '\\$1\\{ $2 \\}');
  s = s.replace(/(?:^|\s)\{\s*([a-zA-Z0-9_, ()^*/+-]+?)\s*\}/g, ' \\{ $1 \\}');

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

  // 2. Matrix dimensions: 2×2, 2x2, 3 x 3 -> 2 \times 2
  s = s.replace(/\b(\d+)\s*[×x]\s*(\d+)\b/g, '$1 \\times $2');

  // 3. Units with carets: cm^2/s -> \text{cm}^2/\text{s}, cm^2 -> \text{cm}^2
  s = s.replace(
    /\b(cm|m|km|s|ft|in)\^(\d+)\/([a-zA-Z]+)\b/g,
    '\\text{$1}^{$2}/\\text{$3}'
  );
  s = s.replace(/\b(cm|m|km|s|ft|in)\^(\d+)\b/g, '\\text{$1}^{$2}');

  // 4. Subscripts: x_1 -> x_{1}, L_3 -> L_{3}, R_8 -> R_{8}, x_n -> x_{n}
  s = s.replace(/\b([a-zA-Z])_([0-9a-zA-Z]+)\b/g, '$1_{$2}');

  // 5. Standard upright functions: \ln, \sin, \cos, etc.
  s = s.replace(
    /\b(sin|cos|tan|ln|log|exp|arcsin|arccos|arctan|sec|csc|cot|det|span|dim)\b(?![a-zA-Z])/g,
    '\\$1 '
  );

  // 6. Derivatives (MUST RUN BEFORE DIFFERENTIAL SPACING!)
  s = s.replace(/\bd\^2y\/dx\^2\b/g, '\\frac{d^2y}{dx^2}');
  s = s.replace(/\b(d[a-z])\/(d[a-z])\b/g, '\\frac{$1}{$2}');

  // 7. Differential spacing: dx, dy, dt, dz, dp
  s = s.replace(/\b(dx|dy|dt|dz|dp|d\theta)\b/g, '\\, $1');

  // 8. Simple exponents
  s = s.replace(/([a-zA-Z0-9_]+)\^\(([^)]+)\)/g, '$1^{$2}');
  s = s.replace(/([a-zA-Z0-9_]+)\^(\d+)/g, '$1^{$2}');

  // 9. Limits: lim_{x \to 1-} or lim_{x \to 0+} or lim_{x \to a}
  s = s.replace(/lim_\{([^}]+)\}/g, (m, p1) => {
    let sub = p1.trim().replace(/([0-9a-zA-Z\\]+)([-+])$/, '$1^{$2}');
    return '\\lim_{' + sub + '} ';
  });

  // 10. Sums: ∑_{i=1}^{n}
  s = s.replace(/∑_\{([^}]+)\}\^\{([^}]+)\}/g, '\\sum_{$1}^{$2} ');
  s = s.replace(/∑/g, '\\sum ');

  // 11. Integrals: ∫_{a}^{b} or ∫
  s = s.replace(/∫_\{([^}]+)\}\^\{([^}]+)\}/g, '\\int_{$1}^{$2} ');
  s = s.replace(/∫/g, '\\int ');

  // 12. Roots: ³√(expr) or √(expr) or √num
  s = s.replace(/³√\(([^)]+)\)/g, '\\sqrt[3]{$1}');
  s = s.replace(/³√([a-zA-Z0-9]+)/g, '\\sqrt[3]{$1}');
  s = s.replace(/√\(([^)]+)\)/g, '\\sqrt{$1}');
  s = s.replace(/√([a-zA-Z0-9]+)/g, '\\sqrt{$1}');

  // 13. Fractions:
  s = s.replace(/\|([^|]+)\|\s*\/\s*\(([^)]+)\)/g, '\\frac{|$1|}{$2}');
  s = s.replace(/\(\s*\(([^()]+)\)\s*\/\s*([^()]+)\s*\)/g, '\\frac{$1}{$2}');
  s = s.replace(/\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}');
  s = s.replace(/\(([^)]+)\)\s*\/\s*([a-zA-Z0-9_^{}]+)/g, '\\frac{$1}{$2}');
  s = s.replace(/(\b[-+]?\d+)\s*\/\s*(\\sqrt\{[^}]+\}|\b\d+)/g, '\\frac{$1}{$2}');
  s = s.replace(/([a-zA-Z0-9]+)\s*\/\s*(\\sqrt\{[^}]+\})/g, '\\frac{$1}{$2}');

  // 14. Matrices from JSON: [[1, 2], [3, 4]]
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
  } else if (closeBraces > openBraces) {
    s = s.replace(/\}+$/, (m) => '}'.repeat(Math.max(0, m.length - (closeBraces - openBraces))));
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
 * Checks if a string is pure mathematical content without natural language English words.
 */
export function isPureMath(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  const hasEnglishProse =
    /\b(?:the|and|find|when|where|with|that|from|which|estimate|approximate|evaluate|calculate|determine|suppose|assume|given|let|are|of|for|at|by|in|to|then|such|each|all|any|there|is\s+a|is\s+an|is\s+the|is\s+in|is\s+not)\b/i.test(
      trimmed
    );
  if (hasEnglishProse) return false;

  return (
    /\\begin\{(?:cases|bmatrix)\}/.test(trimmed) ||
    /^[A-Za-z]\([a-z]\)\s*=/.test(trimmed) ||
    /^[A-Za-z]_[0-9a-zA-Z]+\s*=/.test(trimmed) ||
    /^[0-9a-zA-Z^_+*/\s()-]+=[0-9a-zA-Z^_+*/\s()-]+$/.test(trimmed) ||
    /^[±\d\s/\\sqrt{}[\]]+$/.test(trimmed) ||
    /^\[\s*[-+0-9a-zA-Z\s,;]+?\s*\](?:\^T)?$/.test(trimmed) ||
    /^∫/.test(trimmed) ||
    /^lim_/.test(trimmed) ||
    /^\\lim_/.test(trimmed) ||
    /^[a-zA-Z0-9_]+\^[0-9]+$/.test(trimmed)
  );
}

/**
 * Checks if a line or string is a standalone mathematical formula line
 */
export function isStandaloneFormula(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  return (
    /^(?:lim_\{|\\lim_\{|∫|\\int|\b\w+\(x\)\s*=|Evaluate the limit lim_|Find the limit\s*lim_)/.test(
      trimmed
    ) ||
    /^[a-zA-Z]\([a-zA-Z]\)\s*=\s*\{/.test(trimmed) ||
    /^\\begin\{(?:bmatrix|cases)\}/.test(trimmed) ||
    /^[A-Z]\s*=\s*\\begin\{bmatrix\}/.test(trimmed) ||
    (/^[a-zA-Z0-9^_+*/\s()-]+=[0-9a-zA-Z^_+*/\s()-]+$/.test(trimmed) && /\^/.test(trimmed)) ||
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
    /\b[a-zA-Z]_\{[^}]+\}/.test(text) ||
    /\b[a-zA-Z]\([a-zA-Z0-9]\)\s*=/.test(text) ||
    /\b\d+\s*[×x]\s*\d+\b/.test(text) ||
    /\[\[.*?\]\]/.test(text) ||
    /\\begin\{(?:bmatrix|cases)\}/.test(text) ||
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
  /(?:\$(?!\s|\d)[^$\n]+(?<!\s)\$|\\\([^\)]+\\\)|\\begin\{cases\}[\s\S]*?\\end\{cases\}|L(?:\\left)?\(\\begin\{bmatrix\}[\s\S]*?\\end\{bmatrix\}(?:\\right)?\)\s*=\s*\\begin\{bmatrix\}[\s\S]*?\\end\{bmatrix\}|[A-Za-z]\s*=\s*\\begin\{bmatrix\}[\s\S]*?\\end\{bmatrix\}(?:\^T)?|\\begin\{bmatrix\}[\s\S]*?\\end\{bmatrix\}(?:\^T)?|lim_\{[^}]+\}\s*(?:\([^)]+\)|[a-zA-Z0-9_|^+\-*()]+)*(?:\s*=\s*[-+0-9a-zA-Z()]+)?|∫_\{[^}]+\}\^\{[^}]+\}[^,.:;\n]*\bd[a-z]\b|∫[^,.:;\n]*\bd[a-z]\b|\|[a-zA-Z0-9_|^+\-*\s()]+\||(?:span\s*)?\{[^{}\n|]+\|[^{}\n|]+\}|(?:span\s*)?\{[^{}\n]+\}(?:\s*=\s*(?:span\s*)?\{[^{}\n]+\})*|[-+0-9a-zA-Z_()^*/{}π]+(?:\s*[-+*/]\s*[-+0-9a-zA-Z_()^*/{}π]+)*\s*=\s*(?:lim_\{[^}]+\}\s*)?[-+0-9a-zA-Z_()^*/{}√π]+(?:\s*[-+*/]\s*[-+0-9a-zA-Z_()^*/{}√π]+)*|\b[a-zA-Z]\s*→\s*[-+0-9a-zA-Z∞]+\b|\b(?:d\^2y\/dx\^2|dy\/dt|dz\/dt|dy\/dx|dp\/dt|y'\(1\)|f'\(x\)|f\(x\)|g\(x\)|w'\(t\))\b|³?√\([^)]+\)|³?√[0-9a-zA-Z]+|\b[a-zA-Z]\^[0-9]+|\b[a-zA-Z]\^\([^)]+\)|\b[a-zA-Z]_[0-9a-zA-Z]+\b|\b[a-zA-Z]_\{[^}]+\}|\b\d*\s*(?:cm|m|km|s|ft|in)\^[0-9]+(?:\/[a-zA-Z]+)?\b|\b\d+\s*[×x]\s*\d+\b|±\s*\d+(?:\/√\d+)?|\[\s*[-+]?(?:\d+|π|∞|\w+)(?:\/\d+)?\s*,\s*[-+]?(?:\d+|π|∞|\w+)(?:\/\d+)?\s*\])/g;

export interface MathToken {
  type: 'text' | 'math';
  value: string;
}

/**
 * Tokenizes a sentence into plain text fragments and inline math formulas
 */
export function tokenizeSentenceWithMath(text: string): MathToken[] {
  if (!text) return [];
  if (isPureMath(text)) {
    return [{ type: 'math', value: text }];
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
    if (/[.,;:?]$/.test(mathVal) && !mathVal.endsWith('..')) {
      trailingPunc = mathVal.slice(-1);
      mathVal = mathVal.slice(0, -1);
    }
    // Also if trailing unbalanced closing brace, strip it
    const openBraces = (mathVal.match(/\{/g) || []).length;
    const closeBraces = (mathVal.match(/\}/g) || []).length;
    if (closeBraces > openBraces && mathVal.endsWith('}')) {
      trailingPunc = '}' + trailingPunc;
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
