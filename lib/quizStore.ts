import { create } from 'zustand';
import { Word, CustomQuiz } from './types';
import { StorageEngine } from './storage';
import { QuizDatasetSchema } from './schema';

interface QuizStoreState {
  selectedQuizPath: string;
  activeCustomQuiz: CustomQuiz | null;
  loadedQuizKey: string | null;
  words: Word[];
  isLoadingWords: boolean;

  // Active Exam Guard state
  isExamActive: boolean;
  setIsExamActive: (val: boolean) => void;

  setSelectedQuizPath: (path: string) => void;
  setActiveCustomQuiz: (quiz: CustomQuiz | null) => void;
  setWords: (words: Word[]) => void;
  loadQuizWords: (pathOrQuiz?: string | CustomQuiz) => Promise<Word[]>;
}

export const useQuizStore = create<QuizStoreState>((set, get) => ({
  selectedQuizPath: '/data/cea201_all.json',
  activeCustomQuiz: null,
  loadedQuizKey: null,
  words: [],
  isLoadingWords: false,

  isExamActive: false,
  setIsExamActive: (isExamActive: boolean) => set({ isExamActive }),

  setSelectedQuizPath: (path: string) => {
    if (get().selectedQuizPath === path && get().activeCustomQuiz === null && get().words.length > 0) {
      return;
    }
    StorageEngine.setSelectedQuiz(path);
    set({ selectedQuizPath: path, activeCustomQuiz: null, loadedQuizKey: null });
    get().loadQuizWords(path);
  },

  setActiveCustomQuiz: (quiz: CustomQuiz | null) => {
    if (quiz) {
      set({ activeCustomQuiz: quiz, words: quiz.words, loadedQuizKey: `custom:${quiz.id}` });
    } else {
      set({ activeCustomQuiz: null, loadedQuizKey: null });
      get().loadQuizWords(get().selectedQuizPath);
    }
  },

  setWords: (words: Word[]) => set({ words }),

  loadQuizWords: async (target) => {
    const active = target || get().activeCustomQuiz || get().selectedQuizPath;
    const targetKey = typeof active === 'object' ? `custom:${active.id}` : active;

    if (get().words.length > 0 && get().loadedQuizKey === targetKey) {
      return get().words;
    }

    set({ isLoadingWords: true });

    try {
      if (typeof active === 'object' && active.words) {
        set({ words: active.words, loadedQuizKey: targetKey, isLoadingWords: false });
        return active.words;
      }

      const filePath = typeof active === 'string' ? active : get().selectedQuizPath;
      const res = await fetch(filePath);
      if (!res.ok) throw new Error('Failed to fetch quiz dataset');
      const rawData = await res.json();

      // Zod Schema Validation to safeguard against corrupted or malformed questions
      const parsed = QuizDatasetSchema.safeParse(rawData);
      const data: Word[] = parsed.success ? (parsed.data as Word[]) : rawData;

      set({ words: data, loadedQuizKey: targetKey, isLoadingWords: false });
      return data;
    } catch (err) {
      console.error('Error loading quiz dataset:', err);
      set({ isLoadingWords: false });
      return [];
    }
  },
}));
