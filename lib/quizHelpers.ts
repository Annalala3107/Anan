import { Word, ExamQuestion, DrillQuestion } from './types';
import { WordSchema } from './schema';

export interface StandardQuestion {
  id: string;
  sentence: string;
  correctWord: string;
  options: string[];
  explanation: string;
  answerKey?: string;
  subject?: string;
  topic?: string;
}

/**
 * Standardized question builder for all quiz & study modes.
 * Eliminates duplicate generator logic and cleans out all legacy fallback artifacts.
 */
export function buildStandardQuestions(
  rawWords: Word[],
  limit: number = 25
): StandardQuestion[] {
  if (!rawWords || rawWords.length === 0) return [];

  // Filter valid items using schema
  const validWords = rawWords.filter((w) => {
    return Boolean((w.question && w.options?.length) || w.word);
  });

  const pool = [...validWords].sort(() => 0.5 - Math.random());
  const count = Math.min(pool.length, limit);
  const list: StandardQuestion[] = [];

  for (let i = 0; i < count; i++) {
    const target = pool[i];

    // Case 1: Standard Multiple Choice Question (CSI106, SSA101, PRF192)
    if (target.question && target.options && target.options.length > 0) {
      list.push({
        id: String(target.id || `q_${i}_${Date.now()}`),
        sentence: target.question,
        correctWord: target.correctWord || target.options[0],
        options: target.options,
        explanation: target.explanation || `Đáp án đúng: ${target.answer || target.options[0]}`,
        answerKey: target.answer,
        subject: target.subject,
        topic: target.topic,
      });
    } else if (target.word) {
      // Case 2: Academic Concept / Terminology question
      const sentence =
        target.simple_examples?.[0] ||
        target.advanced_example ||
        `Khái niệm hoặc thuật ngữ nào sau đây tương ứng với: "${target.vi || target.word}"?`;

      const otherWords = validWords
        .filter((w) => w.word && w.word.toLowerCase() !== target.word.toLowerCase())
        .map((w) => w.word)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const options = [target.word, ...otherWords].sort(() => 0.5 - Math.random());

      list.push({
        id: String(target.id || `term_${i}`),
        sentence: sentence.includes(target.word)
          ? sentence.replace(new RegExp(`\\b${target.word}\\w*`, 'gi'), '________')
          : sentence,
        correctWord: target.word,
        options: options.length >= 2 ? options : [target.word, 'Đáp án khác'],
        explanation: `${target.word}: ${target.vi || 'Đáp án chính xác'}`,
        subject: target.subject,
        topic: target.topic,
      });
    }
  }

  return list;
}
