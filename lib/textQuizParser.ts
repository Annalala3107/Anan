import { Word } from './types';
import { cleanOptionText, hashString, parseAnswerKeys } from './utils';

export interface ParsedQuestionResult {
  question: string;
  options: string[];
  answer: string; // 'A', 'B', 'C', 'D'
  correctWord: string;
  explanation: string;
  isValid: boolean;
  error?: string;
}

export interface ParserFilterOptions {
  stripLmsNoise?: boolean;
  unwrapPdfLines?: boolean;
  deduplicate?: boolean;
  mergeTrailingAnswerKey?: boolean;
}

export interface ParserStats {
  noiseLinesRemoved: number;
  duplicatesRemoved: number;
  trailingKeysMerged: number;
  unansweredCount: number;
}

export interface ParseExamResult {
  questions: Word[];
  unansweredQuestions: Word[];
  totalDetected: number;
  validCount: number;
  errors: string[];
  stats: ParserStats;
}

const OPTION_LINE_REGEX =
  /^\s*(\*)?\s*(?:\(\s*([A-Ha-h])\s*\)|\[\s*([A-Ha-h])\s*\]|([A-Ha-h])\s*(?:[\.\:\)]|\s+-\s+))(.*)$/;

const EXPLICIT_QUESTION_HEADER_REGEX =
  /(?:^|\n)(?=[ \t]*(?:Câu(?:\s*hỏi)?\s*\d+|Question\s*\d+|Q\s*\d+|Bài\s*\d+)(?:\s*[\.\:\)\-]|\s+))/gi;

const NUMBERED_HEADER_REGEX = /(?:^|\n)(?=[ \t]*\d+[\.\:\)]\s+)/g;

const NOISE_LINE_PATTERNS: RegExp[] = [
  /^\s*(?:Select one|Choose one|Choose the best answer|Flag question|Remove flag|Clear my choice|Not yet answered|Your answer is (?:correct|incorrect)\.?|Question text|Feedback)\s*:?\s*$/i,
  /^\s*Marked out of\s+\d+(?:[.,]\d+)?\s*$/i,
  /^\s*(?:Page|Trang)\s+\d+(?:\s*(?:of|\/)\s*\d+)?\s*$/i,
  /^\s*Điểm\s*:\s*\d+(?:[.,]\d+)?\s*\/\s*\d+(?:[.,]\d+)?\s*$/i,
];

function isOptionLine(line: string): boolean {
  return OPTION_LINE_REGEX.test(line);
}

function hasAtLeastTwoOptions(text: string): boolean {
  const lines = text.split('\n');
  let lineOptCount = 0;
  for (const line of lines) {
    if (isOptionLine(line)) lineOptCount += 1;
  }
  if (lineOptCount >= 2) return true;

  const inlineMatches = text.match(
    /(?:^|\s+)\*?\s*(?:\([A-Ha-h]\)|\[[A-Ha-h]\]|[A-Ha-h][\.\:\)])\s+/g
  );
  return Boolean(inlineMatches && inlineMatches.length >= 2);
}

function isNeutralColor(rawColor: string): boolean {
  const c = rawColor.trim().toLowerCase();
  if (
    !c ||
    c === 'inherit' ||
    c === 'initial' ||
    c === 'unset' ||
    c === 'windowtext' ||
    c === 'currentcolor' ||
    c === 'transparent'
  ) {
    return true;
  }

  // Named black/white/gray
  if (['black', 'white', 'gray', 'grey'].includes(c)) return true;

  // Hex check (#000, #111, #222, #333, #fff, etc.)
  const hexMatch = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hexMatch) {
    const hex =
      hexMatch[1].length === 3
        ? hexMatch[1]
            .split('')
            .map((ch) => ch + ch)
            .join('')
        : hexMatch[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    return maxDiff <= 22 && (r < 75 || r > 235);
  }

  // rgb(...) / rgba(...)
  const rgbMatch = c.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/
  );
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    const a = rgbMatch[4] !== undefined ? Number(rgbMatch[4]) : 1;
    if (a === 0) return true;
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    return maxDiff <= 22 && (r < 75 || r > 235);
  }

  return false;
}

