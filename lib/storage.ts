/**
 * Local-First Storage & State Sync Engine
 * Works out-of-the-box in browser localStorage without requiring any cloud setup.
 * Supports transparent Supabase backend syncing when environment keys are provided.
 */

import { WordProgress, CustomQuiz, CustomSubject, DailyStats } from './types';
import { SRSEngine } from './srs';
import { getQuestionKey } from './utils';
import { BackupDataSchema } from './schema';
import { idbGet, idbSet } from './idbStorage';

export interface ExamRecord {
  id: string;
  date: number;
  score: number;
  total: number;
  percent: number;
  wrongCount: number;
  quizTitle?: string;
}

const STORAGE_KEYS = {
  WORD_PROGRESS: 'ananquiz_word_progress',
  CUSTOM_QUIZZES: 'ananquiz_custom_quizzes',
  CUSTOM_SUBJECTS: 'ananquiz_custom_subjects',
  DAILY_STATS: 'ananquiz_daily_stats',
  DAILY_HISTORY: 'ananquiz_daily_history',
  STREAK: 'ananquiz_streak',
  LAST_ACTIVE_DATE: 'ananquiz_last_active_date',
  SELECTED_QUIZ: 'ananquiz_selected_quiz',
  ACTIVE_CUSTOM_QUIZ_ID: 'ananquiz_active_custom_quiz_id',
  USER_PROFILE: 'ananquiz_user_profile',
  EXAM_HISTORY: 'ananquiz_exam_history',
  BOOKMARKED_QUESTIONS: 'ananquiz_bookmarked_questions',
};

export class StorageEngine {
  private static progressCache: Record<string, WordProgress> | null = null;
  private static customQuizzesCache: CustomQuiz[] | null = null;
  private static customSubjectsCache: CustomSubject[] | null = null;
  private static bookmarksCache: string[] | null = null;
  private static storageListenerBound = false;
  private static idbHydrationPromise: Promise<void> | null = null;
  private static customQuizMutationVersion = 0;

  private static ensureStorageListener(): void {
    if (typeof window === 'undefined') return;
    if (!this.storageListenerBound) {
      this.storageListenerBound = true;
      window.addEventListener('storage', (e: StorageEvent) => {
        if (!e.key || e.key === STORAGE_KEYS.WORD_PROGRESS) {
          this.progressCache = null;
        }
        if (!e.key || e.key === STORAGE_KEYS.CUSTOM_QUIZZES) {
          this.customQuizzesCache = null;
        }
        if (!e.key || e.key === STORAGE_KEYS.CUSTOM_SUBJECTS) {
          this.customSubjectsCache = null;
        }
        if (!e.key || e.key === STORAGE_KEYS.BOOKMARKED_QUESTIONS) {
          this.bookmarksCache = null;
        }
      });
    }
    void this.hydrateFromIdb();
  }

