import { Word } from './types';
import { hashString, parseAnswerKeys } from './utils';

export interface ParsedQuestionResult {
  question: string;
  options: string[];
  answer: string; // 'A', 'B', 'C', 'D'
  correctWord: string;
  explanation: string;
  isValid: boolean;
  error?: string;
}

/**
 * Intelligent client-side parser that converts raw unformatted text (from Word, PDF, Web)
 * into structured exam questions with zero server dependencies.
 */
export function parseRawExamText(
  rawText: string,
  defaultSubject: string = 'Tự tạo',
  defaultTopic: string = 'Tổng hợp'
): { questions: Word[]; totalDetected: number; validCount: number; errors: string[] } {
  if (!rawText || !rawText.trim()) {
    return { questions: [], totalDetected: 0, validCount: 0, errors: [] };
  }

  // Normalize line breaks
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strategy 1: Split into candidate question blocks.
  // Match lines starting with "Câu \d+:", "Question \d+:", "\d+\.", or double line breaks.
  let blocks: string[] = [];
  const questionHeaderRegex = /(?:^|\n)(?=(?:Câu\s*\d+|Question\s*\d+|\d+[\.\:\)])\s+)/gi;

  if (questionHeaderRegex.test(normalized)) {
    blocks = normalized
      .split(questionHeaderRegex)
      .map((b) => b.trim())
      .filter((b) => b.length > 5);
  } else {
    // Fallback: Split by double blank lines
    blocks = normalized
      .split(/\n\s*\n+/)
      .map((b) => b.trim())
      .filter((b) => b.length > 5);
  }

  const parsedList: Word[] = [];
  const errorLogs: string[] = [];

  blocks.forEach((block, index) => {
    const qNum = index + 1;
    try {
      // 1. Detect Answer line (e.g. "Đáp án: A", "Đáp án đúng: A, B", "Answer: B, C", "Key: C", "Đ/A: D")
      let detectedAnswerLetter: string | null = null;
      let explanation = '';

      const answerMatch = block.match(
        /(?:^|\n)[ \t]*(?:Đáp\s*án(?:\s*đúng)?|Answer|Key|Đ\/A|ĐA|Correct)[ \t]*[\:\=]?[ \t]*([A-Fa-f](?:[ \t]*(?:,|;|\/|\bhoặc\b|\bor\b|\band\b|\bvà\b)[ \t]*[A-Fa-f])*)\b[ \t]*(?=\n|$)/i
      );
      if (answerMatch) {
        const rawAns = answerMatch[1].trim();
        const parsedAns = parseAnswerKeys(rawAns);
        if (parsedAns.keys.length > 0) {
          detectedAnswerLetter = parsedAns.isOrMode
            ? parsedAns.keys.join(' hoặc ')
            : parsedAns.keys.join(', ');
        }
      }

      // Remove only the detected Answer line first so explanation lines after options aren't disrupted
      let cleanBlock = block;
      if (answerMatch) {
        cleanBlock = cleanBlock.replace(answerMatch[0], '');
      }

      // 2. Extract Options, Question Stem, and trailing Explanation using line-order-aware parsing
      const lines = cleanBlock.split('\n');
      const questionLines: string[] = [];
      const options: string[] = [];
      const asteriskAnswerLetters: string[] = [];
      const explanationLines: string[] = [];
      let currentOption: { letter: string; text: string } | null = null;
      let inExplanation = false;

      const optionPrefixRegex = /^\s*(\*)?\s*([A-Fa-f])[\.\:\)](.*)$/;
      const explanationLineRegex = /^\s*(?:Giải\s*thích|Explanation|Note|Lưu\s*ý)\s*[\:\=]\s*(.*)$/i;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (inExplanation) {
          explanationLines.push(line);
          continue;
        }

        const hasSeenOptions = options.length > 0 || currentOption !== null;
        const expLineMatch = hasSeenOptions ? line.match(explanationLineRegex) : null;
        if (expLineMatch) {
          const remainingText = lines.slice(i + 1).join('\n');
          const hasFollowingOption = /^\s*\*?\s*[A-Fa-f][\.\:\)]/m.test(remainingText);
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

        const optMatch = line.match(optionPrefixRegex);
        if (optMatch) {
          if (currentOption) {
            options.push(`${currentOption.letter}. ${currentOption.text.trim()}`);
          }
          const hasAsterisk = Boolean(optMatch[1]);
          const letter = optMatch[2].toUpperCase();
          if (hasAsterisk && !asteriskAnswerLetters.includes(letter)) {
            asteriskAnswerLetters.push(letter);
          }
          currentOption = { letter, text: optMatch[3] ? optMatch[3].trim() : '' };
        } else if (currentOption) {
          // Continuation line of multi-line option
          currentOption.text += ' ' + line.trim();
        } else {
          // Part of question stem (supports multi-line questions and code blocks)
          questionLines.push(line);
        }
      }

      if (currentOption) {
        options.push(`${currentOption.letter}. ${currentOption.text.trim()}`);
      }

      if (explanationLines.length > 0) {
        explanation = explanationLines.join('\n').trim();
      }

      let questionStem = questionLines.join('\n').trim();

      // If options couldn't be extracted line-by-line, try horizontal single-line options: A. ... B. ...
      if (options.length < 2) {
        let blockForInline = cleanBlock;
        if (!explanation) {
          const trailingExpMatch = cleanBlock.match(
            /\n[ \t]*(?:Giải\s*thích|Explanation|Note|Lưu\s*ý)[ \t]*[\:\=][ \t]*([\s\S]+)$/i
          );
          if (trailingExpMatch && !/(?:^|\s)\*?\s*[A-Fa-f][\.\:\)]\s/.test(trailingExpMatch[1])) {
            explanation = trailingExpMatch[1].trim();
            blockForInline = cleanBlock.slice(0, trailingExpMatch.index);
          }
        }

        const inlineRegex = /(?:^|\s+)(\*)?\s*([A-Fa-f])[\.\:\)]\s*([\s\S]*?)(?=(?:\s+(?:\*\s*)?[A-Fa-f][\.\:\)]\s+|$))/g;
        const inlineOptions: { letter: string; text: string; hasAsterisk: boolean }[] = [];
        let inlineMatch;
        while ((inlineMatch = inlineRegex.exec(blockForInline)) !== null) {
          inlineOptions.push({
            letter: inlineMatch[2].toUpperCase(),
            text: (inlineMatch[3] || '').trim(),
            hasAsterisk: Boolean(inlineMatch[1])
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
            new RegExp(`(?:^|\\s+)\\*?\\s*${firstOptLetter}[\\.\\:\\)]\\s+`)
          );
          if (firstIdx >= 0) {
            questionStem = blockForInline.substring(0, firstIdx).trim();
          }
        }
      }

      // Strip leading "Câu 1:", "Question 1:", "1."
      questionStem = questionStem
        .replace(/^(?:Câu\s*\d+|Question\s*\d+|\d+)[\.\:\)]\s*/i, '')
        .trim();

      // Validation: stem and options first
      if (!questionStem) {
        errorLogs.push(`Câu ${qNum}: Thiếu nội dung câu hỏi.`);
        return;
      }
      if (options.length < 2) {
        errorLogs.push(`Câu ${qNum}: Không tìm đủ ít nhất 2 đáp án lựa chọn (A, B, ...).`);
        return;
      }

      // Require explicit answer (*A. or Đáp án: A) — never silently guess 'A'
      const rawFinalAnswer =
        asteriskAnswerLetters.length > 0
          ? asteriskAnswerLetters.join(', ')
          : detectedAnswerLetter;

      if (!rawFinalAnswer) {
        errorLogs.push(
          `Câu ${qNum}: Thiếu đáp án đúng (hãy đánh dấu * trước lựa chọn đúng, ví dụ *A., hoặc thêm dòng "Đáp án: X").`
        );
        return;
      }

      const finalAnswerLetter = rawFinalAnswer;
      const { keys: answerLetters } = parseAnswerKeys(finalAnswerLetter);

      // Find full text of the correct option(s) and verify they match parsed options
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
        id: `custom_q_${qNum}_${hashString(`${questionStem}::${options.join('|')}::${finalAnswerLetter}`)}`,
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
    totalDetected: blocks.length,
    validCount: parsedList.length,
    errors: errorLogs,
  };
}
