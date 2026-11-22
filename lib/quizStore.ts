import { create } from 'zustand';
import { Word, CustomQuiz } from './types';
import { StorageEngine } from './storage';
import { QuizDatasetSchema } from './schema';

const HUD_PREF_KEY = 'ananquiz_show_constellation_hud';
const BG_PREF_KEY = 'ananquiz_enable_constellation_bg';
const MOTION_PREF_KEY = 'ananquiz_motion_mode';

let activeLoadSeq = 0;
let activeLoadController: AbortController | null = null;

export type MotionMode = 'system' | 'full' | 'reduced';

function applyDocumentMotionMode(mode: MotionMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-motion', mode);
}

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
  loadError: string | null;

  // Live Streak State (synced with StorageEngine + custom events)
  streak: number;
  syncStreak: () => void;

  // Background Constellation HUD visibility (default false) & Canvas toggle (default true) & Motion preference
  showConstellationHud: boolean;
  setShowConstellationHud: (show: boolean) => void;
  enableConstellationBg: boolean;
  setEnableConstellationBg: (enabled: boolean) => void;
  motionMode: MotionMode;
  setMotionMode: (mode: MotionMode) => void;
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
  loadError: null,

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
  enableConstellationBg: true,
  setEnableConstellationBg: (enabled: boolean) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(BG_PREF_KEY, enabled ? 'true' : 'false');
      } catch {
        // Ignore storage quota errors
      }
    }
    set({ enableConstellationBg: enabled });
  },
  motionMode: 'system',
  setMotionMode: (mode: MotionMode) => {
    applyDocumentMotionMode(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(MOTION_PREF_KEY, mode);
      } catch {
        // Ignore storage quota errors
      }
    }
    set({ motionMode: mode });
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
    let storedBg = true;
    let storedMotion: MotionMode = 'system';
    try {
      storedHud = localStorage.getItem(HUD_PREF_KEY) === 'true';
      storedBg = localStorage.getItem(BG_PREF_KEY) !== 'false';
      const rawMotion = localStorage.getItem(MOTION_PREF_KEY);
      if (rawMotion === 'full' || rawMotion === 'reduced' || rawMotion === 'system') {
        storedMotion = rawMotion;
      }
    } catch {
      storedHud = false;
      storedBg = true;
      storedMotion = 'system';
    }
    applyDocumentMotionMode(storedMotion);

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
          enableConstellationBg: storedBg,
          motionMode: storedMotion,
        });
        return;
      }

      // IndexedDB hydration runs asynchronously; defer clearing activeCustomQuizId until it settles
      void StorageEngine.hydrateFromIdb().then(() => {
        if (StorageEngine.getActiveCustomQuizId() !== savedCustomId) return;
        const idbMatch = StorageEngine.getCustomQuizzes().find((q) => q.id === savedCustomId);
        if (idbMatch) {
          set({
            activeCustomQuiz: idbMatch,
            words: idbMatch.words,
            loadedQuizKey: `custom:${idbMatch.id}`,
            hasHydratedSelection: true,
            hasExplicitSelection: true,
          });
        } else {
          StorageEngine.setActiveCustomQuizId(null);
        }
      });
    }

    set({
      selectedQuizPath: savedPath,
      activeCustomQuiz: null,
      hasHydratedSelection: true,
      hasExplicitSelection: explicit,
      streak: currentStreak,
      showConstellationHud: storedHud,
      enableConstellationBg: storedBg,
      motionMode: storedMotion,
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
      loadError: null,
      hasHydratedSelection: true,
      hasExplicitSelection: true,
    });
    void get().loadQuizWords(path);
  },

  setActiveCustomQuiz: (quiz: CustomQuiz | null) => {
    StorageEngine.setActiveCustomQuizId(quiz ? quiz.id : null);
    if (quiz) {
      activeLoadSeq += 1;
      activeLoadController?.abort();
      activeLoadController = null;
      set({
        activeCustomQuiz: quiz,
        words: quiz.words,
        loadedQuizKey: `custom:${quiz.id}`,
        isLoadingWords: false,
        loadError: null,
        hasHydratedSelection: true,
        hasExplicitSelection: true,
      });
    } else {
      set({
        activeCustomQuiz: null,
        loadedQuizKey: null,
        loadError: null,
        hasHydratedSelection: true,
        hasExplicitSelection: StorageEngine.hasExplicitSelectedQuiz(),
      });
      void get().loadQuizWords(get().selectedQuizPath);
    }
  },

  setWords: (words: Word[]) => set({ words }),

  loadQuizWords: async (target) => {
    if (!target && !get().hasHydratedSelection) {
      get().hydrateSelection();
    }
    const active = target || get().activeCustomQuiz || get().selectedQuizPath;
    const targetKey = typeof active === 'object' ? `custom:${active.id}` : active;

    if (get().words.length > 0 && get().loadedQuizKey === targetKey && !get().loadError) {
      return get().words;
    }

    const seq = ++activeLoadSeq;
    activeLoadController?.abort();
    const controller =
      typeof AbortController !== 'undefined' ? new AbortController() : null;
    activeLoadController = controller;

    set({ isLoadingWords: true, loadError: null });

    try {
      if (typeof active === 'object' && active.words) {
        if (seq !== activeLoadSeq) return get().words;
        set({
          words: active.words,
          loadedQuizKey: targetKey,
          isLoadingWords: false,
          loadError: null,
        });
        return active.words;
      }

      const filePath = typeof active === 'string' ? active : get().selectedQuizPath;
      const res = await fetch(filePath, controller ? { signal: controller.signal } : undefined);
      if (!res.ok) {
        throw new Error(`Không thể tải ngân hàng câu hỏi (HTTP ${res.status}).`);
      }
      const rawData: unknown = await res.json();

      if (seq !== activeLoadSeq) {
        return get().words;
      }

      // Zod Schema Validation with strict Array fallback so corrupted payloads never crash UI
      const parsed = QuizDatasetSchema.safeParse(rawData);
      let data: Word[] = [];
      if (parsed.success) {
        data = parsed.data as Word[];
      } else if (Array.isArray(rawData) && rawData.length > 0) {
        data = rawData as Word[];
      } else {
        throw new Error('Dữ liệu bộ đề không đúng định dạng mảng câu hỏi hợp lệ.');
      }

      if (seq !== activeLoadSeq) {
        return get().words;
      }

      set({
        words: data,
        loadedQuizKey: targetKey,
        isLoadingWords: false,
        loadError: null,
      });
      return data;
    } catch (err: unknown) {
      if (
        seq !== activeLoadSeq ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        return get().words;
      }
      console.error('Error loading quiz dataset:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Không thể tải ngân hàng câu hỏi. Hãy kiểm tra mạng và thử lại.';
      set({ isLoadingWords: false, loadError: message });
      return [];
    } finally {
      if (activeLoadController === controller) {
        activeLoadController = null;
      }
    }
  },
}));