  public static hydrateFromIdb(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (this.idbHydrationPromise) return this.idbHydrationPromise;

    const startVersion = this.customQuizMutationVersion;
    this.idbHydrationPromise = (async () => {
      try {
        const idbQuizzes = await idbGet<CustomQuiz[]>('custom_quizzes');
        if (this.customQuizMutationVersion !== startVersion) {
          return;
        }

        let localQuizzes: CustomQuiz[] = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_QUIZZES);
          localQuizzes = raw ? (JSON.parse(raw) as CustomQuiz[]) : [];
        } catch {
          localQuizzes = [];
        }

        if ((!idbQuizzes || idbQuizzes.length === 0) && localQuizzes.length > 0) {
          await idbSet('custom_quizzes', localQuizzes);
          return;
        }

        if (Array.isArray(idbQuizzes) && idbQuizzes.length > 0) {
          const mergedMap = new Map<string, CustomQuiz>();
          for (const q of idbQuizzes) {
            if (q && q.id) mergedMap.set(q.id, q);
          }
          for (const q of localQuizzes) {
            if (!q || !q.id) continue;
            const prev = mergedMap.get(q.id);
            if (!prev) {
              mergedMap.set(q.id, q);
            } else {
              const prevTs = Date.parse(prev.updated_at || prev.created_at || '0') || 0;
              const curTs = Date.parse(q.updated_at || q.created_at || '0') || 0;
              if (curTs >= prevTs) {
                mergedMap.set(q.id, q);
              }
            }
          }

          const merged = Array.from(mergedMap.values()).sort((a, b) => {
            const ta = Date.parse(a.created_at || '0') || 0;
            const tb = Date.parse(b.created_at || '0') || 0;
            return tb - ta;
          });

          const changed =
            merged.length !== localQuizzes.length ||
            merged.some((item, idx) => item.id !== localQuizzes[idx]?.id || item.updated_at !== localQuizzes[idx]?.updated_at);

          if (changed) {
            this.customQuizzesCache = merged;
            try {
              localStorage.setItem(STORAGE_KEYS.CUSTOM_QUIZZES, JSON.stringify(merged));
            } catch {
              // IndexedDB remains the durable store when localStorage is full
            }
            window.dispatchEvent(new CustomEvent('ananquiz:stats-updated'));
          }
        }
      } catch {
        // Ignore IndexedDB errors cleanly
      }
    })();

    return this.idbHydrationPromise;
  }

  // ---- WORD PROGRESS (SRS) ----
  public static getWordProgress(): Record<string, WordProgress> {
    if (typeof window === 'undefined') return {};
    this.ensureStorageListener();
    if (this.progressCache !== null) {
      return this.progressCache;
    }
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WORD_PROGRESS);
      const parsed: Record<string, WordProgress> = data ? JSON.parse(data) : {};
      this.progressCache = parsed;
      return parsed;
    } catch (e) {
      console.error('Failed to read word progress from storage:', e);
      return {};
    }
  }

  public static getItemProgress(
    item: { id?: string; question?: string; word: string; correctWord?: string },
    allProgress?: Record<string, WordProgress>
  ): WordProgress | null {
    const map = allProgress || this.getWordProgress();
    const key = getQuestionKey(item);
    return (
      map[key] ||
      (item.id ? map[item.id] : null) ||
      (item.word ? map[item.word] : null) ||
      (item.correctWord ? map[item.correctWord] : null) ||
      null
    );
  }

  /**
   * Only used in LearnMode where the student genuinely evaluates retention (Quality 1-5).
   * Calculates Ease Factor and Spaced Interval according to SuperMemo SM-2.
   */
  public static updateWordProgress(
    target: string | { id?: string; question?: string; word: string; correctWord?: string },
    quality: number, // 1 to 5
    options?: { markMastered?: boolean }
  ): WordProgress {
    const key = typeof target === 'string' ? target : getQuestionKey(target);
    const allProgress = { ...this.getWordProgress() };
    const existing: WordProgress = allProgress[key] || {
      word: key,
      strength: 0,
      lastSeen: Date.now(),
      nextDue: Date.now(),
      seenCount: 0,
      wrongStreak: 0,
      status: 'new',
      intervalDays: 0,
      easeFactor: 2.5,
      mistakesCount: 0,
    };

    const updated = SRSEngine.calculateNextReview(existing, quality, {
      markMastered: options?.markMastered,
    });
    allProgress[key] = updated;
    this.progressCache = allProgress;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.WORD_PROGRESS, JSON.stringify(allProgress));
      } catch (e) {
        console.error('Failed to save word progress:', e);
      }
    }

    // Update daily stats
    this.recordActivity(quality >= 3 ? 'learn' : 'mistake');
    return updated;
  }

  /**
   * Used in ExamMode: When a student gets a question wrong in an exam,
   * we ONLY increment mistakesCount and flag it for MistakesMode review.
   * We NEVER blindly set quality = 5 or corrupt SM-2 EaseFactor/Interval on lucky exam guesses!
   */
  public static recordMistakeOnly(
    target: string | { id?: string; question?: string; word: string }
  ): void {
    const key = typeof target === 'string' ? target : getQuestionKey(target);
    const allProgress = { ...this.getWordProgress() };
    const prev = allProgress[key];
    const existing: WordProgress = prev
      ? { ...prev }
      : {
          word: key,
          strength: 0,
          lastSeen: Date.now(),
          nextDue: Date.now(),
          seenCount: 0,
          wrongStreak: 0,
          status: 'learning',
          intervalDays: 0,
          easeFactor: 2.5,
          mistakesCount: 0,
        };

    existing.mistakesCount = (existing.mistakesCount || 0) + 1;
    existing.lastSeen = Date.now();
    existing.wrongStreak = (existing.wrongStreak || 0) + 1;
    if (existing.strength > 0) {
      existing.strength = Math.max(0.1, Math.round((existing.strength - 0.2) * 1000) / 1000);
    }
    if (existing.status === 'mastered') {
      existing.status = 'learning';
    }

    allProgress[key] = existing;
    this.progressCache = allProgress;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.WORD_PROGRESS, JSON.stringify(allProgress));
      } catch (e) {
        console.error('Failed to record mistake:', e);
      }
    }
  }

  // ---- EXAM HISTORY ----
  public static getExamHistory(): ExamRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EXAM_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static recordExamResult(result: Omit<ExamRecord, 'id'>): void {
    const history = this.getExamHistory();
    const newRecord: ExamRecord = {
      ...result,
      id: `exam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    history.unshift(newRecord);
    // Keep 50 most recent records
    const trimmed = history.slice(0, 50);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(trimmed));
      } catch (e) {
        console.error('Failed to save exam history:', e);
      }
    }
  }

  // ---- DAILY STATS & STREAK ----
  private static formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  public static getTodayDateString(): string {
    return this.formatLocalDate(new Date());
  }

  public static getDailyStats(): DailyStats {
    const todayStr = this.getTodayDateString();
    const defaultStats: DailyStats = {
      date: todayStr,
      wordsLearned: 0,
      wordsDrilled: 0,
      wordsExamined: 0,
      mistakesCount: 0,
      accuracy: 100,
      accuracySum: 0,
      accuracySamples: 0,
    };

    if (typeof window === 'undefined') return defaultStats;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DAILY_STATS);
      if (!raw) return defaultStats;
      const parsed: DailyStats = JSON.parse(raw);
      if (parsed.date === todayStr) {
        return parsed;
      }
      return defaultStats;
    } catch {
      return defaultStats;
    }
  }

  private static getStoredDailyHistory(): DailyStats[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DAILY_HISTORY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public static getDailyHistory(days = 14): DailyStats[] {
    const safeDays = Math.max(1, Math.min(60, Math.floor(days)));
    const map = new Map<string, DailyStats>();
    for (const entry of this.getStoredDailyHistory()) {
      if (entry && typeof entry.date === 'string') {
        map.set(entry.date, entry);
      }
    }
    const todayStats = this.getDailyStats();
    const existingToday = map.get(todayStats.date);
    if (
      !existingToday ||
      todayStats.wordsLearned + todayStats.wordsDrilled + todayStats.wordsExamined >=
        existingToday.wordsLearned + existingToday.wordsDrilled + existingToday.wordsExamined
    ) {
      if (
        todayStats.wordsLearned > 0 ||
        todayStats.wordsDrilled > 0 ||
        todayStats.wordsExamined > 0 ||
        todayStats.mistakesCount > 0
      ) {
        map.set(todayStats.date, todayStats);
      }
    }

    const result: DailyStats[] = [];
    const baseDate = new Date();
    for (let offset = safeDays - 1; offset >= 0; offset--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - offset);
      const dateStr = this.formatLocalDate(d);
      const hit = map.get(dateStr);
      result.push(
        hit || {
          date: dateStr,
          wordsLearned: 0,
          wordsDrilled: 0,
          wordsExamined: 0,
          mistakesCount: 0,
          accuracy: 0,
          accuracySum: 0,
          accuracySamples: 0,
        }
      );
    }
    return result;
  }

  public static getDueWordsCount(allProgress?: Record<string, WordProgress>): number {
    const map = allProgress || this.getWordProgress();
    const now = Date.now();
    let count = 0;
    for (const p of Object.values(map)) {
      if (p && p.seenCount > 0 && p.nextDue <= now) {
        count += 1;
      }
    }
    return count;
  }

  public static recordActivity(
    type: 'learn' | 'drill' | 'exam' | 'mistake',
    accuracyScore?: number,
    incrementCounter = true
  ) {
    if (typeof window === 'undefined') return;
    const stats = this.getDailyStats();
    if (incrementCounter) {
      if (type === 'learn') stats.wordsLearned += 1;
      if (type === 'drill') stats.wordsDrilled += 1;
      if (type === 'exam') stats.wordsExamined += 1;
      if (type === 'mistake') stats.mistakesCount += 1;
    }

    if (accuracyScore !== undefined && Number.isFinite(accuracyScore)) {
      const clampedScore = Math.max(0, Math.min(100, accuracyScore));
      const priorSamples =
        typeof stats.accuracySamples === 'number'
          ? stats.accuracySamples
          : stats.accuracy !== 100
          ? 1
          : 0;
      const priorSum =
        typeof stats.accuracySum === 'number'
          ? stats.accuracySum
          : priorSamples > 0
          ? stats.accuracy
          : 0;

      stats.accuracySum = priorSum + clampedScore;
      stats.accuracySamples = priorSamples + 1;
      stats.accuracy = Math.round(stats.accuracySum / stats.accuracySamples);
    }

    try {
      localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(stats));

      // Upsert into 30-day rolling dailyHistory
      const historyMap = new Map<string, DailyStats>();
      for (const entry of this.getStoredDailyHistory()) {
        if (entry && entry.date) {
          historyMap.set(entry.date, entry);
        }
      }
      historyMap.set(stats.date, stats);
      const sortedHistory = Array.from(historyMap.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);
      localStorage.setItem(STORAGE_KEYS.DAILY_HISTORY, JSON.stringify(sortedHistory));

      this.updateStreak();
      window.dispatchEvent(new CustomEvent('ananquiz:stats-updated'));
    } catch (e) {
      console.error('Failed to save daily stats:', e);
    }
  }

  public static getStreak(): number {
    if (typeof window === 'undefined') return 1;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
      return raw ? parseInt(raw, 10) : 1;
    } catch {
      return 1;
    }
  }

  public static updateStreak(): number {
    if (typeof window === 'undefined') return 1;
    const today = this.getTodayDateString();
    const lastActive = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_DATE);
    let currentStreak = this.getStreak();

    if (!lastActive) {
      currentStreak = 1;
    } else if (lastActive === today) {
      return currentStreak;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = this.formatLocalDate(yesterday);

      if (lastActive === yesterdayStr) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
    }

    try {
      localStorage.setItem(STORAGE_KEYS.STREAK, currentStreak.toString());
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, today);
      window.dispatchEvent(new CustomEvent('ananquiz:stats-updated'));
    } catch (e) {
      console.error('Failed to save streak:', e);
    }
    return currentStreak;
  }

  // ---- CUSTOM QUIZZES ----
  public static getCustomQuizzes(): CustomQuiz[] {
    if (typeof window === 'undefined') return [];
    this.ensureStorageListener();
    if (this.customQuizzesCache !== null) {
      return this.customQuizzesCache;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_QUIZZES);
      const parsed: CustomQuiz[] = raw ? JSON.parse(raw) : [];
      this.customQuizzesCache = parsed;
      return parsed;
    } catch {
      return [];
    }
  }

  public static saveCustomQuiz(quiz: Omit<CustomQuiz, 'id' | 'created_at'>): CustomQuiz {
    const list = [...this.getCustomQuizzes()];
    const newQuiz: CustomQuiz = {
      ...quiz,
      id: 'quiz_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      created_at: new Date().toISOString(),
    };

    list.unshift(newQuiz);
    this.customQuizMutationVersion += 1;
    this.customQuizzesCache = list;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_QUIZZES, JSON.stringify(list));
      } catch (e) {
        console.warn('localStorage full when saving custom quiz, persisted in IndexedDB:', e);
      }
      void idbSet('custom_quizzes', list);
    }
    return newQuiz;
  }

  public static updateCustomQuiz(
    id: string,
    updates: Partial<Omit<CustomQuiz, 'id' | 'created_at'>>
  ): CustomQuiz | null {
    const list = [...this.getCustomQuizzes()];
    const index = list.findIndex((q) => q.id === id);
    if (index === -1) return null;

    const updated: CustomQuiz = {
      ...list[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    list[index] = updated;
    this.customQuizMutationVersion += 1;
    this.customQuizzesCache = list;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_QUIZZES, JSON.stringify(list));
      } catch (e) {
        console.warn('localStorage full when updating custom quiz, persisted in IndexedDB:', e);
      }
      void idbSet('custom_quizzes', list);
      window.dispatchEvent(new CustomEvent('ananquiz:stats-updated'));
    }
    return updated;
  }

  public static deleteCustomQuiz(id: string): void {
    const list = this.getCustomQuizzes().filter((q) => q.id !== id);
    this.customQuizMutationVersion += 1;
    this.customQuizzesCache = list;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_QUIZZES, JSON.stringify(list));
      } catch (e) {
        console.error('Failed to delete custom quiz:', e);
      }
      void idbSet('custom_quizzes', list);
      if (this.getActiveCustomQuizId() === id) {
        this.setActiveCustomQuizId(null);
      }
    }
  }

  // ---- CUSTOM SUBJECTS ----
  public static getCustomSubjects(): CustomSubject[] {
    if (typeof window === 'undefined') return [];
    this.ensureStorageListener();
    if (this.customSubjectsCache !== null) {
      return this.customSubjectsCache;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_SUBJECTS);
      const parsed: CustomSubject[] = raw ? JSON.parse(raw) : [];
      this.customSubjectsCache = parsed;
      return parsed;
    } catch {
      return [];
    }
  }

  public static saveCustomSubject(
    subject: Omit<CustomSubject, 'id' | 'created_at'>
  ): CustomSubject {
    const list = [...this.getCustomSubjects()];
    const newSubject: CustomSubject = {
      ...subject,
      id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      created_at: new Date().toISOString(),
    };

    list.push(newSubject);
    this.customSubjectsCache = list;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_SUBJECTS, JSON.stringify(list));
      } catch (e) {
        console.error('Failed to save custom subject:', e);
      }
    }
    return newSubject;
  }

  public static updateCustomSubject(
    id: string,
    updates: Partial<Omit<CustomSubject, 'id' | 'created_at'>>
  ): CustomSubject | null {
    const list = [...this.getCustomSubjects()];
    const index = list.findIndex((s) => s.id === id);
    if (index === -1) return null;

    list[index] = { ...list[index], ...updates };
    this.customSubjectsCache = list;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_SUBJECTS, JSON.stringify(list));
      } catch (e) {
        console.error('Failed to update custom subject:', e);
      }
    }
    return list[index];
  }

  public static deleteCustomSubject(id: string): void {
    const list = this.getCustomSubjects().filter((s) => s.id !== id);
    this.customSubjectsCache = list;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_SUBJECTS, JSON.stringify(list));
      } catch (e) {
        console.error('Failed to delete custom subject:', e);
      }
    }
  }

  // ---- ACTIVE QUIZ SELECTION ----
  public static hasExplicitSelectedQuiz(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const savedQuiz = localStorage.getItem(STORAGE_KEYS.SELECTED_QUIZ);
      const savedCustom = localStorage.getItem(STORAGE_KEYS.ACTIVE_CUSTOM_QUIZ_ID);
      if (savedCustom && savedCustom.trim().length > 0) return true;
      return Boolean(savedQuiz && !savedQuiz.includes('/sat/'));
    } catch {
      return false;
    }
  }

  public static getSelectedQuiz(): string {
    if (typeof window === 'undefined') return '/data/cea201_all.json';
    const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_QUIZ);
    if (!saved || saved.includes('/sat/')) {
      return '/data/cea201_all.json';
    }
    return saved;
  }

  public static setSelectedQuiz(path: string): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.SELECTED_QUIZ, path);
      } catch (e) {
        console.error('Failed to save selected quiz:', e);
      }
    }
  }

  public static getActiveCustomQuizId(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_CUSTOM_QUIZ_ID);
    } catch {
      return null;
    }
  }

  public static setActiveCustomQuizId(id: string | null): void {
    if (typeof window === 'undefined') return;
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CUSTOM_QUIZ_ID, id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_CUSTOM_QUIZ_ID);
      }
    } catch {
      // Ignore private mode / quota errors
    }
  }

  // ---- BACKUP & RESTORE CENTER (DISASTER RECOVERY) ----

  /**
   * Generates a complete, validated JSON backup of all user data
   */
  public static exportAllData(options?: { excludeCustomQuizzes?: boolean }): string {
    const backupObj = {
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      appName: 'AnanQuiz',
      data: {
        wordProgress: this.getWordProgress(),
        customQuizzes: options?.excludeCustomQuizzes ? [] : this.getCustomQuizzes(),
        customSubjects: this.getCustomSubjects(),
        dailyStats: this.getDailyStats(),
        dailyHistory: this.getStoredDailyHistory().slice(-30),
        streak: this.getStreak(),
        selectedQuiz: this.getSelectedQuiz(),
        examHistory: this.getExamHistory(),
        bookmarks: this.getBookmarks(),
      },
    };

    return JSON.stringify(backupObj, null, 2);
  }

  /**
   * Safely validates and restores user data from a backup JSON file
   * Supports 'merge' (smart merge preserving newer device progress) or 'overwrite'.
   */
  public static importAllData(
    jsonStr: string,
    options?: { mode?: 'merge' | 'overwrite' }
  ): { success: boolean; message: string; restoredCount?: number } {
    if (typeof window === 'undefined') {
      return { success: false, message: 'Môi trường trình duyệt không hợp lệ.' };
    }

    const mode = options?.mode ?? 'merge';

    try {
      const raw = JSON.parse(jsonStr);
      const validation = BackupDataSchema.safeParse(raw);

      if (!validation.success) {
        return {
          success: false,
          message:
            'File sao lưu không đúng định dạng AnanQuiz hoặc bị hỏng: ' +
            validation.error.issues.map((i) => i.path.join('.')).join(', '),
        };
      }

      const { data } = validation.data;
      const normalizedIncomingQuizzes: CustomQuiz[] = (data.customQuizzes || []).map((q) => ({
        ...q,
        words: (q.words || []).map((w) => ({
          ...w,
          id: w.id !== undefined ? String(w.id) : undefined,
        })),
      }));

      try {
        if (mode === 'overwrite') {
          if (data.wordProgress) {
            localStorage.setItem(STORAGE_KEYS.WORD_PROGRESS, JSON.stringify(data.wordProgress));
            this.progressCache = data.wordProgress;
          }
          if (data.customQuizzes) {
            this.customQuizMutationVersion += 1;
            this.customQuizzesCache = normalizedIncomingQuizzes;
            try {
              localStorage.setItem(
                STORAGE_KEYS.CUSTOM_QUIZZES,
                JSON.stringify(normalizedIncomingQuizzes)
              );
            } catch {
              // IndexedDB holds large custom quizzes if localStorage hits quota
            }
            void idbSet('custom_quizzes', normalizedIncomingQuizzes);
          }
          if (data.customSubjects) {
            localStorage.setItem(STORAGE_KEYS.CUSTOM_SUBJECTS, JSON.stringify(data.customSubjects));
            this.customSubjectsCache = data.customSubjects;
          }
          if (data.dailyStats) {
            localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(data.dailyStats));
          }
          if (data.dailyHistory) {
            localStorage.setItem(
              STORAGE_KEYS.DAILY_HISTORY,
              JSON.stringify(data.dailyHistory.slice(-30))
            );
          }
          if (typeof data.streak === 'number') {
            localStorage.setItem(STORAGE_KEYS.STREAK, data.streak.toString());
          }
          if (data.selectedQuiz) {
            localStorage.setItem(STORAGE_KEYS.SELECTED_QUIZ, data.selectedQuiz);
          }
          if (data.examHistory) {
            localStorage.setItem(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(data.examHistory));
          }
          if (data.bookmarks) {
            this.bookmarksCache = data.bookmarks;
            localStorage.setItem(
              STORAGE_KEYS.BOOKMARKED_QUESTIONS,
              JSON.stringify(data.bookmarks)
            );
          }
        } else {
          // SMART MERGE MODE
          const mergedProgress: Record<string, WordProgress> = { ...this.getWordProgress() };
          for (const [key, inc] of Object.entries(data.wordProgress || {})) {
            const cur = mergedProgress[key];
            if (!cur || inc.lastSeen > cur.lastSeen || (inc.lastSeen === cur.lastSeen && inc.seenCount > cur.seenCount)) {
              mergedProgress[key] = inc;
            }
          }
          this.progressCache = mergedProgress;
          localStorage.setItem(STORAGE_KEYS.WORD_PROGRESS, JSON.stringify(mergedProgress));

          if (normalizedIncomingQuizzes.length > 0) {
            const quizMap = new Map<string, CustomQuiz>();
            for (const q of this.getCustomQuizzes()) quizMap.set(q.id, q);
            for (const q of normalizedIncomingQuizzes) {
              const prev = quizMap.get(q.id);
              if (!prev) {
                quizMap.set(q.id, q);
              } else {
                const prevTs = Date.parse(prev.updated_at || prev.created_at || '0') || 0;
                const incTs = Date.parse(q.updated_at || q.created_at || '0') || 0;
                if (incTs >= prevTs) quizMap.set(q.id, q);
              }
            }
            const mergedQuizzes = Array.from(quizMap.values());
            this.customQuizMutationVersion += 1;
            this.customQuizzesCache = mergedQuizzes;
            try {
              localStorage.setItem(STORAGE_KEYS.CUSTOM_QUIZZES, JSON.stringify(mergedQuizzes));
            } catch {
              // Persist in IndexedDB if localStorage is full
            }
            void idbSet('custom_quizzes', mergedQuizzes);
          }

          if (Array.isArray(data.customSubjects) && data.customSubjects.length > 0) {
            const subMap = new Map<string, CustomSubject>();
            for (const s of this.getCustomSubjects()) subMap.set(s.id, s);
            for (const s of data.customSubjects) {
              if (!subMap.has(s.id)) subMap.set(s.id, s);
            }
            const mergedSubjects = Array.from(subMap.values());
            this.customSubjectsCache = mergedSubjects;
            localStorage.setItem(STORAGE_KEYS.CUSTOM_SUBJECTS, JSON.stringify(mergedSubjects));
          }

          if (data.dailyStats) {
            const curDaily = this.getDailyStats();
            if (
              data.dailyStats.date === curDaily.date &&
              data.dailyStats.wordsLearned + data.dailyStats.wordsDrilled + data.dailyStats.wordsExamined >
                curDaily.wordsLearned + curDaily.wordsDrilled + curDaily.wordsExamined
            ) {
              localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(data.dailyStats));
            }
          }

          const mergedHistoryMap = new Map<string, DailyStats>();
          for (const d of this.getStoredDailyHistory()) {
            mergedHistoryMap.set(d.date, d);
          }
          for (const d of data.dailyHistory || []) {
            const prev = mergedHistoryMap.get(d.date);
            const incTotal = d.wordsLearned + d.wordsDrilled + d.wordsExamined;
            const prevTotal = prev ? prev.wordsLearned + prev.wordsDrilled + prev.wordsExamined : -1;
            if (!prev || incTotal > prevTotal) {
              mergedHistoryMap.set(d.date, d);
            }
          }
          if (data.dailyStats) {
            const prev = mergedHistoryMap.get(data.dailyStats.date);
            const incTotal =
              data.dailyStats.wordsLearned + data.dailyStats.wordsDrilled + data.dailyStats.wordsExamined;
            const prevTotal = prev ? prev.wordsLearned + prev.wordsDrilled + prev.wordsExamined : -1;
            if (!prev || incTotal > prevTotal) {
              mergedHistoryMap.set(data.dailyStats.date, data.dailyStats);
            }
          }
          const finalHistory = Array.from(mergedHistoryMap.values())
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-30);
          localStorage.setItem(STORAGE_KEYS.DAILY_HISTORY, JSON.stringify(finalHistory));

          if (typeof data.streak === 'number') {
            const nextStreak = Math.max(this.getStreak(), data.streak);
            localStorage.setItem(STORAGE_KEYS.STREAK, nextStreak.toString());
          }

          if (data.selectedQuiz && !this.hasExplicitSelectedQuiz()) {
            localStorage.setItem(STORAGE_KEYS.SELECTED_QUIZ, data.selectedQuiz);
          }

          if (Array.isArray(data.examHistory) && data.examHistory.length > 0) {
            const examMap = new Map<string, ExamRecord>();
            for (const ex of this.getExamHistory()) examMap.set(ex.id, ex);
            for (const ex of data.examHistory) {
              if (!examMap.has(ex.id)) examMap.set(ex.id, ex);
            }
            const mergedExams = Array.from(examMap.values())
              .sort((a, b) => b.date - a.date)
              .slice(0, 50);
            localStorage.setItem(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(mergedExams));
          }

          if (Array.isArray(data.bookmarks) && data.bookmarks.length > 0) {
            const mergedBookmarks = Array.from(
              new Set([...this.getBookmarks(), ...data.bookmarks])
            );
            this.bookmarksCache = mergedBookmarks;
            localStorage.setItem(
              STORAGE_KEYS.BOOKMARKED_QUESTIONS,
              JSON.stringify(mergedBookmarks)
            );
          }
        }
      } catch (e) {
        console.error('Failed to write restored backup data to storage:', e);
        return {
          success: false,
          message: 'Không thể lưu dữ liệu khôi phục do bộ nhớ trình duyệt đã đầy hoặc bị chặn.',
        };
      }

      const restoredWordCount = Object.keys(data.wordProgress || {}).length;
      window.dispatchEvent(new CustomEvent('ananquiz:stats-updated'));
      window.dispatchEvent(new CustomEvent('ananquiz:bookmarks-updated'));

      return {
        success: true,
        message:
          mode === 'merge'
            ? `Hợp nhất thông minh thành công (${restoredWordCount} câu SRS từ bản sao lưu)!`
            : `Khôi phục (ghi đè) thành công ${restoredWordCount} câu hỏi ghi nhớ, streak và toàn bộ lịch sử!`,
        restoredCount: restoredWordCount,
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Lỗi khi đọc file JSON: ' + (err?.message || 'File không hợp lệ.'),
      };
    }
  }

  // ---- BOOKMARKS / FLAGGED QUESTIONS ----
  public static getBookmarks(): string[] {
    if (typeof window === 'undefined') return [];
    this.ensureStorageListener();
    if (this.bookmarksCache !== null) {
      return this.bookmarksCache;
    }
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKMARKED_QUESTIONS);
      const parsed: string[] = data ? JSON.parse(data) : [];
      this.bookmarksCache = parsed;
      return parsed;
    } catch (e) {
      console.error('Failed to read bookmarks:', e);
      return [];
    }
  }

  public static isBookmarked(questionId: string): boolean {
    if (!questionId) return false;
    const list = this.getBookmarks();
    return list.includes(questionId);
  }

  public static toggleBookmark(questionId: string): boolean {
    if (typeof window === 'undefined' || !questionId) return false;
    const list = this.getBookmarks();
    const idx = list.indexOf(questionId);
    let updated: string[];
    let isAdded = false;
    if (idx !== -1) {
      updated = list.filter((id) => id !== questionId);
    } else {
      updated = [...list, questionId];
      isAdded = true;
    }
    this.bookmarksCache = updated;
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKMARKED_QUESTIONS, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent('ananquiz:bookmarks-updated', { detail: { id: questionId, isAdded } })
      );
      return isAdded;
    } catch (e) {
      console.error('Failed to toggle bookmark:', e);
      return isAdded;
    }
  }
}
