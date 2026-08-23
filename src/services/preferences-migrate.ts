import type { CategoryId, Preferences, PersonalizationProfile } from '@/models/types';
import {
  DEFAULT_SURFACE_TOPICS,
  sanitizeTopicIds,
  topicsFromGoals,
} from '@/services/topics';
import { DEFAULT_THEME_ID } from '@/theme/themes';

/**
 * Preference schema migration — pure (no React, no storage) so the
 * verification harness runs the REAL migration code.
 *
 * v1: pre-personalization (no `version`, flat goals/feelings)
 * v2: personalization profile
 * v3: surface topic preferences + notification opt-in prompt flag
 */

export const DEFAULT_PROFILE: PersonalizationProfile = {
  goals: [],
  currentChallenges: [],
  lifeContexts: [],
  addressMode: 'neutral',
  deliveryStyle: 'mixed',
};

export const DEFAULT_PREFERENCES: Preferences = {
  version: 3,
  onboardingCompleted: false,
  profile: DEFAULT_PROFILE,
  themeId: DEFAULT_THEME_ID,
  // Off by default: onboarding never configures reminders and never asks
  // for permission — the post-first-message opt-in (or Settings) does.
  notifications: {
    enabled: false,
    times: ['08:00', '14:00', '20:00'],
  },
  topics: DEFAULT_SURFACE_TOPICS,
  notificationOptInPromptSeen: false,
};

/** Pre-personalization persisted shape (schema v1, had no `version` field). */
interface LegacyPreferencesV1 {
  onboardingCompleted?: boolean;
  goals?: string[];
  feelings?: string[];
  themeId?: string;
  notifications?: { enabled: boolean; times: string[] };
}

/** v1 category ids that were renamed to match the content pack. */
const LEGACY_GOAL_MAP: Record<string, CategoryId> = {
  work: 'work_success',
  habits: 'healthy_habits',
  sleep: 'bedtime',
};

const VALID_GOALS = new Set<string>([
  'confidence',
  'motivation',
  'calm',
  'self_love',
  'work_success',
  'money',
  'relationships',
  'healthy_habits',
]);

type StoredPreferences = Omit<Partial<Preferences>, 'version'> &
  LegacyPreferencesV1 & { version?: number };

/**
 * Migrate any stored preferences shape to schema v3. Nothing the user
 * already set is lost: profile, theme, notification settings, onboarding
 * state all carry over. New v3 fields:
 * - `topics.feed.categoryIds` derived from the user's goals (goals map 1:1
 *   to categories), `customized: false` so goals keep syncing them until
 *   the user edits topics directly;
 * - widget/notifications start in follow_feed;
 * - `notificationOptInPromptSeen` starts true for users who already have
 *   reminders enabled (they must never see the opt-in prompt).
 */
export function migratePreferences(stored: unknown): { prefs: Preferences; migrated: boolean } {
  if (stored == null || typeof stored !== 'object') {
    return { prefs: DEFAULT_PREFERENCES, migrated: false };
  }
  const raw = stored as StoredPreferences;

  if (raw.version === 3 && raw.profile && raw.topics) {
    const topics = raw.topics;
    return {
      prefs: {
        ...DEFAULT_PREFERENCES,
        ...raw,
        profile: { ...DEFAULT_PROFILE, ...raw.profile },
        topics: {
          feed: {
            categoryIds: sanitizeTopicIds(topics.feed?.categoryIds),
            customized: topics.feed?.customized === true,
          },
          widget: {
            mode: topics.widget?.mode === 'custom' ? 'custom' : 'follow_feed',
            categoryIds: sanitizeTopicIds(topics.widget?.categoryIds),
          },
          notifications: {
            mode: topics.notifications?.mode === 'custom' ? 'custom' : 'follow_feed',
            categoryIds: sanitizeTopicIds(topics.notifications?.categoryIds),
          },
        },
      } as Preferences,
      migrated: false,
    };
  }

  if (raw.version === 2 && raw.profile) {
    const profile = { ...DEFAULT_PROFILE, ...raw.profile };
    const notifications = raw.notifications ?? DEFAULT_PREFERENCES.notifications;
    return {
      prefs: {
        ...DEFAULT_PREFERENCES,
        ...raw,
        version: 3,
        profile,
        notifications,
        topics: {
          ...DEFAULT_SURFACE_TOPICS,
          feed: { categoryIds: topicsFromGoals(profile.goals), customized: false },
        },
        notificationOptInPromptSeen: notifications.enabled === true,
      } as Preferences,
      migrated: true,
    };
  }

  // v1: keep theme, notification settings and (renamed) goals; the newer
  // personalization fields get the recommended defaults. Completed
  // onboarding stays completed.
  const legacyGoals = Array.isArray(raw.goals) ? raw.goals : [];
  const goals = legacyGoals
    .map((g) => LEGACY_GOAL_MAP[g] ?? (g as CategoryId))
    .filter((g) => VALID_GOALS.has(g));
  const notifications = raw.notifications ?? DEFAULT_PREFERENCES.notifications;
  return {
    prefs: {
      version: 3,
      onboardingCompleted: raw.onboardingCompleted ?? false,
      profile: { ...DEFAULT_PROFILE, goals },
      themeId: raw.themeId ?? DEFAULT_THEME_ID,
      notifications,
      topics: {
        ...DEFAULT_SURFACE_TOPICS,
        feed: { categoryIds: topicsFromGoals(goals), customized: false },
      },
      notificationOptInPromptSeen: notifications.enabled === true,
    },
    migrated: true,
  };
}
