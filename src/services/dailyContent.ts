import { RECENT_HISTORY_SIZE } from '@/constants/appConfig';
import { AFFIRMATIONS, getAffirmationsByCategory } from '@/content/affirmations';
import { getCategory } from '@/content/categories';
import type { Affirmation, CategoryId } from '@/models/types';

/**
 * Content selection: builds feeds that avoid the recently shown
 * affirmations and lean toward the user's onboarding goals.
 */

/** Pool for the personalized "Za danas" feed. */
export function getTodayPool(goals: CategoryId[], isPremium: boolean): Affirmation[] {
  const accessible = AFFIRMATIONS.filter((a) => isPremium || !getCategory(a.category).premium);
  const goalSet = new Set(goals);
  const preferred = accessible.filter((a) => goalSet.has(a.category));
  const rest = accessible.filter((a) => !goalSet.has(a.category));
  // Weight goals ~2:1 by listing preferred items twice before shuffling,
  // then de-duplicating in feed order.
  return [...preferred, ...preferred, ...rest];
}

/** Deterministic-ish shuffle seeded per session; plain Fisher–Yates. */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Order a pool into a feed: recently shown items go last, duplicates are
 * removed, the rest is shuffled.
 */
export function buildFeed(pool: Affirmation[], recentIds: string[]): Affirmation[] {
  const recent = new Set(recentIds.slice(-RECENT_HISTORY_SIZE));
  const seen = new Set<string>();
  const fresh: Affirmation[] = [];
  const stale: Affirmation[] = [];
  for (const item of shuffle(pool)) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    (recent.has(item.id) ? stale : fresh).push(item);
  }
  // Only push recent items to the back when there are enough alternatives.
  if (fresh.length === 0) return [...stale];
  return [...fresh, ...stale];
}

export function buildCategoryFeed(category: CategoryId, recentIds: string[]): Affirmation[] {
  return buildFeed(getAffirmationsByCategory(category), recentIds);
}

export function buildTodayFeed(
  goals: CategoryId[],
  isPremium: boolean,
  recentIds: string[],
): Affirmation[] {
  return buildFeed(getTodayPool(goals, isPremium), recentIds);
}

/** Append an id to the recent history, keeping it bounded. */
export function pushRecent(recentIds: string[], id: string): string[] {
  const next = recentIds.filter((r) => r !== id);
  next.push(id);
  return next.slice(-RECENT_HISTORY_SIZE);
}

/** A random accessible affirmation, e.g. for notification bodies. */
export function randomAffirmation(goals: CategoryId[], isPremium: boolean): Affirmation {
  const pool = getTodayPool(goals, isPremium);
  return pool[Math.floor(Math.random() * pool.length)] ?? AFFIRMATIONS[0];
}
