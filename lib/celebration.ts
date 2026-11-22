import confetti from 'canvas-confetti';
import { useQuizStore } from '@/lib/quizStore';

const COSMIC_CELEBRATION_PALETTE = [
  '#6366F1', // Cosmic Indigo
  '#8B5CF6', // Nebula Violet
  '#22D3EE', // Cyan Young Star
  '#F59E0B', // Warm Starlight Amber
  '#10B981', // Emerald Success
];

/**
 * Triggers a unified Astronomical celebration respecting user motionMode & OS prefers-reduced-motion.
 */
export function triggerAstronomicalCelebration(
  variant: 'milestone' | 'session' = 'session'
): void {
  if (typeof window === 'undefined') return;

  const { motionMode, triggerConstellationAction } = useQuizStore.getState();
  const osReduced =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  if (motionMode === 'reduced' || (motionMode === 'system' && osReduced)) {
    return;
  }

  triggerConstellationAction('shooting_star');

  try {
    confetti({
      particleCount: variant === 'milestone' ? 65 : 48,
      spread: variant === 'milestone' ? 68 : 56,
      startVelocity: 32,
      scalar: 0.85,
      origin: { y: 0.65 },
      colors: COSMIC_CELEBRATION_PALETTE,
      disableForReducedMotion: true,
    });
  } catch {
    // Gracefully skip if canvas animation context fails
  }
}