function inspectElementEmphasis(el: Element): {
  hasBold: boolean;
  hasStrongHighlight: boolean;
} {
  let hasBold = false;
  let hasStrongHighlight = false;

  const checkNodeStyle = (node: Element, isPrefixOnly: boolean) => {
    const tag = node.tagName.toLowerCase();
    const style = node.getAttribute('style') || '';

    if (tag === 'u' || tag === 'mark') {
      hasStrongHighlight = true;
    }
    if (!isPrefixOnly && (tag === 'b' || tag === 'strong')) {
      hasBold = true;
    }

    if (tag === 'font') {
      const colorAttr = node.getAttribute('color');
      if (colorAttr && !isNeutralColor(colorAttr)) {
        hasStrongHighlight = true;
      }
    }

    if (style) {
      if (!isPrefixOnly) {
        const fwMatch = style.match(/font-weight\s*:\s*([^;]+)/i);
        if (fwMatch) {
          const fw = fwMatch[1].trim().toLowerCase();
          if (fw === 'bold' || fw === 'bolder' || Number(fw) >= 600) {
            hasBold = true;
          }
        }
      }
      if (/text-decoration(?:-line)?\s*:[^;]*underline/i.test(style)) {
        hasStrongHighlight = true;
      }
      const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
      if (colorMatch && !isNeutralColor(colorMatch[1])) {
        hasStrongHighlight = true;
      }
      const bgMatch = style.match(/background(?:-color)?\s*:\s*([^;]+)/i);
      if (bgMatch && !isNeutralColor(bgMatch[1])) {
        hasStrongHighlight = true;
      }
    }
  };

  checkNodeStyle(el, false);
  const descendants = el.querySelectorAll('*');
  descendants.forEach((child) => {
    const text = (child.textContent || '').trim();
    const isPrefixOnly = /^[A-Ha-h][\.\:\)]?$/.test(text);
    checkNodeStyle(child, isPrefixOnly);
  });

  return { hasBold, hasStrongHighlight };
}

/**
 * Converts HTML pasted from Word / Google Docs / Web into plain text,
 * automatically prefixing `*` onto options emphasized with bold/underline/color/highlight
 * when not all options in the same question share the same bold style.
 */
