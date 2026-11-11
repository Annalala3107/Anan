import { create } from 'zustand';
import { Word, CustomQuiz } from './types';
import { StorageEngine } from './storage';
import { soundFx, AmbientSoundType } from './sound';
import { QuizDatasetSchema } from './schema';

interface QuizStoreState {
  selectedQuizPath: string;
  activeCustomQuiz: CustomQuiz | null;
  words: Word[];
  isLoadingWords: boolean;
  soundEnabled: boolean;
  theme: 'dark' | 'light';

  // Zen Focus Mode state
  zenMode: boolean;
  ambientFocusSound: boolean;
  ambientSoundType: AmbientSoundType;

  // Active Exam Guard state
  isExamActive: boolean;
  setIsExamActive: (val: boolean) => void;

  // Visual Aesthetics state
  starfieldEnabled: boolean;
  toggleStarfield: () => void;

  setSelectedQuizPath: (path: string) => void;
  setActiveCustomQuiz: (quiz: CustomQuiz | null) => void;
  setWords: (words: Word[]) => void;
  loadQuizWords: (pathOrQuiz?: string | CustomQuiz) => Promise<Word[]>;
  toggleSound: () => void;
  setTheme: (theme: 'dark' | 'light') => void;

  toggleZenMode: (val?: boolean) => void;
  toggleAmbientFocus: () => void;
  setAmbientSoundType: (type: AmbientSoundType) => void;
}

export const useQuizStore = create<QuizStoreState>((set, get) => ({
  selectedQuizPath: '/data/csi106_all.json',
  activeCustomQuiz: null,
  words: [],
  isLoadingWords: false,
  soundEnabled: true,
  theme: 'dark',

  zenMode: false,
  ambientFocusSound: false,
  ambientSoundType: 'alpha_drone',
  isExamActive: false,
  setIsExamActive: (isExamActive: boolean) => set({ isExamActive }),
  starfieldEnabled: false,
  toggleStarfield: () => set((state) => ({ starfieldEnabled: !state.starfieldEnabled })),

  setSelectedQuizPath: (path: string) => {
    StorageEngine.setSelectedQuiz(path);
    set({ selectedQuizPath: path, activeCustomQuiz: null });
    get().loadQuizWords(path);
  },

  setActiveCustomQuiz: (quiz: CustomQuiz | null) => {
    if (quiz) {
      set({ activeCustomQuiz: quiz, words: quiz.words });
    } else {
      set({ activeCustomQuiz: null });
      get().loadQuizWords(get().selectedQuizPath);
    }
  },

  setWords: (words: Word[]) => set({ words }),

  loadQuizWords: async (target) => {
    const active = target || get().activeCustomQuiz || get().selectedQuizPath;
    set({ isLoadingWords: true });

    try {
      if (typeof active === 'object' && active.words) {
        set({ words: active.words, isLoadingWords: false });
        return active.words;
      }

      const filePath = typeof active === 'string' ? active : get().selectedQuizPath;
      const res = await fetch(filePath);
      if (!res.ok) throw new Error('Failed to fetch quiz dataset');
      const rawData = await res.json();

      // Zod Schema Validation to safeguard against corrupted or malformed questions
      const parsed = QuizDatasetSchema.safeParse(rawData);
      const data: Word[] = parsed.success ? (parsed.data as Word[]) : rawData;

      set({ words: data, isLoadingWords: false });
      return data;
    } catch (err) {
      console.error('Error loading quiz dataset:', err);
      set({ isLoadingWords: false });
      return [];
    }
  },

  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  setTheme: (theme) => set({ theme }),

  toggleZenMode: (val?: boolean) => {
    const next = typeof val === 'boolean' ? val : !get().zenMode;
    if (next) {
      soundFx.playZenChime();
    } else {
      soundFx.stopAmbientSound();
      set({ ambientFocusSound: false });
    }
    set({ zenMode: next });
  },

  toggleAmbientFocus: () => {
    const next = !get().ambientFocusSound;
    if (next) {
      soundFx.startAmbientSound(get().ambientSoundType);
    } else {
      soundFx.stopAmbientSound();
    }
    set({ ambientFocusSound: next });
  },

  setAmbientSoundType: (type) => {
    set({ ambientSoundType: type });
    if (get().ambientFocusSound) {
      soundFx.startAmbientSound(type);
    }
  },
}));
