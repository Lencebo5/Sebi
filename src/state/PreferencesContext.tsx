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
} from '@/models/types';
import { track } from '@/services/analytics';
import { pushRecent } from '@/services/dailyContent';
import { readJson, StorageKeys, writeJson } from '@/services/storage';
import { EMPTY_STREAK, registerActiveDay } from '@/services/streak';
import { DEFAULT_THEME_ID, getTheme, type AppTheme } from '@/theme/themes';
import { tokensFor, type ThemeTokens } from '@/theme/tokens';
import { refreshSebiWidget } from '@/widgets/widget-refresh';
import { useSubscription } from '@/state/SubscriptionContext';

export const DEFAULT_PROFILE: PersonalizationProfile = {
  goals: [],
  currentChallenges: [],
  lifeContexts: [],
  addressMode: 'neutral',
  deliveryStyle: 'mixed',
};

const DEFAULT_PREFERENCES: Preferences = {
  version: 2,
  onboardingCompleted: false,
  profile: DEFAULT_PROFILE,
  themeId: DEFAULT_THEME_ID,
  // Off by default: onboarding no longer configures reminders, and the
  // permission prompt must not appear right after onboarding. Users enable
  // reminders in Podešavanja → Podsetnici (which requests permission).
  notifications: {
    enabled: false,
    times: ['08:00', '14:00', '20:00'],
  },
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

/**
 * Migrate any stored preferences shape to schema v2. v1 users keep their
 * theme, notification settings and (renamed) goals; the new personalization
 * fields get the recommended defaults (neutral address, mixed style).
 * Completed onboarding stays completed — nobody is forced through the new
 * flow; everything is editable later in Settings.
 */
function migratePreferences(stored: unknown): { prefs: Preferences; migrated: boolean } {
  if (stored == null || typeof stored !== 'object') {
    return { prefs: DEFAULT_PREFERENCES, migrated: false };
  }
  const raw = stored as Partial<Preferences> & LegacyPreferencesV1;
  if (raw.version === 2 && raw.profile) {
    return {
      prefs: {
        ...DEFAULT_PREFERENCES,
        ...raw,
        profile: { ...DEFAULT_PROFILE, ...raw.profile },
      } as Preferences,
      migrated: false,
    };
  }
  const legacyGoals = Array.isArray(raw.goals) ? raw.goals : [];
  const goals = legacyGoals
    .map((g) => LEGACY_GOAL_MAP[g] ?? (g as CategoryId))
    .filter((g) => VALID_GOALS.has(g));
  return {
    prefs: {
      version: 2,
      onboardingCompleted: raw.onboardingCompleted ?? false,
      profile: { ...DEFAULT_PROFILE, goals },
      themeId: raw.themeId ?? DEFAULT_THEME_ID,
      notifications: raw.notifications ?? DEFAULT_PREFERENCES.notifications,
    },
    migrated: true,
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
      const next = { ...prev, ...patch };
      void writeJson(StorageKeys.preferences, next);
      return next;
    });
    if (patch.profile || patch.onboardingCompleted !== undefined) refreshSebiWidget({ force: true });
  }, []);

  const updateProfile = useCallback((patch: Partial<PersonalizationProfile>) => {
    setPreferences((prev) => {
      const next = { ...prev, profile: { ...prev.profile, ...patch } };
      void writeJson(StorageKeys.preferences, next);
      return next;
    });
    // The home-screen widget personalizes from the same profile.
    refreshSebiWidget({ force: true });
  }, []);

  const resetOnboarding = useCallback(() => {
    setPreferences((prev) => {
      const next: Preferences = {
        ...prev,
        onboardingCompleted: false,
        profile: DEFAULT_PROFILE,
        notifications: DEFAULT_PREFERENCES.notifications,
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
