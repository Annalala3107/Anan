/**
 * Spaced Repetition System (SRS) based on modified SuperMemo SM-2 & Leitner Box algorithms.
 * Calculates optimal review intervals, memory retention strength, and status transitions.
 */

import { WordProgress, WordStatus } from './types';

export interface SRSUpdateOptions {
  markMastered?: boolean;
}

export class SRSEngine {
  /**
   * Update word progress after an interactive review
   * @param current Previous word progress
   * @param quality Quality rating 0 to 5 (or simplified: 1 = failed/hard, 3 = vague, 4 = good, 5 = perfect/easy)
   * @param options Optional overrides (e.g. markMastered when student explicitly rates "Đã thuộc lầu")
   */
  public static calculateNextReview(
    current: WordProgress,
    quality: number, // 0: complete blackout, 1: incorrect, 2: hard, 3: medium, 4: good, 5: perfect/easy
    options?: SRSUpdateOptions
  ): WordProgress {
    const now = Date.now();
    let easeFactor = current.easeFactor ?? 2.5;
    let intervalDays = current.intervalDays ?? 0;
    let strength = current.strength ?? 0;
    let wrongStreak = current.wrongStreak ?? 0;
    const seenCount = (current.seenCount ?? 0) + 1;
    let mistakesCount = current.mistakesCount ?? 0;
    let lastMistakeTime = current.lastMistakeTime;

    // Quality >= 3 is considered a passing recall
    const isSuccess = quality >= 3;

    if (isSuccess) {
      wrongStreak = 0;
      mistakesCount = quality >= 5 ? 0 : Math.max(0, mistakesCount - 1);

      if (intervalDays === 0) {
        intervalDays = options?.markMastered ? 3 : 1;
      } else if (intervalDays === 1) {
        intervalDays = 3;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor);
      }

      // Two quality=5 passes (0.40 + 0.40 = 0.80) reach the >= 80% mastery threshold
      const strengthDelta = quality >= 5 ? 0.40 : quality === 4 ? 0.25 : 0.15;
      const nextStrength = Math.min(1.0, Math.round((strength + strengthDelta) * 1000) / 1000);
      strength = options?.markMastered ? Math.max(0.85, nextStrength) : nextStrength;

      // Adjust ease factor (SM-2 standard formula)
      easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (easeFactor < 1.3) easeFactor = 1.3;
    } else {
      // Failed or marked as difficult
      wrongStreak += 1;
      mistakesCount += 1;
      lastMistakeTime = now;
      intervalDays = 1; // Reset to 1 day review
      strength = Math.max(0.1, Math.round((strength - 0.25) * 1000) / 1000);
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    }

    // Determine derived status
    let status: WordStatus = 'learning';
    if (options?.markMastered || (strength >= 0.8 && seenCount >= 2 && isSuccess)) {
      status = 'mastered';
    } else if (!isSuccess && seenCount === 0 && strength === 0) {
      status = 'new';
    }

    const nextDue = now + intervalDays * 24 * 60 * 60 * 1000;

    return {
      word: current.word,
      strength,
      lastSeen: now,
      nextDue,
      seenCount,
      wrongStreak,
      status,
      intervalDays,
      easeFactor,
      mistakesCount,
      lastMistakeTime,
    };
  }
}
