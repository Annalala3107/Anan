/**
 * Local-First Storage & State Sync Engine
 * Works out-of-the-box in browser localStorage without requiring any cloud setup.
 * Supports transparent Supabase backend syncing when environment keys are provided.
 */

import { WordProgress, CustomQuiz, CustomSubject, DailyStats, Word } from './types';
import { SRSEngine } from './srs';
import { getQuestionKey } from './utils';
import { BackupDataSchema } from './schema';

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
  STREAK: 'ananquiz_streak',
  LAST_ACTIVE_DATE: 'ananquiz_last_active_date',
  SELECTED_QUIZ: 'ananquiz_selected_quiz',
  USER_PROFILE: 'ananquiz_user_profile',
  EXAM_HISTORY: 'ananquiz_exam_history',
};

export class StorageEngine {
  // ---- WORD PROGRESS (SRS) ----
  public static getWordProgress(): Record<string, WordProgress> {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WORD_PROGRESS);
      return data ? JSON.parse(data) : {};
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
    quality: number // 1 to 5
  ): WordProgress {
    const key = typeof target === 'string' ? target : getQuestionKey(target);
    const allProgress = this.getWordProgress();
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

    const updated = SRSEngine.calculateNextReview(existing, quality);
    allProgress[key] = updated;

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
    const allProgress = this.getWordProgress();
    const existing: WordProgress = allProgress[key] || {
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
    if (existing.status === 'mastered') {
      existing.status = 'learning';
    }

    allProgress[key] = existing;

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
  public static getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
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

  public static recordActivity(
    type: 'learn' | 'drill' | 'exam' | 'mistake',
    accuracyScore?: number
  ) {
    if (typeof window === 'undefined') return;
    const stats = this.getDailyStats();
    if (type === 'learn') stats.wordsLearned += 1;
    if (type === 'drill') stats.wordsDrilled += 1;
    if (type === 'exam') stats.wordsExamined += 1;
    if (type === 'mistake') stats.mistakesCount += 1;

    if (accuracyScore !== undefined) {
      stats.accuracy = Math.round(
        stats.accuracy === 100 ? accuracyScore : (stats.accuracy + accuracyScore) / 2
      );
    }

    try {
      localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(stats));
      this.updateStreak();
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
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastActive === yesterdayStr) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
    }

    localStorage.setItem(STORAGE_KEYS.STREAK, currentStreak.toString());
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, today);
    return currentStreak;
  }

  // ---- CUSTOM QUIZZES ----
  public static getCustomQuizzes(): CustomQuiz[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_QUIZZES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static saveCustomQuiz(quiz: Omit<CustomQuiz, 'id' | 'created_at'>): CustomQuiz {
    const list = this.getCustomQuizzes();
    const newQuiz: CustomQuiz = {
      ...quiz,
      id: 'quiz_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      created_at: new Date().toISOString(),
    };

    list.unshift(newQuiz);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_QUIZZES, JSON.stringify(list));
    }
    return newQuiz;
  }

  public static deleteCustomQuiz(id: string): void {
    const list = this.getCustomQuizzes().filter((q) => q.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_QUIZZES, JSON.stringify(list));
    }
  }

  // ---- CUSTOM SUBJECTS ----
  public static getCustomSubjects(): CustomSubject[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_SUBJECTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static saveCustomSubject(
    subject: Omit<CustomSubject, 'id' | 'created_at'>
  ): CustomSubject {
    const list = this.getCustomSubjects();
    const newSubject: CustomSubject = {
      ...subject,
      id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      created_at: new Date().toISOString(),
    };

    list.push(newSubject);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_SUBJECTS, JSON.stringify(list));
    }
    return newSubject;
  }

  public static updateCustomSubject(
    id: string,
    updates: Partial<Omit<CustomSubject, 'id' | 'created_at'>>
  ): CustomSubject | null {
    const list = this.getCustomSubjects();
    const index = list.findIndex((s) => s.id === id);
    if (index === -1) return null;

    list[index] = { ...list[index], ...updates };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_SUBJECTS, JSON.stringify(list));
    }
    return list[index];
  }

  public static deleteCustomSubject(id: string): void {
    const list = this.getCustomSubjects().filter((s) => s.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_SUBJECTS, JSON.stringify(list));
    }
  }

  // ---- ACTIVE QUIZ SELECTION ----
  public static getSelectedQuiz(): string {
    if (typeof window === 'undefined') return '/data/csi106_all.json';
    const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_QUIZ);
    if (!saved || saved.includes('/sat/')) {
      return '/data/csi106_all.json';
    }
    return saved;
  }

  public static setSelectedQuiz(path: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SELECTED_QUIZ, path);
    }
  }

  // ---- BACKUP & RESTORE CENTER (DISASTER RECOVERY) ----

  /**
   * Generates a complete, validated JSON backup of all user data
   */
  public static exportAllData(): string {
    const backupObj = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      appName: 'AnanQuiz',
      data: {
        wordProgress: this.getWordProgress(),
        customQuizzes: this.getCustomQuizzes(),
        customSubjects: this.getCustomSubjects(),
        dailyStats: this.getDailyStats(),
        streak: this.getStreak(),
        selectedQuiz: this.getSelectedQuiz(),
        examHistory: this.getExamHistory(),
      },
    };

    return JSON.stringify(backupObj, null, 2);
  }

  /**
   * Safely validates and restores user data from a backup JSON file
   */
  public static importAllData(
    jsonStr: string
  ): { success: boolean; message: string; restoredCount?: number } {
    if (typeof window === 'undefined') {
      return { success: false, message: 'Môi trường trình duyệt không hợp lệ.' };
    }

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

      // Restore each storage key safely
      if (data.wordProgress) {
        localStorage.setItem(STORAGE_KEYS.WORD_PROGRESS, JSON.stringify(data.wordProgress));
      }
      if (data.customQuizzes) {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_QUIZZES, JSON.stringify(data.customQuizzes));
      }
      if (data.customSubjects) {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_SUBJECTS, JSON.stringify(data.customSubjects));
      }
      if (data.dailyStats) {
        localStorage.setItem(STORAGE_KEYS.DAILY_STATS, JSON.stringify(data.dailyStats));
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

      const restoredWordCount = Object.keys(data.wordProgress || {}).length;

      return {
        success: true,
        message: `Khôi phục thành công ${restoredWordCount} câu hỏi ghi nhớ, streak và toàn bộ lịch sử thi thử!`,
        restoredCount: restoredWordCount,
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Lỗi khi đọc file JSON: ' + (err?.message || 'File không hợp lệ.'),
      };
    }
  }
}
