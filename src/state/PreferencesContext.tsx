import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { FREE_LIMITS } from '@/constants/appConfig';
import { CONTENT_SCHEMA_VERSION } from '@/content/affirmations';
import type {
  CategoryId,
  PersonalizationProfile,
  Preferences,
  StreakState,
  SurfaceTopicSelection,
} from '@/models/types';
import { track } from '@/services/analytics';
import { pushRecent } from '@/services/dailyContent';
import {
  DEFAULT_PREFERENCES,
  DEFAULT_PROFILE,
  migratePreferences,
} from '@/services/preferences-migrate';
import { readJson, StorageKeys, writeJson } from '@/services/storage';
import { EMPTY_STREAK, registerActiveDay } from '@/services/streak';
import {
  DEFAULT_SURFACE_TOPICS,
  sanitizeTopicIds,
  toggleTopic,
  topicsFromGoals,
  type TopicToggleResult,
} from '@/services/topics';
import { getTheme, type AppTheme } from '@/theme/themes';
import { tokensFor, type ThemeTokens } from '@/theme/tokens';
import { refreshSebiWidget } from '@/widgets/widget-refresh';
import { useSubscription } from '@/state/SubscriptionContext';

export { DEFAULT_PROFILE };

/**
 * Goal → topic sync: while the user has never edited topics directly
 * (customized=false), the preferred Za danas topics simply mirror their
 * Goals. Once customized, goals and topics may diverge intentionally.
 */
function withSyncedTopics(prefs: Preferences): Preferences {
  if (prefs.topics.feed.customized) return prefs;
  return {
    ...prefs,
    topics: {
      ...prefs.topics,
      feed: { categoryIds: topicsFromGoals(prefs.profile.goals), customized: false },
    },
  };
}

export type FavoriteResult = 'added' | 'removed' | 'limit';

interface PreferencesContextValue {
  ready: boolean;
  preferences: Preferences;
  profile: PersonalizationProfile;
  theme: AppTheme;
  /** Tokens derived from the theme's ink/surface (sub, faint, line, ghost…). */
  tokens: ThemeTokens;
  favorites: string[];
  streak: StreakState;
  recentIds: string[];
  updatePreferences(patch: Partial<Preferences>): void;
  updateProfile(patch: Partial<PersonalizationProfile>): void;
  /**
   * Toggle a preferred Za danas topic (Categories UI). Marks topics as
   * customized so goal changes stop syncing them. Returns 'limit' at the
   * 5-topic cap and 'last' when the final topic cannot be removed.
   */
  toggleFeedTopic(category: CategoryId): TopicToggleResult;
  /** Set the widget/notification topic selection (follow_feed or custom). */
  setSurfaceTopics(surface: 'widget' | 'notifications', selection: SurfaceTopicSelection): void;
  /** Dev/testing: clear onboarding + profile so the flow can run again. */
  resetOnboarding(): void;
  /** Toggles a favorite; returns 'limit' when the free cap is hit. */
  toggleFavorite(id: string): FavoriteResult;
  isFavorite(id: string): boolean;
  markShown(id: string): void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { isPremium } = useSubscription();
  const [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [streak, setStreak] = useState<StreakState>(EMPTY_STREAK);
  const recentRef = useRef<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedPrefs, storedFavorites, storedStreak, storedRecent, storedContentVersion] =
        await Promise.all([
          readJson<unknown>(StorageKeys.preferences, null),
          readJson<string[]>(StorageKeys.favorites, []),
          readJson<StreakState>(StorageKeys.streak, EMPTY_STREAK),
          readJson<string[]>(StorageKeys.recentIds, []),
          readJson<number>(StorageKeys.contentVersion, 0),
        ]);
      if (cancelled) return;

      const { prefs, migrated } = migratePreferences(storedPrefs);
      setPreferences(prefs);
      if (migrated) void writeJson(StorageKeys.preferences, prefs);

      // Content-version migration: corpus revisions reuse ids with changed
      // texts (v2 rewrote 827 retained messages), and favorites/recents are
      // stored by id only — no text snapshot exists to preserve. Keeping
      // them would silently swap the wording of a user's saved thoughts, so
      // clearing on version change is the least destructive SAFE option.
      // Fresh installs (version 0, nothing stored) just adopt the current
      // version. Preferences, streak and theme are untouched.
      const contentStale =
        storedContentVersion !== CONTENT_SCHEMA_VERSION &&
        (storedFavorites.length > 0 || storedRecent.length > 0);
      if (migrated || contentStale) {
        void writeJson(StorageKeys.favorites, []);
        void writeJson(StorageKeys.recentIds, []);
        setFavorites([]);
        recentRef.current = [];
        setRecentIds([]);
      } else {
        setFavorites(storedFavorites);
        recentRef.current = storedRecent;
        setRecentIds(storedRecent);
      }
      if (storedContentVersion !== CONTENT_SCHEMA_VERSION) {
        void writeJson(StorageKeys.contentVersion, CONTENT_SCHEMA_VERSION);
      }

