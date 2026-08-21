import type { StreakState } from '@/models/types';
import { dayDifference, localDateKey } from '@/services/dates';

export const EMPTY_STREAK: StreakState = {
  current: 0,
  longest: 0,
  lastActiveDate: null,
};

/**
 * Apply an app open to the streak state. Opening the app at least once per
 * local calendar day keeps the streak alive; a gap of more than one day
 * resets it. Same-day opens are no-ops. Pure function — safe across
 * restarts and clock reads.
 */
export function registerActiveDay(state: StreakState, now: Date = new Date()): StreakState {
  const today = localDateKey(now);
  if (state.lastActiveDate === today) return state;

  let current = 1;
  if (state.lastActiveDate) {
    const gap = dayDifference(state.lastActiveDate, today);
    if (gap === 1) current = state.current + 1;
    // gap <= 0 means clock moved backwards — treat as a fresh day, keep 1.
  }

  return {
    current,
    longest: Math.max(state.longest, current),
    lastActiveDate: today,
  };
}
