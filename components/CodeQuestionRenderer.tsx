'use client';

import { useState } from 'react';
import { Copy, Check, Terminal, Table as TableIcon, FileText } from 'lucide-react';
import QuestionMedia from '@/components/QuestionMedia';
import MathText from '@/components/MathText';
import RomanChoicesGrid from '@/components/RomanChoicesGrid';
import {
  extractRomanChoices,
  isStandaloneFormula,
  formatPiecewise,
  convertAsciiMatrix,
} from '@/lib/mathUtils';

interface CodeQuestionRendererProps {
  content?: string;
  className?: string;
  isCompact?: boolean;
  image?: string;
  imageCaption?: string;
}

/**
 * Escapes raw text to prevent XSS before wrapping in markup
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Master lexer regex for C/C++ source code
 */
const C_TOKEN_REGEX =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(#[a-zA-Z_]\w*[^\n]*)|(\b(?:int|float|double|char|void|long|short|unsigned|signed|struct|union|enum|typedef|const|static|extern|return|if|else|switch|case|default|break|continue|for|while|do|goto|sizeof)\b)|(\b(?:printf|scanf|malloc|calloc|realloc|free|fopen|fclose|fgets|fputs|fscanf|fprintf|fseek|ftell|rewind|feof|strcmp|strncmp|strcpy|strncpy|strcat|strncat|strlen|pow|sqrt|abs|fabs|rand|srand|exit|main)\b)|(\b0x[0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b)/g;

/**
 * Master lexer regex for Python source code
 */
const PYTHON_TOKEN_REGEX =
  /(#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|"""[\s\S]*?"""|'''[\s\S]*?''')|(\b(?:def|class|return|if|elif|else|for|while|break|continue|import|from|as|try|except|finally|with|in|is|not|and|or|lambda|yield|pass|raise|global|nonlocal|assert|async|await|None|True|False)\b)|(\b(?:print|len|range|str|int|float|list|dict|set|tuple|bool|input|open|type|sum|min|max|sorted|enumerate|zip|map|filter|super|self|__init__|append|extend|split|join|strip|replace|pop|remove|keys|values|items)\b)|(\b0x[0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b)/g;

/**
 * Highlights a single line of C/C++ source code safely
 */
function highlightCLine(line: string): string {
  if (!line || !line.trim()) return '&nbsp;';
  C_TOKEN_REGEX.lastIndex = 0;

  let lastIndex = 0;
  let result = '';
  let match: RegExpExecArray | null;

  while ((match = C_TOKEN_REGEX.exec(line)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(line.slice(lastIndex, match.index));
    }
    const [fullMatch, comment, str, preproc, keyword, fn, num] = match;
    if (comment) {
      result += `<span class="text-slate-400 italic">${escapeHtml(comment)}</span>`;
    } else if (str) {
      result += `<span class="text-emerald-400 font-medium">${escapeHtml(str)}</span>`;
    } else if (preproc) {
      result += `<span class="text-rose-400 font-bold">${escapeHtml(preproc)}</span>`;
    } else if (keyword) {
      result += `<span class="text-purple-400 font-bold">${escapeHtml(keyword)}</span>`;
    } else if (fn) {
      result += `<span class="text-sky-300 font-semibold">${escapeHtml(fn)}</span>`;
    } else if (num) {
      result += `<span class="text-amber-300 font-semibold">${escapeHtml(num)}</span>`;
    } else {
      result += escapeHtml(fullMatch);
    }
    lastIndex = match.index + fullMatch.length;
  }
  if (lastIndex < line.length) {
    result += escapeHtml(line.slice(lastIndex));
  }
  return result || '&nbsp;';
}

/**
 * Highlights a single line of Python source code safely
 */
function highlightPythonLine(line: string): string {
  if (!line || !line.trim()) return '&nbsp;';
  PYTHON_TOKEN_REGEX.lastIndex = 0;

  let lastIndex = 0;
  let result = '';
  let match: RegExpExecArray | null;

  while ((match = PYTHON_TOKEN_REGEX.exec(line)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(line.slice(lastIndex, match.index));
    }
    const [fullMatch, comment, str, keyword, fn, num] = match;
    if (comment) {
      // In Python, # is comment (slate italic, NOT rose preprocessor)
      result += `<span class="text-slate-400 italic">${escapeHtml(comment)}</span>`;
    } else if (str) {
      result += `<span class="text-emerald-400 font-medium">${escapeHtml(str)}</span>`;
    } else if (keyword) {
      result += `<span class="text-purple-400 font-bold">${escapeHtml(keyword)}</span>`;
    } else if (fn) {
      result += `<span class="text-sky-300 font-semibold">${escapeHtml(fn)}</span>`;
    } else if (num) {
      result += `<span class="text-amber-300 font-semibold">${escapeHtml(num)}</span>`;
    } else {
      result += escapeHtml(fullMatch);
    }
    lastIndex = match.index + fullMatch.length;
  }
  if (lastIndex < line.length) {
    result += escapeHtml(line.slice(lastIndex));
  }
  return result || '&nbsp;';
}

/**
 * Checks if a string contains actual programming source code (C, Python, etc.)
 */
export function isProgrammingCode(text?: string): boolean {
  if (!text) return false;
  if (text.includes('```')) return true;
  if (
    text.includes('#include') ||
    text.includes('int main') ||
    /\b(printf|scanf)\s*\(/.test(text) ||
    /\b(for|while)\s*\([^)]*\)\s*[{;]?/.test(text) ||
    /\b(int|char|float|double|void)\s+\*?[a-zA-Z_]\w*\s*(\[|=|\()/.test(text) ||
    /\b(malloc|free|fopen|strcmp)\s*\(/.test(text)
  ) {
    return true;
  }
  if (
    /^\s*(def|class)\s+\w+/m.test(text) ||
    /^\s*>>>\s+/m.test(text) ||
    /\bprint\s*\(/.test(text) ||
    /\bimport\s+[a-zA-Z_]/.test(text) ||
    /\bfrom\s+[a-zA-Z_]+\s+import/.test(text)
  ) {
    return true;
  }
  return false;
}

/**
 * Checks if a string contains programming code snippets or formatted blocks
 */
export function hasCodeBlock(text?: string): boolean {
  if (!text) return false;
  if (isProgrammingCode(text)) return true;

  // Check for pipe tables (at least 2 lines containing |)
  const lines = text.split('\n');
  const pipeCount = lines.filter((l) => l.includes('|')).length;
  if (pipeCount >= 2) return true;

  // Check for ASCII matrices
  const matrixCount = lines.filter((l) => /^\s*\[[\s0-9.,-]+\]\s*$/.test(l)).length;
  if (matrixCount >= 2) return true;

  return false;
}

type ParsedBlock =
  | { type: 'text'; text: string }
  | { type: 'code'; language: 'c' | 'python' | 'text'; code: string; fileName: string }
  | { type: 'table'; raw: string; headers: string[] | null; rows: string[][] }
  | { type: 'matrix'; text: string };

function detectLanguage(codeSnippet: string): 'c' | 'python' | 'text' {
  if (
    codeSnippet.includes('#include') ||
    codeSnippet.includes('int main') ||
    /\b(printf|scanf)\s*\(/.test(codeSnippet) ||
    /^\s*(int|char|float|double|void)\s+/m.test(codeSnippet)
  ) {
    return 'c';
  }
  if (
    /^\s*(def|class)\s+/m.test(codeSnippet) ||
    /^\s*>>>\s+/m.test(codeSnippet) ||
    /\bprint\s*\(/.test(codeSnippet) ||
    /\bimport\s+[a-zA-Z_]/.test(codeSnippet) ||
    /\bself\.\w+/.test(codeSnippet)
  ) {
    return 'python';
  }
  return 'text';
}

function parseBlocks(content: string): ParsedBlock[] {
  // 1. If content contains markdown fences ```
  if (content.includes('```')) {
    const blocks: ParsedBlock[] = [];
    const fenceRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = fenceRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index).trim();
        if (textBefore) blocks.push({ type: 'text', text: textBefore });
      }
      const rawLang = (match[1] || '').trim().toLowerCase();
      const code = match[2].trim();
      let lang: 'c' | 'python' | 'text' = 'text';
      if (rawLang === 'c' || rawLang === 'cpp') lang = 'c';
      else if (rawLang === 'py' || rawLang === 'python') lang = 'python';
      else lang = detectLanguage(code);

      const fileName = lang === 'python' ? 'main.py' : lang === 'c' ? 'main.c' : 'snippet.txt';
      blocks.push({ type: 'code', language: lang, code, fileName });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      const textAfter = content.slice(lastIndex).trim();
      if (textAfter) blocks.push({ type: 'text', text: textAfter });
    }
    return blocks;
  }

  const lines = content.split('\n');

  // 2. Check for Pipe Table
  const tableIndices: number[] = [];
  lines.forEach((line, idx) => {
    if (line.includes('|') && line.trim().length > 3) {
      tableIndices.push(idx);
    }
  });

  // Verify consecutive table lines
  if (tableIndices.length >= 2) {
    let isContiguous = true;
    for (let i = 1; i < tableIndices.length; i++) {
      if (tableIndices[i] !== tableIndices[i - 1] + 1) {
        isContiguous = false;
        break;
      }
    }

    if (isContiguous) {
      const startIdx = tableIndices[0];
      const endIdx = tableIndices[tableIndices.length - 1] + 1;
      const intro = lines.slice(0, startIdx).join('\n').trim();
      const tableRawLines = lines.slice(startIdx, endIdx);
      const outro = lines.slice(endIdx).join('\n').trim();

      const parsedRows = tableRawLines.map((rowStr) =>
        rowStr
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim())
      );

      const hasDivider =
        parsedRows.length > 1 &&
        parsedRows[1].every((cell) => /^:?-+:?$/.test(cell.replace(/\s+/g, '')));

      const headers = hasDivider ? parsedRows[0] : null;
      const rows = hasDivider ? parsedRows.slice(2) : parsedRows;

      const blocks: ParsedBlock[] = [];
      if (intro) blocks.push({ type: 'text', text: intro });
      blocks.push({
        type: 'table',
        raw: tableRawLines.join('\n'),
        headers,
        rows,
      });
      if (outro) blocks.push({ type: 'text', text: outro });
      return blocks;
    }
  }

  // 3. Check for ASCII Matrix: consecutive lines matching [ ... ]
  const matrixIndices: number[] = [];
  lines.forEach((line, idx) => {
    if (/^\s*\[[\s0-9.,-]+\]\s*$/.test(line)) {
      matrixIndices.push(idx);
    }
  });
  if (matrixIndices.length >= 2 && matrixIndices[matrixIndices.length - 1] - matrixIndices[0] === matrixIndices.length - 1) {
    const startIdx = matrixIndices[0];
    const endIdx = matrixIndices[matrixIndices.length - 1] + 1;
    const intro = lines.slice(0, startIdx).join('\n').trim();
    const matrixText = lines.slice(startIdx, endIdx).join('\n');
    const outro = lines.slice(endIdx).join('\n').trim();

    const blocks: ParsedBlock[] = [];
    if (intro) blocks.push({ type: 'text', text: intro });
    blocks.push({ type: 'matrix', text: matrixText });
    if (outro) blocks.push({ type: 'text', text: outro });
    return blocks;
  }

  // 4. Check for C or Python Code Block
  const codeStartIndex = lines.findIndex(
    (line) =>
      line.includes('#include') ||
      line.includes('#define') ||
      line.includes('int main') ||
      /^\s*(int|char|float|double|void)\s+/.test(line) ||
      /^\s*(for|while|do)\s*\(/.test(line) ||
      /^\s*(printf|scanf)\s*\(/.test(line) ||
      /^\s*struct\s+/.test(line) ||
      /^\s*(def|class)\s+\w+/.test(line) ||
      /^\s*>>>\s+/.test(line) ||
      /^\s*for\s+\w+\s+in\s+/.test(line) ||
      /^\s*print\s*\(/.test(line)
  );

  if (codeStartIndex !== -1) {
    const intro = lines.slice(0, codeStartIndex).join('\n').trim();
    const remaining = lines.slice(codeStartIndex);

    let codeEndIndex = remaining.length;
    for (let i = remaining.length - 1; i >= 0; i--) {
      const line = remaining[i].trim();
      if (
        line.endsWith('?') ||
        line.startsWith('What ') ||
        line.startsWith('Choose ') ||
        line.startsWith('Which ') ||
        line.startsWith('The correct way ') ||
        line.startsWith('Output:')
      ) {
        codeEndIndex = i;
        break;
      }
    }

    let code = '';
    let outro = '';

    if (codeEndIndex < remaining.length && codeEndIndex > 0) {
      code = remaining.slice(0, codeEndIndex).join('\n').trim();
      outro = remaining.slice(codeEndIndex).join('\n').trim();
    } else {
      code = remaining.join('\n').trim();
    }

    const lang = detectLanguage(code);
    const fileName = lang === 'python' ? 'main.py' : lang === 'c' ? 'main.c' : 'snippet.txt';

    const blocks: ParsedBlock[] = [];
    if (intro) blocks.push({ type: 'text', text: intro });
    blocks.push({ type: 'code', language: lang, code, fileName });
    if (outro) blocks.push({ type: 'text', text: outro });
    return blocks;
  }

  // Fallback: single text block
  return [{ type: 'text', text: content }];
}

export default function CodeQuestionRenderer({
  content = '',
  className = '',
  isCompact = false,
  image,
  imageCaption,
}: CodeQuestionRendererProps) {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  if (!content && !image) return null;

  const isCode = isProgrammingCode(content);

  // Pre-process multiline ASCII matrices and transpose vectors only for non-code content
  const preparedContent = isCode ? content : convertAsciiMatrix(content);
  // Extract any sub-choices (i), (ii), etc.
  const { stem, romanChoices } = isCode
    ? { stem: content, romanChoices: null }
    : extractRomanChoices(preparedContent);
  const blocks = parseBlocks(stem);

  const handleCopy = async (text: string, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCodeIndex(idx);
      setTimeout(() => setCopiedCodeIndex(null), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Visual Diagram / Image if present */}
      {image && <QuestionMedia src={image} caption={imageCaption} />}

      {/* Render Parsed Blocks Sequentially */}
      {blocks.map((block, bIdx) => {
        if (block.type === 'text') {
          // If the text block is a piecewise function, render as display formula
          if (/[a-zA-Z]\([a-zA-Z]\)\s*=\s*\{/.test(block.text)) {
            return (
              <div
                key={bIdx}
                className="my-3 py-3 px-4 rounded-2xl bg-indigo-50/90 dark:bg-slate-900/85 border border-indigo-200 dark:border-indigo-500/30 text-slate-900 dark:text-indigo-100 shadow-sm dark:shadow-md"
              >
                <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1 select-none">
                  <span>Hàm số định nghĩa từng khúc / Piecewise Function</span>
                </div>
                <MathText content={formatPiecewise(block.text)} displayMode={true} />
              </div>
            );
          }

          const textLines = block.text.split('\n');
          return (
            <div key={bIdx} className="space-y-2">
              {textLines.map((line, lIdx) => {
                const trimmed = line.trim();
                if (!trimmed) return null;

                if (isStandaloneFormula(trimmed)) {
                  return (
                    <div
                      key={lIdx}
                      className="my-3 py-3 px-4 rounded-2xl bg-indigo-50/90 dark:bg-slate-900/85 border border-indigo-200 dark:border-indigo-500/30 text-slate-900 dark:text-indigo-100 shadow-sm dark:shadow-md"
                    >
                      <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1 select-none">
                        <span>Biểu thức toán học / Công thức</span>
                      </div>
                      <MathText content={trimmed} displayMode={true} />
                    </div>
                  );
                }

                return (
                  <MathText
                    key={lIdx}
                    as="p"
                    content={line}
                    className="leading-[1.68] font-medium text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-words"
                  />
                );
              })}
            </div>
          );
        }

        if (block.type === 'table') {
          return (
            <div
              key={bIdx}
              className="rounded-2xl overflow-hidden border border-slate-700/80 bg-[#0A0E17] shadow-xl my-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 select-none">
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <TableIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Dữ liệu bảng / K-map</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => handleCopy(block.raw, bIdx, e)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white px-2 py-0.5 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {copiedCodeIndex === bIdx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Table Data */}
              <div className="p-3 overflow-x-auto">
                <table className="w-full text-xs sm:text-sm font-mono border-collapse text-left">
                  {block.headers && (
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-800/60">
                        {block.headers.map((h, hIdx) => (
                          <th key={hIdx} className="px-3 py-2 text-indigo-300 font-bold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="border-b border-slate-800/60 hover:bg-white/[0.03] transition-colors"
                      >
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-1.5 text-slate-200">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (block.type === 'matrix') {
          return (
            <div
              key={bIdx}
              className="rounded-2xl overflow-hidden border border-slate-700/80 bg-[#0A0E17] shadow-xl my-3"
            >
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 select-none">
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ma trận / Dữ liệu căn cột</span>
                </span>
              </div>
              <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono text-amber-200 leading-relaxed whitespace-pre">
                {block.text}
              </pre>
            </div>
          );
        }

        // Block type === 'code'
        const codeLines = block.code.split('\n');
        const isPython = block.language === 'python';

        return (
          <div
            key={bIdx}
            className="rounded-2xl overflow-hidden border border-slate-700/80 bg-[#0A0E17] shadow-2xl transition-all my-3"
          >
            {/* Terminal Window Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 select-none">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] font-mono text-slate-400 ml-2 flex items-center gap-1.5">
                  <Terminal
                    className={`w-3.5 h-3.5 ${isPython ? 'text-amber-400' : 'text-indigo-400'}`}
                  />
                  <span>{block.fileName}</span>
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => handleCopy(block.code, bIdx, e)}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white px-2 py-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                title="Sao chép mã nguồn"
              >
                {copiedCodeIndex === bIdx ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Body with Line Numbers */}
            <div className="p-4 overflow-x-auto text-[13px] sm:text-sm font-mono leading-[1.65] selection:bg-indigo-500/30">
              <table className="border-collapse w-full">
                <tbody>
                  {codeLines.map((line, lIdx) => (
                    <tr key={lIdx} className="hover:bg-white/[0.02]">
                      <td className="select-none text-slate-500 text-right pr-4 border-r border-slate-800/80 font-mono text-xs w-8 align-top">
                        {lIdx + 1}
                      </td>
                      <td
                        className="pl-4 font-mono text-slate-200 whitespace-pre align-top"
                        dangerouslySetInnerHTML={{
                          __html: isPython
                            ? highlightPythonLine(line)
                            : highlightCLine(line),
                        }}
                      />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Roman Numeral Sub-Choices if present */}
      {romanChoices && <RomanChoicesGrid items={romanChoices} />}
    </div>
  );
}
