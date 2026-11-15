import { create } from 'zustand';
import { Word, CustomQuiz } from './types';
import { StorageEngine } from './storage';
import { QuizDatasetSchema } from './schema';

interface QuizStoreState {
  selectedQuizPath: string;
  activeCustomQuiz: CustomQuiz | null;
  loadedQuizKey: string | null;
  hasHydratedSelection: boolean;
  words: Word[];
  isLoadingWords: boolean;

  // Active Exam Guard state
  isExamActive: boolean;
  setIsExamActive: (val: boolean) => void;

  hydrateSelection: () => void;
  setSelectedQuizPath: (path: string) => void;
  setActiveCustomQuiz: (quiz: CustomQuiz | null) => void;
  setWords: (words: Word[]) => void;
  loadQuizWords: (pathOrQuiz?: string | CustomQuiz) => Promise<Word[]>;
}

export const useQuizStore = create<QuizStoreState>((set, get) => ({
  selectedQuizPath: '/data/cea201_all.json',
  activeCustomQuiz: null,
  loadedQuizKey: null,
  hasHydratedSelection: false,
  words: [],
  isLoadingWords: false,

  isExamActive: false,
  setIsExamActive: (isExamActive: boolean) => set({ isExamActive }),

  hydrateSelection: () => {
    if (typeof window === 'undefined' || get().hasHydratedSelection) return;

    const savedCustomId = StorageEngine.getActiveCustomQuizId();
    const savedPath = StorageEngine.getSelectedQuiz();

    if (savedCustomId) {
      const matchedCustom = StorageEngine.getCustomQuizzes().find((q) => q.id === savedCustomId);
      if (matchedCustom) {
        set({
          selectedQuizPath: savedPath,
          activeCustomQuiz: matchedCustom,
          words: matchedCustom.words,
          loadedQuizKey: `custom:${matchedCustom.id}`,
          hasHydratedSelection: true,
        });
        return;
      }
      StorageEngine.setActiveCustomQuizId(null);
    }

    set({
      selectedQuizPath: savedPath,
      activeCustomQuiz: null,
      hasHydratedSelection: true,
    });
  },

  setSelectedQuizPath: (path: string) => {
    StorageEngine.setSelectedQuiz(path);
    StorageEngine.setActiveCustomQuizId(null);
    if (
      get().selectedQuizPath === path &&
      get().activeCustomQuiz === null &&
      get().words.length > 0 &&
      get().hasHydratedSelection
    ) {
      return;
    }
    set({
      selectedQuizPath: path,
      activeCustomQuiz: null,
      loadedQuizKey: null,
      hasHydratedSelection: true,
    });
    get().loadQuizWords(path);
  },

  setActiveCustomQuiz: (quiz: CustomQuiz | null) => {
    StorageEngine.setActiveCustomQuizId(quiz ? quiz.id : null);
    if (quiz) {
      set({
        activeCustomQuiz: quiz,
        words: quiz.words,
        loadedQuizKey: `custom:${quiz.id}`,
        hasHydratedSelection: true,
      });
    } else {
      set({ activeCustomQuiz: null, loadedQuizKey: null, hasHydratedSelection: true });
      get().loadQuizWords(get().selectedQuizPath);
    }
  },

  setWords: (words: Word[]) => set({ words }),

  loadQuizWords: async (target) => {
    if (!target && !get().hasHydratedSelection) {
      get().hydrateSelection();
    }
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
