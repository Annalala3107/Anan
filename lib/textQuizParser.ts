import { Word } from './types';
import { cleanOptionText } from './utils';

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
      // 1. Detect Answer line (e.g. "Đáp án: A", "Answer: B, C", "Key: C", "Đ/A: D")
      let detectedAnswerLetter: string | null = null;
      let explanation = '';

      const answerMatch = block.match(
        /(?:^|\n|\s)\s*(?:Đáp\s*án|Answer|Key|Đ\/A|ĐA|Correct)\s*[\:\=]?\s*([A-Fa-f](?:\s*,\s*[A-Fa-f])*)\b/i
      );
      if (answerMatch) {
        detectedAnswerLetter = answerMatch[1]
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .join(', ');
      }

      // Detect Explanation line
      const explanationMatch = block.match(
        /(?:^|\n)\s*(?:Giải\s*thích|Explanation|Note|Lưu\s*ý)\s*[\:\=]?\s*([^\n]+(?:\n.*)*)$/i
      );
      if (explanationMatch) {
        explanation = explanationMatch[1].trim();
      }

      // Remove the answer line & explanation line from the block before parsing options
      let cleanBlock = block;
      if (answerMatch) {
        cleanBlock = cleanBlock.replace(answerMatch[0], '');
      }
      if (explanationMatch) {
        cleanBlock = cleanBlock.replace(explanationMatch[0], '');
      }

      // 2. Extract Options and Question Stem using robust line-by-line parsing
      const lines = cleanBlock.split('\n');
      const questionLines: string[] = [];
      const options: string[] = [];
      let asteriskAnswerLetter: string | null = null;
      let currentOption: { letter: string; text: string } | null = null;

      const optionPrefixRegex = /^\s*(\*)?\s*([A-Fa-f])[\.\:\)](.*)$/;

      for (const line of lines) {
        const optMatch = line.match(optionPrefixRegex);
        if (optMatch) {
          if (currentOption) {
            options.push(`${currentOption.letter}. ${currentOption.text.trim()}`);
          }
          const hasAsterisk = Boolean(optMatch[1]);
          const letter = optMatch[2].toUpperCase();
          if (hasAsterisk) {
            asteriskAnswerLetter = letter;
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

      let questionStem = questionLines.join('\n').trim();

      // If options couldn't be extracted line-by-line, try horizontal single-line options: A. ... B. ...
      if (options.length < 2) {
        const inlineRegex = /(?:^|\s+)(\*)?\s*([A-Fa-f])[\.\:\)]\s*([\s\S]*?)(?=(?:\s+[A-Fa-f][\.\:\)]\s+|$))/g;
        const inlineOptions: { letter: string; text: string; hasAsterisk: boolean }[] = [];
        let inlineMatch;
        while ((inlineMatch = inlineRegex.exec(cleanBlock)) !== null) {
          inlineOptions.push({
            letter: inlineMatch[2].toUpperCase(),
            text: (inlineMatch[3] || '').trim(),
            hasAsterisk: Boolean(inlineMatch[1])
          });
        }
        if (inlineOptions.length >= 2) {
          options.length = 0;
          for (const opt of inlineOptions) {
            if (opt.hasAsterisk) asteriskAnswerLetter = opt.letter;
            options.push(`${opt.letter}. ${opt.text}`);
          }
          const firstOptLetter = inlineOptions[0].letter;
          const firstIdx = cleanBlock.search(new RegExp(`(?:^|\\s+)\\*?\\s*${firstOptLetter}[\\.\\:\\)]\\s+`));
          if (firstIdx >= 0) {
            questionStem = cleanBlock.substring(0, firstIdx).trim();
          }
        }
      }

      // Strip leading "Câu 1:", "Question 1:", "1."
      questionStem = questionStem
        .replace(/^(?:Câu\s*\d+|Question\s*\d+|\d+)[\.\:\)]\s*/i, '')
        .trim();

      // Finalize answer letter(s)
      const finalAnswerLetter = asteriskAnswerLetter || detectedAnswerLetter || 'A';
      const answerLetters = finalAnswerLetter.split(',').map((s) => s.trim());

      // Find full text of the correct option(s)
      const matchedOpts = options.filter((opt) =>
        answerLetters.some((letter) => opt.startsWith(`${letter}.`))
      );
      const correctOptionText =
        matchedOpts.length > 0 ? matchedOpts.join(' | ') : options[0] || '';

      // Validation
      if (!questionStem) {
        errorLogs.push(`Câu ${qNum}: Thiếu nội dung câu hỏi.`);
        return;
      }
      if (options.length < 2) {
        errorLogs.push(`Câu ${qNum}: Không tìm đủ ít nhất 2 đáp án lựa chọn (A, B, ...).`);
        return;
      }

      parsedList.push({
        id: `custom_q_${Date.now()}_${qNum}`,
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
