import { create } from 'zustand';
import { Word, CustomQuiz } from './types';
import { StorageEngine } from './storage';
import { QuizDatasetSchema } from './schema';

const HUD_PREF_KEY = 'ananquiz_show_constellation_hud';

export interface ConstellationActionRequest {
  type: 'regenerate' | 'shooting_star';
  seq: number;
}

interface QuizStoreState {
  selectedQuizPath: string;
  activeCustomQuiz: CustomQuiz | null;
  loadedQuizKey: string | null;
  hasHydratedSelection: boolean;
  hasExplicitSelection: boolean;
  words: Word[];
  isLoadingWords: boolean;

  // Live Streak State (synced with StorageEngine + custom events)
  streak: number;
  syncStreak: () => void;

  // Background Constellation HUD visibility (default false)
  showConstellationHud: boolean;
  setShowConstellationHud: (show: boolean) => void;
  constellationAction: ConstellationActionRequest | null;
  triggerConstellationAction: (type: 'regenerate' | 'shooting_star') => void;

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
  hasExplicitSelection: false,
  words: [],
  isLoadingWords: false,

  streak: 1,
  syncStreak: () => set({ streak: StorageEngine.getStreak() }),

  showConstellationHud: false,
  setShowConstellationHud: (show: boolean) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(HUD_PREF_KEY, show ? 'true' : 'false');
      } catch {
        // Ignore storage quota errors
      }
    }
    set({ showConstellationHud: show });
  },
  constellationAction: null,
  triggerConstellationAction: (type) =>
    set((state) => ({
      constellationAction: { type, seq: (state.constellationAction?.seq ?? 0) + 1 },
    })),

  isExamActive: false,
  setIsExamActive: (isExamActive: boolean) => set({ isExamActive }),

  hydrateSelection: () => {
    if (typeof window === 'undefined' || get().hasHydratedSelection) return;

    const savedCustomId = StorageEngine.getActiveCustomQuizId();
    const savedPath = StorageEngine.getSelectedQuiz();
    const explicit = StorageEngine.hasExplicitSelectedQuiz();
    const currentStreak = StorageEngine.getStreak();
    let storedHud = false;
    try {
      storedHud = localStorage.getItem(HUD_PREF_KEY) === 'true';
    } catch {
      storedHud = false;
    }

    if (savedCustomId) {
      const matchedCustom = StorageEngine.getCustomQuizzes().find((q) => q.id === savedCustomId);
      if (matchedCustom) {
        set({
          selectedQuizPath: savedPath,
          activeCustomQuiz: matchedCustom,
          words: matchedCustom.words,
          loadedQuizKey: `custom:${matchedCustom.id}`,
          hasHydratedSelection: true,
          hasExplicitSelection: true,
          streak: currentStreak,
          showConstellationHud: storedHud,
        });
        return;
      }
      StorageEngine.setActiveCustomQuizId(null);
    }

    set({
      selectedQuizPath: savedPath,
      activeCustomQuiz: null,
      hasHydratedSelection: true,
      hasExplicitSelection: explicit,
      streak: currentStreak,
      showConstellationHud: storedHud,
    });
  },

  setSelectedQuizPath: (path: string) => {
    StorageEngine.setSelectedQuiz(path);
    StorageEngine.setActiveCustomQuizId(null);
    if (
      get().selectedQuizPath === path &&
      get().activeCustomQuiz === null &&
      get().words.length > 0 &&
      get().hasHydratedSelection &&
      get().hasExplicitSelection
    ) {
      return;
    }
    set({
      selectedQuizPath: path,
      activeCustomQuiz: null,
      loadedQuizKey: null,
      hasHydratedSelection: true,
      hasExplicitSelection: true,
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
        hasExplicitSelection: true,
      });
    } else {
      set({
        activeCustomQuiz: null,
        loadedQuizKey: null,
        hasHydratedSelection: true,
        hasExplicitSelection: StorageEngine.hasExplicitSelectedQuiz(),
      });
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
