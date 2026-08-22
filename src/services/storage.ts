import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Thin typed wrapper around AsyncStorage. All persisted state goes through
 * here so keys live in one place.
 */
export const StorageKeys = {
  preferences: 'danas.preferences.v1',
  favorites: 'danas.favorites.v1',
  streak: 'danas.streak.v1',
  recentIds: 'danas.recent-ids.v1',
  mockPremium: 'danas.mock-premium.v1',
  /** CONTENT_SCHEMA_VERSION the stored favorites/recents were written for. */
  contentVersion: 'danas.content-version.v1',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

export async function readJson<T>(key: StorageKey, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(key: StorageKey, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence is best-effort; the app must keep working in memory.
  }
}
