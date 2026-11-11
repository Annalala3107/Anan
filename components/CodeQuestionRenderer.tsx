'use client';

import { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface CodeQuestionRendererProps {
  content?: string;
  className?: string;
  isCompact?: boolean;
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
 * Single-pass master lexer regex:
 * Captures tokens without recursive string mutation (avoids class name number corruption)
 */
const C_TOKEN_REGEX =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(#[a-zA-Z_]\w*[^\n]*)|(\b(?:int|float|double|char|void|long|short|unsigned|signed|struct|union|enum|typedef|const|static|extern|return|if|else|switch|case|default|break|continue|for|while|do|goto|sizeof)\b)|(\b(?:printf|scanf|malloc|calloc|realloc|free|fopen|fclose|fgets|fputs|fscanf|fprintf|fseek|ftell|rewind|feof|strcmp|strncmp|strcpy|strncpy|strcat|strncat|strlen|pow|sqrt|abs|fabs|rand|srand|exit|main)\b)|(\b0x[0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b)/g;

/**
 * Highlights a single line of C/C++ source code safely
 */
function highlightLine(line: string): string {
  if (!line || !line.trim()) return '&nbsp;';

  // Reset regex state
  C_TOKEN_REGEX.lastIndex = 0;

  let lastIndex = 0;
  let result = '';
  let match: RegExpExecArray | null;

  while ((match = C_TOKEN_REGEX.exec(line)) !== null) {
    // Append leading un-highlighted text (properly escaped)
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

  // Append any trailing un-highlighted text
  if (lastIndex < line.length) {
    result += escapeHtml(line.slice(lastIndex));
  }

  return result || '&nbsp;';
}

/**
 * Checks if a string contains C programming code snippets
 */
export function hasCodeBlock(text?: string): boolean {
  if (!text) return false;
  return (
    text.includes('#include') ||
    text.includes('int main') ||
    /\b(printf|scanf)\s*\(/.test(text) ||
    /\b(for|while)\s*\([^)]*\)\s*[{;]?/.test(text) ||
    /\bdo\s*\{/.test(text) ||
    /\b(int|char|float|double|void)\s+\*?[a-zA-Z_]\w*\s*(\[|=|\()/.test(text) ||
    /\b(malloc|free|fopen|strcmp)\s*\(/.test(text)
  );
}

/**
 * Splits question into introductory prompt, code snippet, and any outro text
 */
function parseQuestionContent(text: string) {
  const lines = text.split('\n');
  const codeStartIndex = lines.findIndex(
    (line) =>
      line.includes('#include') ||
      line.includes('#define') ||
      line.includes('int main') ||
      /^\s*(int|char|float|double|void)\s+/.test(line) ||
      /^\s*(for|while|do)\s*\(/.test(line) ||
      /^\s*(printf|scanf)\s*\(/.test(line) ||
      /^\s*struct\s+/.test(line)
  );

  if (codeStartIndex === -1) {
    return { intro: text, code: '', outro: '' };
  }

  const intro = lines.slice(0, codeStartIndex).join('\n').trim();
  const remaining = lines.slice(codeStartIndex);

  // Find if there's any outro prompt after code
  let codeEndIndex = remaining.length;
  for (let i = remaining.length - 1; i >= 0; i--) {
    const line = remaining[i].trim();
    if (
      line.endsWith('?') ||
      line.startsWith('What ') ||
      line.startsWith('Choose ') ||
      line.startsWith('Which ')
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

  return { intro, code, outro };
}

export default function CodeQuestionRenderer({
  content = '',
  className = '',
  isCompact = false,
}: CodeQuestionRendererProps) {
  const [copied, setCopied] = useState(false);

  if (!content) return null;

  const isCode = hasCodeBlock(content);

  if (!isCode) {
    return (
      <div className={`whitespace-pre-wrap ${className}`}>
        {content}
      </div>
    );
  }

  const { intro, code, outro } = parseQuestionContent(content);

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const codeLines = code.split('\n');

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Intro Prompt */}
      {intro && (
        <p className="leading-relaxed font-bold text-slate-900 dark:text-slate-100">
          {intro}
        </p>
      )}

      {/* Mac Terminal Code Window */}
      {code && (
        <div className="rounded-2xl overflow-hidden border border-slate-700/80 bg-[#0A0E17] shadow-2xl transition-all">
          {/* Window Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 select-none">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-[11px] font-mono text-slate-400 ml-2 flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-indigo-400" />
                <span>main.c</span>
              </span>
            </div>

            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white px-2 py-1 rounded-md hover:bg-slate-800 transition-colors"
              title="Sao chép mã C"
            >
              {copied ? (
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

          {/* Code Body with Synchronized Line Numbers */}
          <div className="p-4 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed selection:bg-indigo-500/30">
            <table className="border-collapse w-full">
              <tbody>
                {codeLines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="select-none text-slate-600 text-right pr-4 border-r border-slate-800/80 font-mono text-xs w-8 align-top">
                      {idx + 1}
                    </td>
                    <td
                      className="pl-4 font-mono text-slate-200 whitespace-pre align-top"
                      dangerouslySetInnerHTML={{ __html: highlightLine(line) }}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Outro Prompt if any */}
      {outro && (
        <p className="leading-relaxed font-bold text-slate-900 dark:text-slate-100 pt-1">
          {outro}
        </p>
      )}
    </div>
  );
}