export function convertClipboardHtmlToMarkedText(
  html: string
): { text: string; autoMarkedCount: number } | null {
  if (
    typeof window === 'undefined' ||
    typeof DOMParser === 'undefined' ||
    !html ||
    !html.trim()
  ) {
    return null;
  }

  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const body = doc.body;
    if (!body) return null;

    const blockTags = new Set(['p', 'div', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
    const lines: Array<{
      text: string;
      isOpt: boolean;
      hasBold: boolean;
      hasStrongHighlight: boolean;
    }> = [];

    const collectBlocks = (root: Element) => {
      const children = Array.from(root.children);
      const hasChildBlock = children.some((c) => blockTags.has(c.tagName.toLowerCase()));

      if (!hasChildBlock) {
        const innerHtml = root.innerHTML;
        if (/<br\s*\/?>/i.test(innerHtml)) {
          const segments = innerHtml.split(/<br\s*\/?>/i);
          for (const seg of segments) {
            const temp = doc.createElement('div');
            temp.innerHTML = seg;
            const rawText = (temp.textContent || '').replace(/\u00a0/g, ' ').trim();
            if (!rawText) {
              lines.push({ text: '', isOpt: false, hasBold: false, hasStrongHighlight: false });
              continue;
            }
            const emph = inspectElementEmphasis(temp);
            lines.push({
              text: rawText,
              isOpt: OPTION_LINE_REGEX.test(rawText),
              hasBold: emph.hasBold,
              hasStrongHighlight: emph.hasStrongHighlight,
            });
          }
          return;
        }

        const rawText = (root.textContent || '').replace(/\u00a0/g, ' ').trim();
        const emph = inspectElementEmphasis(root);
        lines.push({
          text: rawText,
          isOpt: OPTION_LINE_REGEX.test(rawText),
          hasBold: emph.hasBold,
          hasStrongHighlight: emph.hasStrongHighlight,
        });
        return;
      }

      for (const child of children) {
        collectBlocks(child);
      }
    };

    collectBlocks(body);

    if (lines.length === 0) return null;

    // Group consecutive option lines per question so we don't mark all 4 options if entire block was bolded
    let autoMarkedCount = 0;
    let i = 0;
    while (i < lines.length) {
      if (!lines[i].isOpt) {
        i += 1;
        continue;
      }

      const groupStart = i;
      while (i < lines.length && lines[i].isOpt) {
        i += 1;
      }
      const groupEnd = i;
      const group = lines.slice(groupStart, groupEnd);

      const boldIndices: number[] = [];
      const strongHighlightIndices: number[] = [];

      group.forEach((item, idx) => {
        if (item.hasStrongHighlight) strongHighlightIndices.push(idx);
        if (item.hasBold) boldIndices.push(idx);
      });

      const targetIndices =
        strongHighlightIndices.length > 0 && strongHighlightIndices.length < group.length
          ? strongHighlightIndices
          : boldIndices.length > 0 && boldIndices.length < group.length
          ? boldIndices
          : [];

      for (const idx of targetIndices) {
        const line = group[idx];
        if (!line.text.startsWith('*')) {
          line.text = `*${line.text}`;
          autoMarkedCount += 1;
        }
      }
    }

    if (autoMarkedCount === 0) return null;

    return {
      text: lines.map((l) => l.text).join('\n'),
      autoMarkedCount,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts a trailing answer-key table (e.g. "BẢNG ĐÁP ÁN\n1.A 2.B 3.C" or "1.A 2.B ...")
 * at the bottom of the text and returns the remaining text + answer map.
 */
function extractTrailingAnswerKey(text: string): {
  cleanedText: string;
  answerMap: Map<number, string>;
} {
  const answerMap = new Map<number, string>();
  const lines = text.split('\n');
  if (lines.length < 2) {
    return { cleanedText: text, answerMap };
  }

  // Check for explicit answer-key section header in the latter half of text
  const headerIdx = lines.findIndex((line, idx) => {
    if (idx === 0) return false;
    return /^\s*(?:BẢNG\s*ĐÁP\s*ÁN|ĐÁP\s*ÁN(?:\s*THAM\s*KHẢO|\s*ĐÚNG)?|ANSWER\s*KEY|KEYS?)\s*:?\s*$/i.test(
      line
    );
  });

  const pairRegex = /(?:Câu\s*)?(\d{1,4})\s*[\.\:\-\)]\s*([A-Ha-h](?:\s*(?:,|\/)\s*[A-Ha-h])*)\b/gi;

  const parsePairsFromLines = (slice: string[]): Map<number, string> => {
    const map = new Map<number, string>();
    const joined = slice.join(' ');
    let match: RegExpExecArray | null;
    pairRegex.lastIndex = 0;
    while ((match = pairRegex.exec(joined)) !== null) {
      const num = Number(match[1]);
      if (Number.isFinite(num) && num > 0) {
        const parsed = parseAnswerKeys(match[2]);
        if (parsed.keys.length > 0) {
          map.set(num, parsed.keys.join(', '));
        }
      }
    }
    return map;
  };

  if (headerIdx >= 0) {
    const tail = lines.slice(headerIdx + 1);
    const hasOptionAfterHeader = tail.some((l) => isOptionLine(l));
    if (!hasOptionAfterHeader) {
      const found = parsePairsFromLines(tail);
      if (found.size >= 2) {
        return {
          cleanedText: lines.slice(0, headerIdx).join('\n').trim(),
          answerMap: found,
        };
      }
    }
  }

  // Fallback: detect trailing compact answer-key lines without an explicit header
  let cutIndex = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      cutIndex = i;
      continue;
    }
    if (isOptionLine(trimmed)) break;
    // A compact answer-key line has pairs and no long prose (> 6 non-pair words)
    const strippedOfPairs = trimmed.replace(pairRegex, '').replace(/[,;|\/\s]+/g, '');
    pairRegex.lastIndex = 0;
    if (strippedOfPairs.length === 0 && pairRegex.test(trimmed)) {
      pairRegex.lastIndex = 0;
      cutIndex = i;
    } else {
      break;
    }
  }

  if (cutIndex < lines.length) {
    const tail = lines.slice(cutIndex);
    const found = parsePairsFromLines(tail);
    if (found.size >= 2) {
      return {
        cleanedText: lines.slice(0, cutIndex).join('\n').trim(),
        answerMap: found,
      };
    }
  }

  return { cleanedText: text, answerMap };
}

function unwrapBrokenPdfLines(lines: string[]): string[] {
  const result: string[] = [];
  const codeOrListLine =
    /^(?:\s{2,}|\t|[-*•]|\d+[\.\:\)]|#include\b|int\b|void\b|float\b|double\b|char\b|def\b|class\b|for\b|while\b|if\b|else\b|return\b|printf\b|print\b|\{|\}|\/\/|#|>>>)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (result.length === 0) {
      result.push(line);
      continue;
    }

    const prev = result[result.length - 1];
    const trimmedPrev = prev.trim();
    const trimmedCurr = line.trim();

    if (
      trimmedPrev &&
      trimmedCurr &&
      !codeOrListLine.test(prev) &&
      !codeOrListLine.test(line) &&
      !/[.?!:;{}]$/.test(trimmedPrev)
    ) {
      result[result.length - 1] = `${trimmedPrev} ${trimmedCurr}`;
    } else {
      result.push(line);
    }
  }

  return result;
}

