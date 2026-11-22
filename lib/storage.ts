/**
 * Local-First Storage & IndexedDB Durable Mirror Engine
 * Works out-of-the-box offline with bidirectional IndexedDB mirroring to protect
 * SRS progress, exam history, bookmarks, custom subjects, and custom quizzes
 * even when browser localStorage hits its ~5MB quota.
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

export interface StorageHealthInfo {
  usedBytes: number;
  estimatedQuotaBytes: number;
  percentUsed: number;
  customQuizzesCount: number;
  progressCount: number;
  idbSupported: boolean;
  localStorageFullWarning: boolean;
}

export type ProgressItemTarget = {
  id?: string | number;
  question?: string;
  word?: string;
  options?: string[];
  correctWord?: string;
  answer?: string;
};

const ESTIMATED_LOCAL_QUOTA_BYTES = 5 * 1024 * 1024;
const MAX_TOMBSTONES = 200;

const STORAGE_KEYS = {
  WORD_PROGRESS: 'ananquiz_word_progress',
  CUSTOM_QUIZZES: 'ananquiz_custom_quizzes',
  DELETED_QUIZ_IDS: 'ananquiz_deleted_quiz_ids',
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
  PROGRESS_RESET_AT: 'ananquiz_progress_reset_at',
};

const IDB_KEYS = {
  CUSTOM_QUIZZES: 'custom_quizzes',
  DELETED_QUIZ_IDS: 'deleted_quiz_ids',
  WORD_PROGRESS: 'word_progress',
  CUSTOM_SUBJECTS: 'custom_subjects',
  EXAM_HISTORY: 'exam_history',
  BOOKMARKS: 'bookmarks',
  DAILY_HISTORY: 'daily_history',
  PROGRESS_RESET_AT: 'progress_reset_at',
};

function parseTimestamp(value?: string): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

export class StorageEngine {
  private static progressCache: Record<string, WordProgress> | null = null;
  private static customQuizzesCache: CustomQuiz[] | null = null;
  private static customSubjectsCache: CustomSubject[] | null = null;
  private static bookmarksCache: string[] | null = null;
  private static examHistoryCache: ExamRecord[] | null = null;
  private static dailyHistoryCache: DailyStats[] | null = null;
  private static deletedQuizIdsCache: Record<string, number> | null = null;

  private static storageListenerBound = false;
  private static idbHydrationPromise: Promise<void> | null = null;
  private static customQuizMutationVersion = 0;
  private static progressMutationVersion = 0;
  private static localStorageDegraded = false;

  /**
   * Clears in-memory caches and hydration guard (useful across tests or full reloads).
   */
  public static clearMemoryCaches(): void {
    this.progressCache = null;
    this.customQuizzesCache = null;
    this.customSubjectsCache = null;
    this.bookmarksCache = null;
    this.examHistoryCache = null;
    this.dailyHistoryCache = null;
    this.deletedQuizIdsCache = null;
    this.idbHydrationPromise = null;
    this.localStorageDegraded = false;
  }

  private static safeSetLocalStorage(key: string, jsonStr: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(key, jsonStr);
      return true;
    } catch {
      this.localStorageDegraded = true;
      if (key !== STORAGE_KEYS.CUSTOM_QUIZZES) {
        try {
          // Evict large custom quizzes copy from localStorage since IndexedDB keeps the full durable list
          localStorage.removeItem(STORAGE_KEYS.CUSTOM_QUIZZES);
          localStorage.setItem(key, jsonStr);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

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
        if (!e.key || e.key === STORAGE_KEYS.DELETED_QUIZ_IDS) {
          this.deletedQuizIdsCache = null;
        }
        if (!e.key || e.key === STORAGE_KEYS.CUSTOM_SUBJECTS) {
          this.customSubjectsCache = null;
        }
        if (!e.key || e.key === STORAGE_KEYS.EXAM_HISTORY) {
          this.examHistoryCache = null;
        }
        if (!e.key || e.key === STORAGE_KEYS.DAILY_HISTORY) {
          this.dailyHistoryCache = null;
        }
        if (!e.key || e.key === STORAGE_KEYS.BOOKMARKED_QUESTIONS) {
          this.bookmarksCache = null;
        }
      });
    }
    void this.hydrateFromIdb();
  }

  private static getDeletedQuizIds(): Record<string, number> {
    if (typeof window === 'undefined') return {};
    if (this.deletedQuizIdsCache !== null) {
      return this.deletedQuizIdsCache;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_QUIZ_IDS);
      if (!raw) {
        this.deletedQuizIdsCache = {};
        return {};
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const clean: Record<string, number> = {};
      if (parsed && typeof parsed === 'object') {
        for (const [id, ts] of Object.entries(parsed)) {
          if (typeof ts === 'number' && Number.isFinite(ts) && ts > 0) {
            clean[id] = ts;
          }
        }
      }
      this.deletedQuizIdsCache = clean;
      return clean;
    } catch {
      this.deletedQuizIdsCache = {};
      return {};
    }
  }

  private static saveDeletedQuizIds(
    map: Record<string, number>,
    mirrorToIdb = true
  ): Record<string, number> {
    const trimmedEntries = Object.entries(map)
      .filter(([, ts]) => typeof ts === 'number' && Number.isFinite(ts) && ts > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TOMBSTONES);
    const trimmed = Object.fromEntries(trimmedEntries);
    this.deletedQuizIdsCache = trimmed;

    if (typeof window !== 'undefined') {
      this.safeSetLocalStorage(STORAGE_KEYS.DELETED_QUIZ_IDS, JSON.stringify(trimmed));
      if (mirrorToIdb) {
        void idbSet(IDB_KEYS.DELETED_QUIZ_IDS, trimmed);
      }
    }
    return trimmed;
  }

  private static getProgressResetAt(): number {
    if (typeof window === 'undefined') return 0;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS_RESET_AT);
      const val = raw ? Number(raw) : 0;
      return Number.isFinite(val) && val > 0 ? val : 0;
    } catch {
      return 0;
    }
  }

  private static readLocalJson<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  public static hydrateFromIdb(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (this.idbHydrationPromise) return this.idbHydrationPromise;

    const startQuizVer = this.customQuizMutationVersion;
    const startProgressVer = this.progressMutationVersion;

    this.idbHydrationPromise = (async () => {
      try {
        const [
          idbQuizzes,
          idbDeletedQuizIds,
          idbWordProgress,
          idbCustomSubjects,
          idbExamHistory,
          idbBookmarks,
          idbDailyHistory,
          idbResetAtRaw,
        ] = await Promise.all([
          idbGet<CustomQuiz[]>(IDB_KEYS.CUSTOM_QUIZZES),
          idbGet<Record<string, number>>(IDB_KEYS.DELETED_QUIZ_IDS),
          idbGet<Record<string, WordProgress>>(IDB_KEYS.WORD_PROGRESS),
          idbGet<CustomSubject[]>(IDB_KEYS.CUSTOM_SUBJECTS),
          idbGet<ExamRecord[]>(IDB_KEYS.EXAM_HISTORY),
          idbGet<string[]>(IDB_KEYS.BOOKMARKS),
          idbGet<DailyStats[]>(IDB_KEYS.DAILY_HISTORY),
          idbGet<number>(IDB_KEYS.PROGRESS_RESET_AT),
        ]);

        let statsChanged = false;
        let bookmarksChanged = false;

        // 0. Resolve authoritative reset timestamp
        const localResetAt = this.getProgressResetAt();
        const idbResetAt =
          typeof idbResetAtRaw === 'number' && Number.isFinite(idbResetAtRaw)
            ? idbResetAtRaw
            : 0;
        const effectiveResetAt = Math.max(localResetAt, idbResetAt);
        if (effectiveResetAt > localResetAt) {
          this.safeSetLocalStorage(STORAGE_KEYS.PROGRESS_RESET_AT, String(effectiveResetAt));
        } else if (effectiveResetAt > idbResetAt) {
          void idbSet(IDB_KEYS.PROGRESS_RESET_AT, effectiveResetAt);
        }

        // 1. Merge deleted quiz tombstones & custom quizzes (respecting tombstone timestamps)
        if (this.customQuizMutationVersion === startQuizVer) {
          const localDeleted = this.getDeletedQuizIds();
          const mergedDeleted: Record<string, number> = { ...localDeleted };
          if (idbDeletedQuizIds && typeof idbDeletedQuizIds === 'object') {
            for (const [qId, ts] of Object.entries(idbDeletedQuizIds)) {
              if (typeof ts === 'number' && Number.isFinite(ts) && ts > (mergedDeleted[qId] || 0)) {
                mergedDeleted[qId] = ts;
              }
            }
          }
          const finalDeleted = this.saveDeletedQuizIds(mergedDeleted, false);
          if (Object.keys(finalDeleted).length > 0) {
            void idbSet(IDB_KEYS.DELETED_QUIZ_IDS, finalDeleted);
          }

          const localQuizzes = this.readLocalJson<CustomQuiz[]>(STORAGE_KEYS.CUSTOM_QUIZZES, []);
          const mergedQuizMap = new Map<string, CustomQuiz>();

          const upsertQuiz = (q: CustomQuiz | null | undefined) => {
            if (!q || !q.id) return;
            const quizTs = parseTimestamp(q.updated_at || q.created_at);
            const deletedAt = finalDeleted[q.id] || 0;
            if (deletedAt > quizTs) return;

            const prev = mergedQuizMap.get(q.id);
            if (!prev) {
              mergedQuizMap.set(q.id, q);
            } else {
              const prevTs = parseTimestamp(prev.updated_at || prev.created_at);
              if (quizTs >= prevTs) {
                mergedQuizMap.set(q.id, q);
              }
            }
          };

          if (Array.isArray(idbQuizzes)) idbQuizzes.forEach(upsertQuiz);
          if (Array.isArray(localQuizzes)) localQuizzes.forEach(upsertQuiz);

          const mergedQuizzes = Array.from(mergedQuizMap.values()).sort(
            (a, b) => parseTimestamp(b.created_at) - parseTimestamp(a.created_at)
          );

          if (
            (!Array.isArray(idbQuizzes) || idbQuizzes.length === 0) &&
            mergedQuizzes.length > 0
          ) {
            await idbSet(IDB_KEYS.CUSTOM_QUIZZES, mergedQuizzes);
          } else if (
            Array.isArray(idbQuizzes) &&
            (mergedQuizzes.length !== idbQuizzes.length ||
              mergedQuizzes.some(
                (q, idx) =>
                  q.id !== idbQuizzes[idx]?.id ||
                  q.updated_at !== idbQuizzes[idx]?.updated_at
              ))
          ) {
            await idbSet(IDB_KEYS.CUSTOM_QUIZZES, mergedQuizzes);
          }

          const quizzesChanged =
            mergedQuizzes.length !== localQuizzes.length ||
            mergedQuizzes.some(
              (item, idx) =>
                item.id !== localQuizzes[idx]?.id ||
                item.updated_at !== localQuizzes[idx]?.updated_at
            );

          if (quizzesChanged) {
            this.customQuizzesCache = mergedQuizzes;
            this.safeSetLocalStorage(STORAGE_KEYS.CUSTOM_QUIZZES, JSON.stringify(mergedQuizzes));
            statsChanged = true;
          }
        }

        // 2. Merge wordProgress (skipping entries older than effectiveResetAt)
        if (this.progressMutationVersion === startProgressVer) {
          const localProgress = this.readLocalJson<Record<string, WordProgress>>(
            STORAGE_KEYS.WORD_PROGRESS,
            {}
          );
          const mergedProgress: Record<string, WordProgress> = {};

          const absorbProgress = (source: Record<string, WordProgress> | null | undefined) => {
            if (!source || typeof source !== 'object') return;
            for (const [k, item] of Object.entries(source)) {
              if (!item || typeof item.lastSeen !== 'number') continue;
              if (effectiveResetAt > 0 && item.lastSeen < effectiveResetAt) continue;
              const prev = mergedProgress[k];
              if (
                !prev ||
                item.lastSeen > prev.lastSeen ||
                (item.lastSeen === prev.lastSeen && (item.seenCount || 0) > (prev.seenCount || 0))
              ) {
                mergedProgress[k] = item;
              }
            }
          };

          absorbProgress(idbWordProgress);
          absorbProgress(localProgress);

          const mergedCount = Object.keys(mergedProgress).length;
          const localCount = Object.keys(localProgress).length;
          const progressChanged =
            mergedCount !== localCount ||
            Object.entries(mergedProgress).some(
              ([k, v]) =>
                !localProgress[k] ||
                v.lastSeen !== localProgress[k].lastSeen ||
                v.seenCount !== localProgress[k].seenCount
            );

          if (mergedCount > 0 && (!idbWordProgress || Object.keys(idbWordProgress).length !== mergedCount)) {
            void idbSet(IDB_KEYS.WORD_PROGRESS, mergedProgress);
          }

          if (progressChanged) {
            this.progressCache = mergedProgress;
            this.safeSetLocalStorage(STORAGE_KEYS.WORD_PROGRESS, JSON.stringify(mergedProgress));
            statsChanged = true;
          }

          // 3. Merge examHistory
          const localExams = this.readLocalJson<ExamRecord[]>(STORAGE_KEYS.EXAM_HISTORY, []);
          const examMap = new Map<string, ExamRecord>();
          const absorbExams = (list: ExamRecord[] | null | undefined) => {
            if (!Array.isArray(list)) return;
            for (const ex of list) {
              if (!ex || !ex.id) continue;
              if (effectiveResetAt > 0 && (ex.date || 0) < effectiveResetAt) continue;
              if (!examMap.has(ex.id)) examMap.set(ex.id, ex);
            }
          };
          absorbExams(idbExamHistory);
          absorbExams(localExams);

          const mergedExams = Array.from(examMap.values())
            .sort((a, b) => (b.date || 0) - (a.date || 0))
            .slice(0, 50);

          if (mergedExams.length !== (Array.isArray(idbExamHistory) ? idbExamHistory.length : 0)) {
            void idbSet(IDB_KEYS.EXAM_HISTORY, mergedExams);
          }
          if (
            mergedExams.length !== localExams.length ||
            mergedExams.some((ex, i) => ex.id !== localExams[i]?.id)
          ) {
            this.examHistoryCache = mergedExams;
            this.safeSetLocalStorage(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(mergedExams));
            statsChanged = true;
          }

          // 4. Merge dailyHistory (ignoring entries if reset happened today)
          const localDaily = this.readLocalJson<DailyStats[]>(STORAGE_KEYS.DAILY_HISTORY, []);
          const dailyMap = new Map<string, DailyStats>();
          const resetDateStr = effectiveResetAt > 0 ? this.formatLocalDate(new Date(effectiveResetAt)) : '';
          const absorbDaily = (list: DailyStats[] | null | undefined) => {
            if (!Array.isArray(list)) return;
            for (const d of list) {
              if (!d || typeof d.date !== 'string') continue;
              if (resetDateStr && d.date < resetDateStr) continue;
              const prev = dailyMap.get(d.date);
              const dTotal = (d.wordsLearned || 0) + (d.wordsDrilled || 0) + (d.wordsExamined || 0);
              const prevTotal = prev
                ? (prev.wordsLearned || 0) + (prev.wordsDrilled || 0) + (prev.wordsExamined || 0)
                : -1;
              if (!prev || dTotal > prevTotal) {
                dailyMap.set(d.date, d);
              }
            }
          };
          absorbDaily(idbDailyHistory);
          absorbDaily(localDaily);

          const mergedDaily = Array.from(dailyMap.values())
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-30);

          if (mergedDaily.length !== (Array.isArray(idbDailyHistory) ? idbDailyHistory.length : 0)) {
            void idbSet(IDB_KEYS.DAILY_HISTORY, mergedDaily);
          }
          if (
            mergedDaily.length !== localDaily.length ||
            mergedDaily.some((d, i) => d.date !== localDaily[i]?.date)
          ) {
            this.dailyHistoryCache = mergedDaily;
            this.safeSetLocalStorage(STORAGE_KEYS.DAILY_HISTORY, JSON.stringify(mergedDaily));
            statsChanged = true;
          }
        }

        // 5. Merge customSubjects
        const localSubjects = this.readLocalJson<CustomSubject[]>(STORAGE_KEYS.CUSTOM_SUBJECTS, []);
        const subMap = new Map<string, CustomSubject>();
        if (Array.isArray(idbCustomSubjects)) {
          for (const s of idbCustomSubjects) if (s?.id) subMap.set(s.id, s);
        }
        if (Array.isArray(localSubjects)) {
          for (const s of localSubjects) if (s?.id) subMap.set(s.id, s);
        }
        const mergedSubjects = Array.from(subMap.values());
        if (mergedSubjects.length !== (Array.isArray(idbCustomSubjects) ? idbCustomSubjects.length : 0)) {
          void idbSet(IDB_KEYS.CUSTOM_SUBJECTS, mergedSubjects);
        }
        if (mergedSubjects.length !== localSubjects.length) {
          this.customSubjectsCache = mergedSubjects;
          this.safeSetLocalStorage(STORAGE_KEYS.CUSTOM_SUBJECTS, JSON.stringify(mergedSubjects));
          statsChanged = true;
        }

        // 6. Merge bookmarks
        const localBookmarks = this.readLocalJson<string[]>(STORAGE_KEYS.BOOKMARKED_QUESTIONS, []);
        const bookmarkSet = new Set<string>();
        if (Array.isArray(idbBookmarks)) idbBookmarks.forEach((b) => b && bookmarkSet.add(b));
        if (Array.isArray(localBookmarks)) localBookmarks.forEach((b) => b && bookmarkSet.add(b));
        const mergedBookmarks = Array.from(bookmarkSet);
        if (mergedBookmarks.length !== (Array.isArray(idbBookmarks) ? idbBookmarks.length : 0)) {
          void idbSet(IDB_KEYS.BOOKMARKS, mergedBookmarks);
        }
        if (mergedBookmarks.length !== localBookmarks.length) {
          this.bookmarksCache = mergedBookmarks;
          this.safeSetLocalStorage(
            STORAGE_KEYS.BOOKMARKED_QUESTIONS,
            JSON.stringify(mergedBookmarks)
          );
          bookmarksChanged = true;
        }

        if (statsChanged) {
          window.dispatchEvent(new CustomEvent('ananquiz:stats-updated'));
        }
        if (bookmarksChanged) {
          window.dispatchEvent(new CustomEvent('ananquiz:bookmarks-updated'));
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
    item: ProgressItemTarget,
    allProgress?: Record<string, WordProgress>
  ): WordProgress | null {
    const map = allProgress || this.getWordProgress();
    const key = getQuestionKey(item);
    const idKey = item.id !== undefined ? String(item.id) : '';
    return (
      map[key] ||
      (idKey ? map[idKey] : null) ||
      (item.word ? map[item.word] : null) ||
      (item.correctWord ? map[item.correctWord] : null) ||
      null
    );
  }

  /**
   * Only used in LearnMode/DrillMode/MistakesMode where the learner actively recalls.
   * Calculates Ease Factor and Spaced Interval according to SuperMemo SM-2.
   */
  public static updateWordProgress(
    target: string | ProgressItemTarget,
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
    this.progressMutationVersion += 1;
    this.progressCache = allProgress;

    if (typeof window !== 'undefined') {
      this.safeSetLocalStorage(STORAGE_KEYS.WORD_PROGRESS, JSON.stringify(allProgress));
      void idbSet(IDB_KEYS.WORD_PROGRESS, allProgress);
    }

    // Update daily stats
    this.recordActivity(quality >= 3 ? 'learn' : 'mistake');
    return updated;
  }

  /**
   * Records a wrong answer without distorting SM-2 easeFactor / intervalDays on exam guesses.
   */
  public static recordMistakeOnly(target: string | ProgressItemTarget): void {
    const key = typeof target === 'string' ? target : getQuestionKey(target);
    const allProgress = { ...this.getWordProgress() };
    const prev = allProgress[key];
    const now = Date.now();
    const existing: WordProgress = prev
      ? { ...prev }
      : {
          word: key,
          strength: 0,
          lastSeen: now,
          nextDue: now,
          seenCount: 0,
          wrongStreak: 0,
          status: 'learning',
          intervalDays: 0,
          easeFactor: 2.5,
          mistakesCount: 0,
        };

    existing.mistakesCount = (existing.mistakesCount || 0) + 1;
    existing.lastSeen = now;
    existing.lastMistakeTime = now;
    existing.wrongStreak = (existing.wrongStreak || 0) + 1;
    if (existing.strength > 0) {
      existing.strength = Math.max(
        0.1,
        Math.round((existing.strength - 0.2) * 1000) / 1000
      );
    }
    if (existing.status === 'mastered') {
      existing.status = 'learning';
    }

    allProgress[key] = existing;
    this.progressMutationVersion += 1;
    this.progressCache = allProgress;

    if (typeof window !== 'undefined') {
      this.safeSetLocalStorage(STORAGE_KEYS.WORD_PROGRESS, JSON.stringify(allProgress));
      void idbSet(IDB_KEYS.WORD_PROGRESS, allProgress);
      window.dispatchEvent(new CustomEvent('ananquiz:stats-updated'));
    }
  }

  // ---- EXAM HISTORY ----
  public static getExamHistory(): ExamRecord[] {
    if (typeof window === 'undefined') return [];
    this.ensureStorageListener();
    if (this.examHistoryCache !== null) {
      return this.examHistoryCache;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EXAM_HISTORY);
      const parsed: ExamRecord[] = raw ? JSON.parse(raw) : [];
      this.examHistoryCache = parsed;
      return parsed;
    } catch {
      return [];
    }
  }

  public static recordExamResult(result: Omit<ExamRecord, 'id'>): void {
    const history = [...this.getExamHistory()];
    const newRecord: ExamRecord = {
      ...result,
      id: `exam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    history.unshift(newRecord);
    const trimmed = history.slice(0, 50);
    this.progressMutationVersion += 1;
    this.examHistoryCache = trimmed;

    if (typeof window !== 'undefined') {
      this.safeSetLocalStorage(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(trimmed));
      void idbSet(IDB_KEYS.EXAM_HISTORY, trimmed);
      window.dispatchEvent(new CustomEvent('ananquiz:stats-updated'));
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
    if (this.dailyHistoryCache !== null) {
      return this.dailyHistoryCache;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DAILY_HISTORY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [];
      this.dailyHistoryCache = list;
      return list;
    } catch {
      return [];
    }
  }

  public static getDailyHistory(days = 14): DailyStats[] {
    this.ensureStorageListener();
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

    this.safeSetLocalStorage(STORAGE_KEYS.DAILY_STATS, JSON.stringify(stats));

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

    this.progressMutationVersion += 1;
    this.dailyHistoryCache = sortedHistory;
    this.safeSetLocalStorage(STORAGE_KEYS.DAILY_HISTORY, JSON.stringify(sortedHistory));
    void idbSet(IDB_KEYS.DAILY_HISTORY, sortedHistory);

    this.updateStreak();
    window.dispatchEvent(new CustomEvent('ananquiz:stats-updated'));
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

    this.safeSetLocalStorage(STORAGE_KEYS.STREAK, currentStreak.toString());
    this.safeSetLocalStorage(STORAGE_KEYS.LAST_ACTIVE_DATE, today);
    window.dispatchEvent(new CustomEvent('ananquiz:stats-updated'));
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

    const deleted = { ...this.getDeletedQuizIds() };
    if (deleted[newQuiz.id] !== undefined) {
      delete deleted[newQuiz.id];
      this.saveDeletedQuizIds(deleted);
    }

    list.unshift(newQuiz);
    this.customQuizMutationVersion += 1;
    this.customQuizzesCache = list;
    if (typeof window !== 'undefined') {
      this.safeSetLocalStorage(STORAGE_KEYS.CUSTOM_QUIZZES, JSON.stringify(list));
      void idbSet(IDB_KEYS.CUSTOM_QUIZZES, list);
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

    const deleted = { ...this.getDeletedQuizIds() };
    if (deleted[id] !== undefined) {
      delete deleted[id];
      this.saveDeletedQuizIds(deleted);
    }

    const updated: CustomQuiz = {
      ...list[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    list[index] = updated;
    this.customQuizMutationVersion += 1;
    this.customQuizzesCache = list;

    if (typeof window !== 'undefined') {
      this.safeSetLocalStorage(STORAGE_KEYS.CUSTOM_QUIZZES, JSON.stringify(list));
      void idbSet(IDB_KEYS.CUSTOM_QUIZZES, list);
      window.dispatchEvent(new CustomEvent('ananquiz:stats-updated'));
    }
    return updated;
  }

  public static deleteCustomQuiz(id: string): void {
    const list = this.getCustomQuizzes().filter((q) => q.id !== id);
    const deleted = { ...this.getDeletedQuizIds(), [id]: Date.now() };

    this.customQuizMutationVersion += 1;
    this.customQuizzesCache = list;
    this.saveDeletedQuizIds(deleted);

    if (typeof window !== 'undefined') {
      this.safeSetLocalStorage(STORAGE_KEYS.CUSTOM_QUIZZES, JSON.stringify(list));
      void idbSet(IDB_KEYS.CUSTOM_QUIZZES, list);
      if (this.getActiveCustomQuizId() === id) {
        this.setActiveCustomQuizId(null);
      }
      window.dispatchEvent(new CustomEvent('ananquiz:stats-updated'));
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
      this.safeSetLocalStorage(STORAGE_KEYS.CUSTOM_SUBJECTS, JSON.stringify(list));
      void idbSet(IDB_KEYS.CUSTOM_SUBJECTS, list);
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
      this.safeSetLocalStorage(STORAGE_KEYS.CUSTOM_SUBJECTS, JSON.stringify(list));
      void idbSet(IDB_KEYS.CUSTOM_SUBJECTS, list);
    }
    return list[index];
  }

  public static deleteCustomSubject(id: string): void {
    const list = this.getCustomSubjects().filter((s) => s.id !== id);
    this.customSubjectsCache = list;
    if (typeof window !== 'undefined') {
      this.safeSetLocalStorage(STORAGE_KEYS.CUSTOM_SUBJECTS, JSON.stringify(list));
      void idbSet(IDB_KEYS.CUSTOM_SUBJECTS, list);
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
      this.safeSetLocalStorage(STORAGE_KEYS.SELECTED_QUIZ, path);
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
   * Ensures IndexedDB hydration settles before building a backup payload so large custom quizzes are never missed.
   */
  public static async exportAllDataAsync(options?: {
    excludeCustomQuizzes?: boolean;
  }): Promise<string> {
    await this.hydrateFromIdb();
    return this.exportAllData(options);
  }

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

      if (mode === 'overwrite') {
        this.saveDeletedQuizIds({});

        if (data.wordProgress) {
          this.progressMutationVersion += 1;
          this.progressCache = data.wordProgress;
          this.safeSetLocalStorage(STORAGE_KEYS.WORD_PROGRESS, JSON.stringify(data.wordProgress));
          void idbSet(IDB_KEYS.WORD_PROGRESS, data.wordProgress);
        }
        if (data.customQuizzes) {
          this.customQuizMutationVersion += 1;
          this.customQuizzesCache = normalizedIncomingQuizzes;
          this.safeSetLocalStorage(
            STORAGE_KEYS.CUSTOM_QUIZZES,
            JSON.stringify(normalizedIncomingQuizzes)
          );
          void idbSet(IDB_KEYS.CUSTOM_QUIZZES, normalizedIncomingQuizzes);
        }
        if (data.customSubjects) {
          this.customSubjectsCache = data.customSubjects;
          this.safeSetLocalStorage(
            STORAGE_KEYS.CUSTOM_SUBJECTS,
            JSON.stringify(data.customSubjects)
          );
          void idbSet(IDB_KEYS.CUSTOM_SUBJECTS, data.customSubjects);
        }
        if (data.dailyStats) {
          this.safeSetLocalStorage(STORAGE_KEYS.DAILY_STATS, JSON.stringify(data.dailyStats));
        }
        if (data.dailyHistory) {
          const trimmedDaily = data.dailyHistory.slice(-30);
          this.dailyHistoryCache = trimmedDaily;
          this.safeSetLocalStorage(STORAGE_KEYS.DAILY_HISTORY, JSON.stringify(trimmedDaily));
          void idbSet(IDB_KEYS.DAILY_HISTORY, trimmedDaily);
        }
        if (typeof data.streak === 'number') {
          this.safeSetLocalStorage(STORAGE_KEYS.STREAK, data.streak.toString());
        }
        if (data.selectedQuiz) {
          this.safeSetLocalStorage(STORAGE_KEYS.SELECTED_QUIZ, data.selectedQuiz);
        }
        if (data.examHistory) {
          this.examHistoryCache = data.examHistory;
          this.safeSetLocalStorage(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(data.examHistory));
          void idbSet(IDB_KEYS.EXAM_HISTORY, data.examHistory);
        }
        if (data.bookmarks) {
          this.bookmarksCache = data.bookmarks;
          this.safeSetLocalStorage(
            STORAGE_KEYS.BOOKMARKED_QUESTIONS,
            JSON.stringify(data.bookmarks)
          );
          void idbSet(IDB_KEYS.BOOKMARKS, data.bookmarks);
        }
      } else {
        // SMART MERGE MODE
        const mergedProgress: Record<string, WordProgress> = { ...this.getWordProgress() };
        for (const [key, inc] of Object.entries(data.wordProgress || {})) {
          const cur = mergedProgress[key];
          if (
            !cur ||
            inc.lastSeen > cur.lastSeen ||
            (inc.lastSeen === cur.lastSeen && inc.seenCount > cur.seenCount)
          ) {
            mergedProgress[key] = inc;
          }
        }
        this.progressMutationVersion += 1;
        this.progressCache = mergedProgress;
        this.safeSetLocalStorage(STORAGE_KEYS.WORD_PROGRESS, JSON.stringify(mergedProgress));
        void idbSet(IDB_KEYS.WORD_PROGRESS, mergedProgress);

        if (normalizedIncomingQuizzes.length > 0) {
          const tombstones = this.getDeletedQuizIds();
          const quizMap = new Map<string, CustomQuiz>();
          for (const q of this.getCustomQuizzes()) quizMap.set(q.id, q);
          for (const q of normalizedIncomingQuizzes) {
            const incTs = parseTimestamp(q.updated_at || q.created_at);
            const deletedAt = tombstones[q.id] || 0;
            if (deletedAt > incTs) continue;

            const prev = quizMap.get(q.id);
            if (!prev) {
              quizMap.set(q.id, q);
            } else {
              const prevTs = parseTimestamp(prev.updated_at || prev.created_at);
              if (incTs >= prevTs) quizMap.set(q.id, q);
            }
          }
          const mergedQuizzes = Array.from(quizMap.values());
          this.customQuizMutationVersion += 1;
          this.customQuizzesCache = mergedQuizzes;
          this.safeSetLocalStorage(STORAGE_KEYS.CUSTOM_QUIZZES, JSON.stringify(mergedQuizzes));
          void idbSet(IDB_KEYS.CUSTOM_QUIZZES, mergedQuizzes);
        }

        if (Array.isArray(data.customSubjects) && data.customSubjects.length > 0) {
          const subMap = new Map<string, CustomSubject>();
          for (const s of this.getCustomSubjects()) subMap.set(s.id, s);
          for (const s of data.customSubjects) {
            if (!subMap.has(s.id)) subMap.set(s.id, s);
          }
          const mergedSubjects = Array.from(subMap.values());
          this.customSubjectsCache = mergedSubjects;
          this.safeSetLocalStorage(
            STORAGE_KEYS.CUSTOM_SUBJECTS,
            JSON.stringify(mergedSubjects)
          );
          void idbSet(IDB_KEYS.CUSTOM_SUBJECTS, mergedSubjects);
        }

        if (data.dailyStats) {
          const curDaily = this.getDailyStats();
          if (
            data.dailyStats.date === curDaily.date &&
            data.dailyStats.wordsLearned + data.dailyStats.wordsDrilled + data.dailyStats.wordsExamined >
              curDaily.wordsLearned + curDaily.wordsDrilled + curDaily.wordsExamined
          ) {
            this.safeSetLocalStorage(STORAGE_KEYS.DAILY_STATS, JSON.stringify(data.dailyStats));
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
            data.dailyStats.wordsLearned +
            data.dailyStats.wordsDrilled +
            data.dailyStats.wordsExamined;
          const prevTotal = prev ? prev.wordsLearned + prev.wordsDrilled + prev.wordsExamined : -1;
          if (!prev || incTotal > prevTotal) {
            mergedHistoryMap.set(data.dailyStats.date, data.dailyStats);
          }
        }
        const finalHistory = Array.from(mergedHistoryMap.values())
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-30);
        this.dailyHistoryCache = finalHistory;
        this.safeSetLocalStorage(STORAGE_KEYS.DAILY_HISTORY, JSON.stringify(finalHistory));
        void idbSet(IDB_KEYS.DAILY_HISTORY, finalHistory);

        if (typeof data.streak === 'number') {
          const nextStreak = Math.max(this.getStreak(), data.streak);
          this.safeSetLocalStorage(STORAGE_KEYS.STREAK, nextStreak.toString());
        }

        if (data.selectedQuiz && !this.hasExplicitSelectedQuiz()) {
          this.safeSetLocalStorage(STORAGE_KEYS.SELECTED_QUIZ, data.selectedQuiz);
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
          this.examHistoryCache = mergedExams;
          this.safeSetLocalStorage(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(mergedExams));
          void idbSet(IDB_KEYS.EXAM_HISTORY, mergedExams);
        }

        if (Array.isArray(data.bookmarks) && data.bookmarks.length > 0) {
          const mergedBookmarks = Array.from(
            new Set([...this.getBookmarks(), ...data.bookmarks])
          );
          this.bookmarksCache = mergedBookmarks;
          this.safeSetLocalStorage(
            STORAGE_KEYS.BOOKMARKED_QUESTIONS,
            JSON.stringify(mergedBookmarks)
          );
          void idbSet(IDB_KEYS.BOOKMARKS, mergedBookmarks);
        }
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

  /**
   * Ensures IndexedDB hydration settles before importing/merging and awaits durable IDB persistence.
   */
  public static async importAllDataAsync(
    jsonStr: string,
    options?: { mode?: 'merge' | 'overwrite' }
  ): Promise<{ success: boolean; message: string; restoredCount?: number }> {
    await this.hydrateFromIdb();
    const res = this.importAllData(jsonStr, options);
    if (!res.success || typeof window === 'undefined') {
      return res;
    }

    await Promise.all([
      idbSet(IDB_KEYS.WORD_PROGRESS, this.getWordProgress()),
      idbSet(IDB_KEYS.CUSTOM_QUIZZES, this.getCustomQuizzes()),
      idbSet(IDB_KEYS.CUSTOM_SUBJECTS, this.getCustomSubjects()),
      idbSet(IDB_KEYS.EXAM_HISTORY, this.getExamHistory()),
      idbSet(IDB_KEYS.BOOKMARKS, this.getBookmarks()),
      idbSet(IDB_KEYS.DAILY_HISTORY, this.getStoredDailyHistory()),
      idbSet(IDB_KEYS.DELETED_QUIZ_IDS, this.getDeletedQuizIds()),
    ]);

    return res;
  }

  /**
   * Resets all learning progress, daily stats, streak, and exam history consistently across both localStorage & IndexedDB,
   * while preserving custom quizzes, custom subjects, and bookmarks.
   */
  public static async resetLearningProgress(): Promise<void> {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    this.progressMutationVersion += 1;
    this.progressCache = {};
    this.examHistoryCache = [];
    this.dailyHistoryCache = [];

    try {
      localStorage.removeItem(STORAGE_KEYS.WORD_PROGRESS);
      localStorage.removeItem(STORAGE_KEYS.DAILY_STATS);
      localStorage.removeItem(STORAGE_KEYS.DAILY_HISTORY);
      localStorage.removeItem(STORAGE_KEYS.STREAK);
      localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVE_DATE);
      localStorage.removeItem(STORAGE_KEYS.EXAM_HISTORY);
      this.safeSetLocalStorage(STORAGE_KEYS.PROGRESS_RESET_AT, String(now));
    } catch {
      // Ignore storage access errors
    }

    await Promise.all([
      idbSet(IDB_KEYS.WORD_PROGRESS, {}),
      idbSet(IDB_KEYS.EXAM_HISTORY, []),
      idbSet(IDB_KEYS.DAILY_HISTORY, []),
      idbSet(IDB_KEYS.PROGRESS_RESET_AT, now),
    ]);

    window.dispatchEvent(new CustomEvent('ananquiz:stats-updated'));
  }

  /**
   * Estimates localStorage usage across all `ananquiz_*` keys + IndexedDB mirror health.
   */
  public static getStorageHealth(): StorageHealthInfo {
    const idbSupported = typeof indexedDB !== 'undefined';
    if (typeof window === 'undefined') {
      return {
        usedBytes: 0,
        estimatedQuotaBytes: ESTIMATED_LOCAL_QUOTA_BYTES,
        percentUsed: 0,
        customQuizzesCount: 0,
        progressCount: 0,
        idbSupported,
        localStorageFullWarning: false,
      };
    }

    let usedBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('ananquiz_')) continue;
        const val = localStorage.getItem(key) || '';
        usedBytes += (key.length + val.length) * 2;
      }
    } catch {
      // Ignore storage inspection errors
    }

    const percentUsed = Math.min(
      100,
      Math.round((usedBytes / ESTIMATED_LOCAL_QUOTA_BYTES) * 100)
    );
    const customQuizzesCount = this.getCustomQuizzes().length;
    const progressCount = Object.keys(this.getWordProgress()).length;

    return {
      usedBytes,
      estimatedQuotaBytes: ESTIMATED_LOCAL_QUOTA_BYTES,
      percentUsed,
      customQuizzesCount,
      progressCount,
      idbSupported,
      localStorageFullWarning: this.localStorageDegraded || percentUsed >= 85,
    };
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
    this.safeSetLocalStorage(STORAGE_KEYS.BOOKMARKED_QUESTIONS, JSON.stringify(updated));
    void idbSet(IDB_KEYS.BOOKMARKS, updated);
    window.dispatchEvent(
      new CustomEvent('ananquiz:bookmarks-updated', { detail: { id: questionId, isAdded } })
    );
    return isAdded;
  }
}
