import { CATEGORIES } from '@/content/categories';
import type { Affirmation, CategoryId, SurfaceTopics } from '@/models/types';

/**
 * Surface topic preferences — pure logic (no React, no storage) so the
 * verification harness exercises it directly.
 *
 * Two distinct concepts:
 * - personalized surfaces (Za danas, widget, notifications): Sebi chooses,
 *   and preferred topics act as category-intent BOOST + a narrow Free
 *   eligibility extension;
 * - category browsing: the user opens a category deliberately — normal
 *   Free/Premium entitlement applies there, unchanged.
 */

export type ContentSurface = 'personalized_feed' | 'category_feed' | 'widget' | 'notification';

export const MIN_FEED_TOPICS = 1;
export const MAX_FEED_TOPICS = 5;

/** Categories offered as topics: everything except the Za danas pseudo-feed. */
export const TOPIC_CATEGORY_IDS: CategoryId[] = CATEGORIES.filter((c) => c.id !== 'today').map(
  (c) => c.id,
);
const TOPIC_ID_SET = new Set<string>(TOPIC_CATEGORY_IDS);

export const DEFAULT_SURFACE_TOPICS: SurfaceTopics = {
  feed: { categoryIds: [], customized: false },
  widget: { mode: 'follow_feed', categoryIds: [] },
  notifications: { mode: 'follow_feed', categoryIds: [] },
};

/** Drop unknown ids and duplicates; cap at the v1 topic limit. */
export function sanitizeTopicIds(ids: unknown): CategoryId[] {
  if (!Array.isArray(ids)) return [];
  const out: CategoryId[] = [];
  for (const id of ids) {
    if (typeof id === 'string' && TOPIC_ID_SET.has(id) && !out.includes(id as CategoryId)) {
      out.push(id as CategoryId);
    }
    if (out.length >= MAX_FEED_TOPICS) break;
  }
  return out;
}

/** Onboarding/goal-sync: goals map 1:1 to categories, so topics start as goals. */
export function topicsFromGoals(goals: CategoryId[]): CategoryId[] {
  return sanitizeTopicIds(goals);
}

/**
 * The topic set actually applied to a personalized surface right now.
 * Widget/notifications in custom mode use their own picks — Premium only:
 * a Free user (including a lapsed Premium) falls back to follow_feed while
 * their saved custom selection is preserved untouched.
 */
export function effectiveTopics(
  surface: ContentSurface,
  topics: SurfaceTopics,
  isPremium: boolean,
): CategoryId[] {
  const feed = sanitizeTopicIds(topics.feed.categoryIds);
  if (surface === 'widget' || surface === 'notification') {
    const selection = surface === 'widget' ? topics.widget : topics.notifications;
    if (selection.mode === 'custom' && isPremium) {
      const custom = sanitizeTopicIds(selection.categoryIds);
      if (custom.length > 0) return custom;
    }
  }
  return feed;
}

/**
 * Per-surface eligibility pool. Category browsing keeps pure entitlement.
 * Personalized surfaces additionally admit Premium-category messages ONLY
 * when the user explicitly chose that category as a preferred topic — the
 * onboarding promise ("work matters to me") is honored without unlocking
 * the Premium corpus or leaking unrelated locked categories.
 */
export function surfacePool(
  items: Affirmation[],
  surface: ContentSurface,
  isPremium: boolean,
  effectiveTopicIds: CategoryId[],
): Affirmation[] {
  if (isPremium) return items;
  if (surface === 'category_feed') return items.filter((a) => !a.premium);
  const allowed = new Set<string>(effectiveTopicIds);
  return items.filter((a) => !a.premium || allowed.has(a.category));
}

export type TopicToggleResult = 'added' | 'removed' | 'limit' | 'last';

/** Toggle one preferred topic, enforcing the 1–5 window. */
export function toggleTopic(
  current: CategoryId[],
  category: CategoryId,
): { next: CategoryId[]; result: TopicToggleResult } {
  const clean = sanitizeTopicIds(current);
  if (!TOPIC_ID_SET.has(category)) return { next: clean, result: 'limit' };
  if (clean.includes(category)) {
    if (clean.length <= MIN_FEED_TOPICS) return { next: clean, result: 'last' };
    return { next: clean.filter((id) => id !== category), result: 'removed' };
  }
  if (clean.length >= MAX_FEED_TOPICS) return { next: clean, result: 'limit' };
  return { next: [...clean, category], result: 'added' };
}
