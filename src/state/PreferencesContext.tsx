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
import type { Preferences, StreakState } from '@/models/types';
import { track } from '@/services/analytics';
import { pushRecent } from '@/services/dailyContent';
import { readJson, StorageKeys, writeJson } from '@/services/storage';
import { EMPTY_STREAK, registerActiveDay } from '@/services/streak';
import { DEFAULT_THEME_ID, getTheme, type AppTheme } from '@/theme/themes';
import { useSubscription } from '@/state/SubscriptionContext';

const DEFAULT_PREFERENCES: Preferences = {
  onboardingCompleted: false,
  goals: [],
  feelings: [],
  themeId: DEFAULT_THEME_ID,
  notifications: {
    enabled: true,
    times: ['08:00', '14:00', '20:00'],
  },
};

export type FavoriteResult = 'added' | 'removed' | 'limit';

interface PreferencesContextValue {
  ready: boolean;
  preferences: Preferences;
  theme: AppTheme;
  favorites: string[];
  streak: StreakState;
  recentIds: string[];
  updatePreferences(patch: Partial<Preferences>): void;
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
      const [storedPrefs, storedFavorites, storedStreak, storedRecent] = await Promise.all([
        readJson<Preferences>(StorageKeys.preferences, DEFAULT_PREFERENCES),
        readJson<string[]>(StorageKeys.favorites, []),
        readJson<StreakState>(StorageKeys.streak, EMPTY_STREAK),
        readJson<string[]>(StorageKeys.recentIds, []),
      ]);
      if (cancelled) return;
      setPreferences({ ...DEFAULT_PREFERENCES, ...storedPrefs });
      setFavorites(storedFavorites);
      recentRef.current = storedRecent;
      setRecentIds(storedRecent);

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

  const value = useMemo(
    () => ({
      ready,
      preferences,
      theme,
      favorites,
      streak,
      recentIds,
      updatePreferences,
      toggleFavorite,
      isFavorite,
      markShown,
    }),
    [
      ready,
      preferences,
      theme,
      favorites,
      streak,
      recentIds,
      updatePreferences,
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
