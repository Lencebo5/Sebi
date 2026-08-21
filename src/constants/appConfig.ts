/**
 * Central app configuration.
 * "Danas" is a working name — rename here (and in app.json) when the final
 * name is decided.
 */
export const APP_NAME = 'Danas';

/** Shown on generated share cards. */
export const SHARE_BRAND = 'Danas';

/** Store links — fill in once the app is published. */
export const APP_STORE_URL = 'https://apps.apple.com/app/id0000000000';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.danas.app';

/** Legal pages — replace with real URLs before release. */
export const PRIVACY_URL = 'https://example.com/danas/privatnost';
export const TERMS_URL = 'https://example.com/danas/uslovi';

/** Free-plan limits (premium removes them). */
export const FREE_LIMITS = {
  /** Maximum scheduled daily reminders. */
  notificationsPerDay: 1,
  /** Maximum saved favorites. */
  favorites: 20,
  /** Number of themes available for free (the first N in the theme list). */
  themes: 3,
} as const;

export const PREMIUM_LIMITS = {
  notificationsPerDay: 10,
} as const;

/** How many of the most recently shown affirmations to avoid repeating. */
export const RECENT_HISTORY_SIZE = 20;

/** How many days ahead local notifications are scheduled (refreshed on app open). */
export const NOTIFICATION_HORIZON_DAYS = 7;

/**
 * RevenueCat public API keys. Leave empty to run in mock/dev subscription
 * mode (Expo Go friendly). Set real keys for production builds.
 */
export const REVENUECAT_API_KEYS = {
  ios: '',
  android: '',
} as const;
