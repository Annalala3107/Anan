import {
  containsMath,
  isStandaloneFormula,
  tokenizeSentenceWithMath,
} from '@/lib/mathUtils';

export type InlineSegment =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string }
  | { type: 'code'; value: string }
  | { type: 'bold'; children: InlineSegment[] }
  | { type: 'italic'; children: InlineSegment[] };

export type TextBlockGroup =
  | { type: 'formula'; line: string }
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'paragraph'; line: string };

const CODE_TOKEN_PREFIX = '\uE000C';
const MATH_TOKEN_PREFIX = '\uE000M';
const TOKEN_SUFFIX = '\uE001';

const INLINE_CODE_REGEX = /`([^`\n]+)`/g;
const EXPLICIT_LATEX_REGEX =
  /\$\$[^$\n]+\$\$|\$(?!\s|\d)[^$\n]+(?<!\s)\$|\\\([^\)]+\\\)|\\\[[^\\]+\\\]|\\begin\{(?:cases|bmatrix)\}[\s\S]*?\\end\{(?:cases|bmatrix)\}/g;
const BOLD_REGEX =
  /(?<![0-9a-zA-Z_])\*\*(?=\S)([^\n]+?)(?<=\S)\*\*(?![0-9a-zA-Z_*])/g;
const ITALIC_REGEX =
  /(?<![0-9a-zA-Z_*])\*(?=\S)([^*\n]+?)(?<=\S)\*(?![0-9a-zA-Z_*])/g;
const PLACEHOLDER_SPLIT_REGEX = /(\uE000[CM]\d+\uE001)/g;

function expandLeafPlaceholders(
  rawText: string,
  codeTokens: string[],
  mathTokens: string[]
): InlineSegment[] {
  if (!rawText) return [];
  const parts = rawText.split(PLACEHOLDER_SPLIT_REGEX);
  const out: InlineSegment[] = [];

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith(CODE_TOKEN_PREFIX) && part.endsWith(TOKEN_SUFFIX)) {
      const idx = Number(
        part.slice(CODE_TOKEN_PREFIX.length, -TOKEN_SUFFIX.length)
      );
      const value = codeTokens[idx];
      if (value !== undefined) {
        out.push({ type: 'code', value });
      }
      continue;
    }

    if (part.startsWith(MATH_TOKEN_PREFIX) && part.endsWith(TOKEN_SUFFIX)) {
      const idx = Number(
        part.slice(MATH_TOKEN_PREFIX.length, -TOKEN_SUFFIX.length)
      );
      const value = mathTokens[idx];
      if (value !== undefined) {
        out.push({ type: 'math', value });
      }
      continue;
    }

    if (containsMath(part)) {
      const mathSegments = tokenizeSentenceWithMath(part);
      for (const seg of mathSegments) {
        if (seg.value) {
          out.push({ type: seg.type, value: seg.value });
        }
      }
    } else {
      out.push({ type: 'text', value: part });
    }
  }

  return out;
}

function parseItalicAndLeaves(
  text: string,
  codeTokens: string[],
  mathTokens: string[]
): InlineSegment[] {
  if (!text) return [];
  const out: InlineSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  ITALIC_REGEX.lastIndex = 0;
  while ((match = ITALIC_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(
        ...expandLeafPlaceholders(
          text.slice(lastIndex, match.index),
          codeTokens,
          mathTokens
        )
      );
    }
    const inner = match[1];
    out.push({
      type: 'italic',
      children: expandLeafPlaceholders(inner, codeTokens, mathTokens),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    out.push(
      ...expandLeafPlaceholders(text.slice(lastIndex), codeTokens, mathTokens)
    );
  }

  return out;
}

function parseBoldItalicAndLeaves(
  text: string,
  codeTokens: string[],
  mathTokens: string[]
): InlineSegment[] {
  if (!text) return [];
  const out: InlineSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  BOLD_REGEX.lastIndex = 0;
  while ((match = BOLD_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(
        ...parseItalicAndLeaves(
          text.slice(lastIndex, match.index),
          codeTokens,
          mathTokens
        )
      );
    }
    const inner = match[1];
    out.push({
      type: 'bold',
      children: parseItalicAndLeaves(inner, codeTokens, mathTokens),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    out.push(
      ...parseItalicAndLeaves(text.slice(lastIndex), codeTokens, mathTokens)
    );
  }

  return out;
}

/**
 * Safely tokenizes inline Markdown (**bold**, *italic*, `code`) alongside LaTeX/ASCII math
 * without corrupting expressions inside backticks or mathematical formulas.
 */
export function tokenizeInlineRichText(content: string): InlineSegment[] {
  if (!content) return [];

  const codeTokens: string[] = [];
  const mathTokens: string[] = [];

  const withCodePlaceholders = content.replace(INLINE_CODE_REGEX, (_, codeBody: string) => {
    const idx = codeTokens.length;
    codeTokens.push(codeBody);
    return `${CODE_TOKEN_PREFIX}${idx}${TOKEN_SUFFIX}`;
  });

  // Protect explicit LaTeX delimiters before scanning **bold** / *italic*
  const chunks = withCodePlaceholders.split(/(\uE000C\d+\uE001)/g);
  const masked = chunks
    .map((chunk) => {
      if (
        !chunk ||
        (chunk.startsWith(CODE_TOKEN_PREFIX) && chunk.endsWith(TOKEN_SUFFIX))
      ) {
        return chunk;
      }
      return chunk.replace(EXPLICIT_LATEX_REGEX, (mathExpr: string) => {
        const idx = mathTokens.length;
        mathTokens.push(mathExpr);
        return `${MATH_TOKEN_PREFIX}${idx}${TOKEN_SUFFIX}`;
      });
    })
    .join('');

  return parseBoldItalicAndLeaves(masked, codeTokens, mathTokens);
}

/**
 * Groups consecutive Markdown headings, bullet lists (- / • / * ), and multi-line numbered lists (1. / 2.)
 * inside text blocks while preserving standalone math formula lines.
 */
export function groupMarkdownTextLines(text: string): TextBlockGroup[] {
  if (!text) return [];

  const lines = text.split('\n');
  const groups: TextBlockGroup[] = [];
  let pendingUl: string[] = [];
  let pendingOlRaw: Array<{ rawLine: string; text: string }> = [];

  const flushUl = () => {
    if (pendingUl.length > 0) {
      groups.push({ type: 'ul', items: pendingUl });
      pendingUl = [];
    }
  };

  const flushOl = () => {
    if (pendingOlRaw.length >= 2) {
      groups.push({
        type: 'ol',
        items: pendingOlRaw.map((entry) => entry.text),
      });
    } else if (pendingOlRaw.length === 1) {
      groups.push({ type: 'paragraph', line: pendingOlRaw[0].rawLine });
    }
    pendingOlRaw = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushUl();
      flushOl();
      continue;
    }

    if (isStandaloneFormula(trimmed)) {
      flushUl();
      flushOl();
      groups.push({ type: 'formula', line: trimmed });
      continue;
    }

    const headingMatch = trimmed.match(/^(#{2,3})\s+(.+)$/);
    if (headingMatch) {
      flushUl();
      flushOl();
      groups.push({
        type: 'heading',
        level: headingMatch[1].length === 2 ? 2 : 3,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    const bulletMatch = trimmed.match(/^(?:[-•]|\*(?!\*))\s+(.+)$/);
    if (bulletMatch) {
      flushOl();
      pendingUl.push(bulletMatch[1].trim());
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (orderedMatch) {
      flushUl();
      pendingOlRaw.push({
        rawLine: line,
        text: orderedMatch[1].trim(),
      });
      continue;
    }

    flushUl();
    flushOl();
    groups.push({ type: 'paragraph', line });
  }

  flushUl();
  flushOl();
  return groups;
}