/**
 * Intelligent client-side parser that converts raw unformatted text (from Word, PDF, Web)
 * into structured exam questions with configurable filters and zero server dependencies.
 */
export function parseRawExamText(
  rawText: string,
  defaultSubject: string = 'Tự tạo',
  defaultTopic: string = 'Tổng hợp',
  filterOptions?: ParserFilterOptions
): ParseExamResult {
  const opts = {
    stripLmsNoise: filterOptions?.stripLmsNoise ?? true,
    unwrapPdfLines: filterOptions?.unwrapPdfLines ?? false,
    deduplicate: filterOptions?.deduplicate ?? true,
    mergeTrailingAnswerKey: filterOptions?.mergeTrailingAnswerKey ?? true,
  };

  const stats: ParserStats = {
    noiseLinesRemoved: 0,
    duplicatesRemoved: 0,
    trailingKeysMerged: 0,
    unansweredCount: 0,
  };

  if (!rawText || !rawText.trim()) {
    return {
      questions: [],
      unansweredQuestions: [],
      totalDetected: 0,
      validCount: 0,
      errors: [],
      stats,
    };
  }

  // Normalize line breaks & invisible whitespace characters
  let normalized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');

  // Normalize bulleted options like "• A. ..." -> "A. ..."
  normalized = normalized.replace(
    /^[ \t]*[•●▪◦\-][ \t]+(\*?\s*(?:\([A-Ha-h]\)|\[[A-Ha-h]\]|[A-Ha-h][\.\:\)]))/gm,
    '$1'
  );

  // Filter 1: Strip LMS / Moodle / PDF noise lines
  if (opts.stripLmsNoise) {
    const rawLines = normalized.split('\n');
    const keptLines: string[] = [];
    for (const line of rawLines) {
      if (NOISE_LINE_PATTERNS.some((pat) => pat.test(line))) {
        stats.noiseLinesRemoved += 1;
      } else {
        keptLines.push(line);
      }
    }
    normalized = keptLines.join('\n');
  }

  // Filter 2: Extract trailing answer key table if present
  let trailingAnswerMap = new Map<number, string>();
  if (opts.mergeTrailingAnswerKey) {
    const extracted = extractTrailingAnswerKey(normalized);
    normalized = extracted.cleanedText;
    trailingAnswerMap = extracted.answerMap;
  }

  // Strategy 1: Split into candidate question blocks without cutting numbered lists inside stems
  let blocks: string[] = [];
  EXPLICIT_QUESTION_HEADER_REGEX.lastIndex = 0;
  NUMBERED_HEADER_REGEX.lastIndex = 0;

  if (EXPLICIT_QUESTION_HEADER_REGEX.test(normalized)) {
    EXPLICIT_QUESTION_HEADER_REGEX.lastIndex = 0;
    blocks = normalized
      .split(EXPLICIT_QUESTION_HEADER_REGEX)
      .map((b) => b.trim())
      .filter((b) => b.length > 5);
  } else if (NUMBERED_HEADER_REGEX.test(normalized)) {
    NUMBERED_HEADER_REGEX.lastIndex = 0;
    const rawSegments = normalized
      .split(NUMBERED_HEADER_REGEX)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    let pending = '';
    for (const seg of rawSegments) {
      pending = pending ? `${pending}\n${seg}` : seg;
      if (hasAtLeastTwoOptions(pending)) {
        blocks.push(pending);
        pending = '';
      }
    }
    if (pending.trim().length > 5) {
      if (blocks.length > 0 && !hasAtLeastTwoOptions(pending)) {
        blocks[blocks.length - 1] = `${blocks[blocks.length - 1]}\n${pending}`;
      } else {
        blocks.push(pending);
      }
    }
  } else {
    blocks = normalized
      .split(/\n\s*\n+/)
      .map((b) => b.trim())
      .filter((b) => b.length > 5);
  }

  const parsedList: Word[] = [];
  const unansweredList: Word[] = [];
  const errorLogs: string[] = [];
  const seenSignatures = new Set<string>();

  blocks.forEach((block, index) => {
    const headerNumMatch = block.match(
      /^(?:Câu(?:\s*hỏi)?\s*|Question\s*|Q\s*|Bài\s*)?(\d+)/i
    );
    const detectedNum = headerNumMatch ? Number(headerNumMatch[1]) : index + 1;
    const qNum = Number.isFinite(detectedNum) && detectedNum > 0 ? detectedNum : index + 1;

    try {
      let detectedAnswerLetter: string | null = null;
      let explanation = '';

      const answerMatch = block.match(
        /(?:^|\n)[ \t]*(?:(?:->|=>|➔|➤|[-*•])[ \t]*)?(?:Đáp\s*án(?:\s*đúng)?|Answer|Key|Đ\/A|ĐA|Correct)[ \t]*[\:\=]?[ \t]*([A-Ha-h](?:[ \t]*(?:,|;|\/|\bhoặc\b|\bor\b|\band\b|\bvà\b)[ \t]*[A-Ha-h])*)\b(?:[ \t]*\(([^\n]*)\))?[ \t]*(?=\n|$)/i
      );
      if (answerMatch) {
        const rawAns = answerMatch[1].trim();
        const parsedAns = parseAnswerKeys(rawAns);
        if (parsedAns.keys.length > 0) {
          detectedAnswerLetter = parsedAns.isOrMode
            ? parsedAns.keys.join(' hoặc ')
            : parsedAns.keys.join(', ');
        }
        if (answerMatch[2]?.trim()) {
          explanation = `Đáp án đúng: ${detectedAnswerLetter || rawAns}. ${answerMatch[2].trim()}`;
        }
      }

      let cleanBlock = block;
      if (answerMatch) {
        cleanBlock = cleanBlock.replace(answerMatch[0], '');
      }

      const lines = cleanBlock.split('\n');
      const questionLines: string[] = [];
      const options: string[] = [];
      const asteriskAnswerLetters: string[] = [];
      const explanationLines: string[] = [];
      let currentOption: { letter: string; text: string } | null = null;
      let inExplanation = false;

      const explanationLineRegex =
        /^\s*(?:Giải\s*thích|Explanation|Note|Lưu\s*ý)\s*[\:\=]\s*(.*)$/i;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (inExplanation) {
          explanationLines.push(line);
          continue;
        }

        const hasSeenOptions = options.length > 0 || currentOption !== null;
        const expLineMatch = hasSeenOptions ? line.match(explanationLineRegex) : null;
        if (expLineMatch) {
          const hasFollowingOption = lines.slice(i + 1).some((l) => OPTION_LINE_REGEX.test(l));
          if (!hasFollowingOption) {
            if (currentOption) {
              options.push(`${currentOption.letter}. ${currentOption.text.trim()}`);
              currentOption = null;
            }
            inExplanation = true;
            if (expLineMatch[1]?.trim()) {
              explanationLines.push(expLineMatch[1].trim());
            }
            continue;
          }
        }

        const optMatch = line.match(OPTION_LINE_REGEX);
        if (optMatch) {
          if (currentOption) {
            options.push(`${currentOption.letter}. ${currentOption.text.trim()}`);
          }
          const hasAsterisk = Boolean(optMatch[1]);
          const letter = (optMatch[2] || optMatch[3] || optMatch[4]).toUpperCase();
          if (hasAsterisk && !asteriskAnswerLetters.includes(letter)) {
            asteriskAnswerLetters.push(letter);
          }
          currentOption = { letter, text: optMatch[5] ? optMatch[5].trim() : '' };
        } else if (currentOption) {
          currentOption.text += ' ' + line.trim();
        } else {
          questionLines.push(line);
        }
      }

      if (currentOption) {
        options.push(`${currentOption.letter}. ${currentOption.text.trim()}`);
      }

      if (explanationLines.length > 0) {
        explanation = explanationLines.join('\n').trim();
      }

      const finalQuestionLines = opts.unwrapPdfLines
        ? unwrapBrokenPdfLines(questionLines)
        : questionLines;
      let questionStem = finalQuestionLines.join('\n').trim();

      // Horizontal single-line options fallback: A. ... B. ... or (A) ... (B) ...
      if (options.length < 2) {
        let blockForInline = cleanBlock;
        if (!explanation) {
          const trailingExpMatch = cleanBlock.match(
            /\n[ \t]*(?:Giải\s*thích|Explanation|Note|Lưu\s*ý)[ \t]*[\:\=][ \t]*([\s\S]+)$/i
          );
          if (
            trailingExpMatch &&
            !/(?:^|\s)\*?\s*(?:\([A-Ha-h]\)|\[[A-Ha-h]\]|[A-Ha-h][\.\:\)])\s/.test(
              trailingExpMatch[1]
            )
          ) {
            explanation = trailingExpMatch[1].trim();
            blockForInline = cleanBlock.slice(0, trailingExpMatch.index);
          }
        }

        const inlineRegex =
          /(?:^|\s+)(\*)?\s*(?:\(\s*([A-Ha-h])\s*\)|\[\s*([A-Ha-h])\s*\]|([A-Ha-h])[\.\:\)])\s*([\s\S]*?)(?=(?:\s+(?:\*\s*)?(?:\([A-Ha-h]\)|\[[A-Ha-h]\]|[A-Ha-h][\.\:\)])\s+|$))/g;
        const inlineOptions: { letter: string; text: string; hasAsterisk: boolean }[] = [];
        let inlineMatch;
        while ((inlineMatch = inlineRegex.exec(blockForInline)) !== null) {
          const letter = (inlineMatch[2] || inlineMatch[3] || inlineMatch[4]).toUpperCase();
          inlineOptions.push({
            letter,
            text: (inlineMatch[5] || '').trim(),
            hasAsterisk: Boolean(inlineMatch[1]),
          });
        }
        if (inlineOptions.length >= 2) {
          options.length = 0;
          asteriskAnswerLetters.length = 0;
          for (const opt of inlineOptions) {
            if (opt.hasAsterisk && !asteriskAnswerLetters.includes(opt.letter)) {
              asteriskAnswerLetters.push(opt.letter);
            }
            options.push(`${opt.letter}. ${opt.text}`);
          }
          const firstOptLetter = inlineOptions[0].letter;
          const firstIdx = blockForInline.search(
            new RegExp(
              `(?:^|\\s+)\\*?\\s*(?:\\(\\s*${firstOptLetter}\\s*\\)|\\[\\s*${firstOptLetter}\\s*\\]|${firstOptLetter}[\\.\\:\\)])\\s+`
            )
          );
          if (firstIdx >= 0) {
            questionStem = blockForInline.substring(0, firstIdx).trim();
          }
        }
      }

      // Strip leading "Câu 1:", "Question 1:", "Q1.", "Bài 1:", "1."
      questionStem = questionStem
        .replace(
          /^(?:Câu(?:\s*hỏi)?\s*\d+|Question\s*\d+|Q\s*\d+|Bài\s*\d+|\d+)\s*[\.\:\)\-]?\s*/i,
          ''
        )
        .trim();

      if (!questionStem) {
        errorLogs.push(`Câu ${qNum}: Thiếu nội dung câu hỏi.`);
        return;
      }
      if (options.length < 2) {
        errorLogs.push(`Câu ${qNum}: Không tìm đủ ít nhất 2 đáp án lựa chọn (A, B, ...).`);
        return;
      }

      // Deduplicate check
      if (opts.deduplicate) {
        const sig = `${questionStem.toLowerCase()}::${options
          .map((o) => cleanOptionText(o).toLowerCase())
          .join('|')}`;
        if (seenSignatures.has(sig)) {
          stats.duplicatesRemoved += 1;
          return;
        }
        seenSignatures.add(sig);
      }

      let rawFinalAnswer =
        asteriskAnswerLetters.length > 0
          ? asteriskAnswerLetters.join(', ')
          : detectedAnswerLetter;

      if (!rawFinalAnswer && opts.mergeTrailingAnswerKey && trailingAnswerMap.has(qNum)) {
        rawFinalAnswer = trailingAnswerMap.get(qNum) || null;
        if (rawFinalAnswer) {
          stats.trailingKeysMerged += 1;
        }
      }

      const baseId = `custom_q_${index + 1}_${hashString(
        `${questionStem}::${options.join('|')}`
      )}`;

      if (!rawFinalAnswer) {
        stats.unansweredCount += 1;
        unansweredList.push({
          id: baseId,
          word: `Câu ${qNum}: ${questionStem}`,
          question: questionStem,
          options,
          answer: '',
          correctWord: '',
          explanation: explanation || '',
          subject: defaultSubject,
          topic: defaultTopic,
        });
        return;
      }

      const finalAnswerLetter = rawFinalAnswer;
      const { keys: answerLetters } = parseAnswerKeys(finalAnswerLetter);

      const matchedOpts = options.filter((opt) =>
        answerLetters.some((letter) => opt.startsWith(`${letter}.`))
      );
      if (matchedOpts.length === 0) {
        errorLogs.push(
          `Câu ${qNum}: Đáp án "${finalAnswerLetter}" không khớp với lựa chọn nào (${options
            .map((o) => o[0])
            .join(', ')}).`
        );
        return;
      }
      const correctOptionText = matchedOpts.join(' | ');

      parsedList.push({
        id: `custom_q_${index + 1}_${hashString(
          `${questionStem}::${options.join('|')}::${finalAnswerLetter}`
        )}`,
        word: `Câu ${qNum}: ${questionStem}`,
        question: questionStem,
        options,
        answer: finalAnswerLetter,
        correctWord: correctOptionText,
        explanation: explanation || `Đáp án đúng: ${finalAnswerLetter}.`,
        subject: defaultSubject,
        topic: defaultTopic,
      });
    } catch (err: any) {
      errorLogs.push(`Câu ${qNum}: Lỗi xử lý cú pháp (${err?.message || 'Không rõ'}).`);
    }
  });

  return {
    questions: parsedList,
    unansweredQuestions: unansweredList,
    totalDetected: blocks.length,
    validCount: parsedList.length,
    errors: errorLogs,
    stats,
  };
}
