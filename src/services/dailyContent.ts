import { RECENT_HISTORY_SIZE } from '@/constants/appConfig';
import { AFFIRMATIONS, getAffirmationsByCategory } from '@/content/affirmations';
import type { Affirmation, CategoryId, PersonalizationProfile } from '@/models/types';
import { orderFeed, periodForHour, pickOne } from '@/services/personalization';
import { surfacePool } from '@/services/topics';

/**
 * Feed construction on top of the personalization engine
 * (services/personalization.ts). Eligibility is per SURFACE
 * (services/topics.ts): category browsing keeps pure category-level
 * entitlement, while personalized surfaces admit Premium-category messages
 * a Free user explicitly selected as preferred topics — and nothing else.
 */

/**
 * "Za danas" — the most personalized feed: goals, preferred topics,
 * current challenges, life context, delivery style, age affinity, time of
 * day and recent history all shape the order. Preferred topics are a
 * BOOST (category intent), never a hard filter.
 */
export function buildTodayFeed(
  profile: PersonalizationProfile,
  isPremium: boolean,
  recentIds: string[],
  feedTopics: CategoryId[] = [],
  now: Date = new Date(),
): Affirmation[] {
  return orderFeed(surfacePool(AFFIRMATIONS, 'personalized_feed', isPremium, feedTopics), profile, {
    period: periodForHour(now.getHours()),
    recentIds,
    preferredCategories: feedTopics,
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
  notificationTopics: CategoryId[] = [],
): Affirmation {
  const picked = pickOne(
    surfacePool(AFFIRMATIONS, 'notification', isPremium, notificationTopics),
    profile,
    {
      period: periodForHour(fireDate.getHours()),
      exclude,
      preferredCategories: notificationTopics,
    },
  );
  return picked ?? AFFIRMATIONS[0];
}
