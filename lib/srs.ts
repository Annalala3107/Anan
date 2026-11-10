/**
 * Spaced Repetition System (SRS) based on modified SuperMemo SM-2 & Leitner Box algorithms.
 * Calculates optimal review intervals, memory retention strength, and status transitions.
 */

import { WordProgress, WordStatus } from './types';

export class SRSEngine {
  /**
   * Update word progress after an interactive review
   * @param current Previous word progress
   * @param quality Quality rating 0 to 5 (or simplified: 1 = failed/hard, 4 = good, 5 = easy)
   */
  public static calculateNextReview(
    current: WordProgress,
    quality: number // 0: complete blackout, 1: incorrect, 2: hard, 3: medium, 4: good, 5: perfect/easy
  ): WordProgress {
    const now = Date.now();
    let easeFactor = current.easeFactor ?? 2.5;
    let intervalDays = current.intervalDays ?? 0;
    let strength = current.strength ?? 0;
    let wrongStreak = current.wrongStreak ?? 0;
    let seenCount = (current.seenCount ?? 0) + 1;
    let mistakesCount = current.mistakesCount ?? 0;
    let lastMistakeTime = current.lastMistakeTime;

    // Quality >= 3 is considered a passing recall
    const isSuccess = quality >= 3;

    if (isSuccess) {
      wrongStreak = 0;
      if (intervalDays === 0) {
        intervalDays = 1;
      } else if (intervalDays === 1) {
        intervalDays = 3;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor);
      }

      // Increase strength based on performance
      const strengthDelta = quality === 5 ? 0.25 : quality === 4 ? 0.15 : 0.08;
      strength = Math.min(1.0, strength + strengthDelta);

      // Adjust ease factor (SM-2 standard formula)
      easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (easeFactor < 1.3) easeFactor = 1.3;
    } else {
      // Failed or marked as difficult
      wrongStreak += 1;
      mistakesCount += 1;
      lastMistakeTime = now;
      intervalDays = 1; // Reset to 1 day review
      strength = Math.max(0.1, strength - 0.25);
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    }

    // Determine derived status
    let status: WordStatus = 'learning';
    if (strength >= 0.8 && seenCount >= 3) {
      status = 'mastered';
    } else if (strength < 0.3 && seenCount <= 1) {
      status = 'new';
    } else if (now > current.nextDue && seenCount > 0) {
      status = 'review';
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

  /**
   * Filter and prioritize words that are due for review or frequent mistakes
   */
  public static getPriorityWords(
    progressMap: Record<string, WordProgress>,
    limit: number = 20
  ): string[] {
    const now = Date.now();
    const list = Object.values(progressMap);

    // Prioritize:
    // 1. High wrong streak
    // 2. Overdue review (nextDue <= now)
    // 3. Lowest strength score
    return list
      .sort((a, b) => {
        const aOverdue = a.nextDue <= now ? 1 : 0;
        const bOverdue = b.nextDue <= now ? 1 : 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue;

        const aMistakes = a.wrongStreak || 0;
        const bMistakes = b.wrongStreak || 0;
        if (aMistakes !== bMistakes) return bMistakes - aMistakes;

        return (a.strength || 0) - (b.strength || 0);
      })
      .slice(0, limit)
      .map((p) => p.word);
  }
}
