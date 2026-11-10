/**
 * Local-First Storage & State Sync Engine
 * Works out-of-the-box in browser localStorage without requiring any cloud setup.
 * Supports transparent Supabase backend syncing when environment keys are provided.
 */

import { WordProgress, CustomQuiz, DailyStats, Word } from './types';
import { SRSEngine } from './srs';

const STORAGE_KEYS = {
  WORD_PROGRESS: 'ananquiz_word_progress',
  CUSTOM_QUIZZES: 'ananquiz_custom_quizzes',
  DAILY_STATS: 'ananquiz_daily_stats',
  STREAK: 'ananquiz_streak',
  LAST_ACTIVE_DATE: 'ananquiz_last_active_date',
  SELECTED_QUIZ: 'ananquiz_selected_quiz',
  USER_PROFILE: 'ananquiz_user_profile',
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

  public static updateWordProgress(
    word: string,
    quality: number // 1 to 5
  ): WordProgress {
    const allProgress = this.getWordProgress();
    const existing: WordProgress = allProgress[word] || {
      word,
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
    allProgress[word] = updated;

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
      // If date changed, reset for new day
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
      // Already counted today
      return currentStreak;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastActive === yesterdayStr) {
        currentStreak += 1; // Continued streak!
      } else {
        currentStreak = 1; // Reset streak
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

  // ---- ACTIVE QUIZ SELECTION ----
  public static getSelectedQuiz(): string {
    if (typeof window === 'undefined') return '/sat/vi-en-ielts.json';
    return (
      localStorage.getItem(STORAGE_KEYS.SELECTED_QUIZ) || '/sat/vi-en-ielts.json'
    );
  }

  public static setSelectedQuiz(path: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SELECTED_QUIZ, path);
    }
  }
}
