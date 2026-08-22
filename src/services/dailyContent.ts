import { RECENT_HISTORY_SIZE } from '@/constants/appConfig';
import { AFFIRMATIONS, getAffirmationsByCategory } from '@/content/affirmations';
import { getCategory } from '@/content/categories';
import type { Affirmation, CategoryId, PersonalizationProfile } from '@/models/types';
import { orderFeed, periodForHour, pickOne } from '@/services/personalization';

/**
 * Feed construction on top of the personalization engine
 * (services/personalization.ts). Entitlement stays category-level: free
 * users never receive messages from Premium categories in generated feeds.
 */

/** Everything the current plan may show in the personalized feed. */
function accessiblePool(isPremium: boolean): Affirmation[] {
  if (isPremium) return AFFIRMATIONS;
  return AFFIRMATIONS.filter((a) => !getCategory(a.category).premium);
}

/**
 * "Za danas" — the most personalized feed: goals, current challenges, life
 * context, delivery style, age affinity, time of day and recent history all
 * shape the order.
 */
export function buildTodayFeed(
  profile: PersonalizationProfile,
  isPremium: boolean,
  recentIds: string[],
  now: Date = new Date(),
): Affirmation[] {
  return orderFeed(accessiblePool(isPremium), profile, {
    period: periodForHour(now.getHours()),
    recentIds,
  });
}

/**
 * Explicit category feed: the category remains the primary filter, but the
 * user's personalization still decides what surfaces first within it.
 */
export function buildCategoryFeed(
  category: CategoryId,
  profile: PersonalizationProfile,
  recentIds: string[],
  now: Date = new Date(),
): Affirmation[] {
  return orderFeed(getAffirmationsByCategory(category), profile, {
    period: periodForHour(now.getHours()),
    recentIds,
  });
}

/** Append an id to the recent history, keeping it bounded. */
export function pushRecent(recentIds: string[], id: string): string[] {
  const next = recentIds.filter((r) => r !== id);
  next.push(id);
  return next.slice(-RECENT_HISTORY_SIZE);
}

/**
 * One personalized affirmation for a scheduled notification. `fireDate`
 * matters: a 08:00 slot naturally leans toward morning content, a 21:00
 * slot toward winding down. `exclude` keeps one scheduling batch varied.
 */
export function notificationAffirmation(
  profile: PersonalizationProfile,
  isPremium: boolean,
  fireDate: Date,
  exclude: string[] = [],
): Affirmation {
  const picked = pickOne(accessiblePool(isPremium), profile, {
    period: periodForHour(fireDate.getHours()),
    exclude,
  });
  return picked ?? AFFIRMATIONS[0];
}