      const nextStreak = registerActiveDay(storedStreak);
      setStreak(nextStreak);
      if (nextStreak !== storedStreak) void writeJson(StorageKeys.streak, nextStreak);
      track('app_open');
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    setPreferences((prev) => {
      // Profile writes (onboarding completion) also initialize/sync the
      // preferred feed topics from the chosen goals.
      const next = withSyncedTopics({ ...prev, ...patch });
      void writeJson(StorageKeys.preferences, next);
      return next;
    });
    // Onboarding completion / full-profile writes are explicit
    // personalization changes; theme, notifications etc. never refresh.
    if (patch.profile || patch.onboardingCompleted !== undefined) refreshSebiWidget('personalization');
  }, []);

  const updateProfile = useCallback((patch: Partial<PersonalizationProfile>) => {
    setPreferences((prev) => {
      const next = withSyncedTopics({ ...prev, profile: { ...prev.profile, ...patch } });
      void writeJson(StorageKeys.preferences, next);
      return next;
    });
    // The home-screen widget personalizes from the same profile. Only
    // content-affecting fields replace the current widget message —
    // addressMode has no scoring/filtering role (texts are never rewritten),
    // so changing it alone must not churn what is on the home screen.
    const affectsContent = Object.keys(patch).some((key) => key !== 'addressMode');
    refreshSebiWidget(affectsContent ? 'personalization' : 'maintenance');
  }, []);

  const toggleFeedTopic = useCallback(
    (category: CategoryId): TopicToggleResult => {
      const { next, result } = toggleTopic(preferences.topics.feed.categoryIds, category);
      if (result !== 'added' && result !== 'removed') return result;
      const nextPrefs: Preferences = {
        ...preferences,
        topics: {
          ...preferences.topics,
          feed: { categoryIds: next, customized: true },
        },
      };
      setPreferences(nextPrefs);
      void writeJson(StorageKeys.preferences, nextPrefs);
      track(result === 'added' ? 'feed_topic_selected' : 'feed_topic_removed', { category });
      // Surfaces that follow the feed pick up the change: the widget queue
      // regenerates now; notifications reschedule via the layout effect.
      const widgetFollowsFeed = !(preferences.topics.widget.mode === 'custom' && isPremium);
      if (widgetFollowsFeed) refreshSebiWidget('personalization');
      return result;
    },
    [preferences, isPremium],
  );

  const setSurfaceTopics = useCallback(
    (surface: 'widget' | 'notifications', selection: SurfaceTopicSelection) => {
      const previous = preferences.topics[surface];
      const clean: SurfaceTopicSelection = {
        mode: selection.mode === 'custom' ? 'custom' : 'follow_feed',
        categoryIds: sanitizeTopicIds(selection.categoryIds),
      };
      const nextPrefs: Preferences = {
        ...preferences,
        topics: { ...preferences.topics, [surface]: clean },
      };
      setPreferences(nextPrefs);
      void writeJson(StorageKeys.preferences, nextPrefs);
      if (previous.mode !== clean.mode) {
        track(
          surface === 'widget' ? 'widget_topic_mode_changed' : 'notification_topic_mode_changed',
          { mode: clean.mode },
        );
      }
      // Widget topics changed → regenerate the queue and re-render natively
      // now; notification topics feed the reschedule effect in _layout.
      if (surface === 'widget') refreshSebiWidget('personalization');
    },
    [preferences],
  );

  const resetOnboarding = useCallback(() => {
    setPreferences((prev) => {
      const next: Preferences = {
        ...prev,
        onboardingCompleted: false,
        profile: DEFAULT_PROFILE,
        notifications: DEFAULT_PREFERENCES.notifications,
        topics: DEFAULT_SURFACE_TOPICS,
        notificationOptInPromptSeen: false,
      };
      void writeJson(StorageKeys.preferences, next);
      return next;
    });
    recentRef.current = [];
    setRecentIds([]);
    void writeJson(StorageKeys.recentIds, []);
  }, []);

  const toggleFavorite = useCallback(
    (id: string): FavoriteResult => {
      let result: FavoriteResult = 'added';
      setFavorites((prev) => {
        if (prev.includes(id)) {
          result = 'removed';
          const next = prev.filter((f) => f !== id);
          void writeJson(StorageKeys.favorites, next);
          return next;
        }
        if (!isPremium && prev.length >= FREE_LIMITS.favorites) {
          result = 'limit';
          return prev;
        }
        result = 'added';
        const next = [...prev, id];
        void writeJson(StorageKeys.favorites, next);
        return next;
      });
      if (result === 'added') track('affirmation_favorited', { id });
      return result;
    },
    [isPremium],
  );

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const markShown = useCallback((id: string) => {
    recentRef.current = pushRecent(recentRef.current, id);
    setRecentIds(recentRef.current);
    void writeJson(StorageKeys.recentIds, recentRef.current);
  }, []);

  const theme = useMemo(() => getTheme(preferences.themeId), [preferences.themeId]);
  const tokens = useMemo(() => tokensFor(theme), [theme]);

  const value = useMemo(
    () => ({
      ready,
      preferences,
      profile: preferences.profile,
      theme,
      tokens,
      favorites,
      streak,
      recentIds,
      updatePreferences,
      updateProfile,
      toggleFeedTopic,
      setSurfaceTopics,
      resetOnboarding,
      toggleFavorite,
      isFavorite,
      markShown,
    }),
    [
      ready,
      preferences,
      theme,
      tokens,
      favorites,
      streak,
      recentIds,
      updatePreferences,
      updateProfile,
      toggleFeedTopic,
      setSurfaceTopics,
      resetOnboarding,
      toggleFavorite,
      isFavorite,
      markShown,
    ],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider');
  return value;
}
