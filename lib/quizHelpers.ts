import { Word, WordProgress } from './types';
import {
  getQuestionKey,
  cleanOptionText,
  shuffleArray,
  getQuestionAnswerMeta,
} from './utils';
import { StorageEngine } from './storage';

export interface StandardQuestion {
  id: string;
  originalNumber?: number;
  sentence: string;
  correctWord: string;
  correctOptions?: string[];
  isMultiSelect?: boolean;
  requiredCount?: number;
  options: string[];
  explanation: string;
  answerKey?: string;
  subject?: string;
  topic?: string;
}

export type QuestionSelectionMode = 'smart' | 'sequential' | 'random';

export interface BuildQuestionsOptions {
  mode?: QuestionSelectionMode;
  progressMap?: Record<string, WordProgress>;
  onlyUnmastered?: boolean;
  shuffleChoices?: boolean;
}

/**
 * Standardized question builder for all quiz & study modes.
 * Supports Smart SRS Queue (prioritizing unseen & mistake items without random duplication),
 * Sequential deck order (Q1 -> QN), or Random shuffle.
 */
export function buildStandardQuestions(
  rawWords: Word[],
  limit: number = 25,
  buildOpts?: BuildQuestionsOptions
): StandardQuestion[] {
  if (!rawWords || rawWords.length === 0) return [];

  const mode: QuestionSelectionMode = buildOpts?.mode || 'random';
  const progressMap = buildOpts?.progressMap || StorageEngine.getWordProgress();
  const onlyUnmastered = Boolean(buildOpts?.onlyUnmastered);
  const shuffleChoices = Boolean(buildOpts?.shuffleChoices);

  // Attach original 1-based deck number before filtering/sorting
  const indexedWords = rawWords
    .map((w, idx) => ({ word: w, originalNumber: idx + 1 }))
    .filter(({ word }) => Boolean((word.question && word.options?.length) || word.word));

  let candidatePool = indexedWords;

  if (onlyUnmastered) {
    const unmastered = indexedWords.filter(({ word }) => {
      const p = StorageEngine.getItemProgress(word, progressMap);
      return p?.status !== 'mastered';
    });
    if (unmastered.length > 0) {
      candidatePool = unmastered;
    }
  }

  let orderedPool = [...candidatePool];

  if (mode === 'sequential') {
    // Keep exact original order (Câu 1 -> Câu N)
    orderedPool.sort((a, b) => a.originalNumber - b.originalNumber);
  } else if (mode === 'smart') {
    // Tiered priority:
    // Tier 0: Active mistakes / wrongStreak > 0 (not mastered)
    // Tier 1: Unseen questions (seenCount === 0) in sequential order so batches never skip or repeat
    // Tier 2: In-progress learning questions (status !== 'mastered')
    // Tier 3: Already mastered questions (sorted by oldest lastSeen first)
    const getTier = (w: Word): number => {
      const p = StorageEngine.getItemProgress(w, progressMap);
      if (!p || p.seenCount === 0) return 1;
      if (p.status !== 'mastered' && ((p.wrongStreak || 0) > 0 || (p.mistakesCount || 0) > 0)) {
        return 0;
      }
      if (p.status !== 'mastered') return 2;
      return 3;
    };

    orderedPool.sort((a, b) => {
      const tierA = getTier(a.word);
      const tierB = getTier(b.word);
      if (tierA !== tierB) return tierA - tierB;

      if (tierA === 3) {
        const pA = StorageEngine.getItemProgress(a.word, progressMap);
        const pB = StorageEngine.getItemProgress(b.word, progressMap);
        return (pA?.lastSeen || 0) - (pB?.lastSeen || 0);
      }
      return a.originalNumber - b.originalNumber;
    });
  } else {
    // 'random' mode
    orderedPool = shuffleArray(orderedPool);
  }

  const effectiveLimit = limit <= 0 ? orderedPool.length : Math.min(orderedPool.length, limit);
  const list: StandardQuestion[] = [];

  for (let i = 0; i < effectiveLimit; i++) {
    const { word: target, originalNumber } = orderedPool[i];

    // Case 1: Standard Multiple Choice Question (CSI106, CEA201, SSA101, PRF192)
    if (target.question && target.options && target.options.length > 0) {
      const rawOptions = target.options;
      const rawCorrect = target.correctWord || rawOptions[0];
      const meta = getQuestionAnswerMeta(rawCorrect, target.answer, rawOptions);

      const finalOptions = shuffleChoices
        ? shuffleArray(rawOptions).map((opt) => cleanOptionText(opt))
        : rawOptions;
      const finalCorrectOptions = shuffleChoices
        ? meta.correctChoices.map((c) => cleanOptionText(c))
        : meta.correctChoices;
      const finalCorrect = shuffleChoices
        ? finalCorrectOptions.join(' | ')
        : rawCorrect;

      list.push({
        id: String(target.id || getQuestionKey(target)),
        originalNumber,
        sentence: target.question,
        correctWord: finalCorrect,
        correctOptions: finalCorrectOptions,
        isMultiSelect: meta.isMultiSelect,
        requiredCount: meta.requiredCount,
        options: finalOptions,
        explanation: target.explanation || `Đáp án đúng: ${target.answer || rawOptions[0]}`,
        answerKey: shuffleChoices ? undefined : target.answer,
        subject: target.subject,
        topic: target.topic,
      });
    } else if (target.word) {
      // Case 2: Academic Concept / Terminology question
      const sentence =
        target.simple_examples?.[0] ||
        target.advanced_example ||
        `Khái niệm hoặc thuật ngữ nào sau đây tương ứng với: "${target.vi || target.word}"?`;

      const otherWords = shuffleArray(
        indexedWords
          .filter((item) => item.word.word && item.word.word.toLowerCase() !== target.word.toLowerCase())
          .map((item) => item.word.word)
      ).slice(0, 3);

      const options = shuffleArray([target.word, ...otherWords]);

      list.push({
        id: String(target.id || getQuestionKey(target)),
        originalNumber,
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
