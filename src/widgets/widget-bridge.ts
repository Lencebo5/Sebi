import { NativeModules, Platform } from 'react-native';

/**
 * Typed access to the native SharedPreferences bridge
 * (SebiWidgetStorageModule.java). The module exists only in real Android
 * builds — null on iOS/web and in Expo Go, where callers must no-op.
 */
export interface SebiWidgetStorage {
  /**
   * Store the queue JSON in SharedPreferences and immediately re-render any
   * placed widgets. Resolves with the number of valid slots; rejects on an
   * empty/invalid payload or a failed write.
   */
  setQueue(queueJson: string): Promise<number>;
}

export function getWidgetStorage(): SebiWidgetStorage | null {
  if (Platform.OS !== 'android') return null;
  const module = (NativeModules as Record<string, unknown>).SebiWidgetStorage as
    | SebiWidgetStorage
    | undefined;
  return module ?? null;
}
