"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REVENUECAT_API_KEYS = exports.NOTIFICATION_HORIZON_DAYS = exports.RECENT_HISTORY_SIZE = exports.PREMIUM_LIMITS = exports.FREE_LIMITS = exports.TERMS_URL = exports.PRIVACY_URL = exports.PLAY_STORE_URL = exports.APP_STORE_URL = exports.SHARE_BRAND = exports.APP_NAME = void 0;
/**
 * Central app configuration.
 * "Danas" is a working name — rename here (and in app.json) when the final
 * name is decided.
 */
exports.APP_NAME = 'Danas';
/** Shown on generated share cards. */
exports.SHARE_BRAND = 'Danas';
/** Store links — fill in once the app is published. */
exports.APP_STORE_URL = 'https://apps.apple.com/app/id0000000000';
exports.PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.danas.app';
/** Legal pages — replace with real URLs before release. */
exports.PRIVACY_URL = 'https://example.com/danas/privatnost';
exports.TERMS_URL = 'https://example.com/danas/uslovi';
/** Free-plan limits (premium removes them). */
exports.FREE_LIMITS = {
    /** Maximum scheduled daily reminders. */
    notificationsPerDay: 1,
    /** Maximum saved favorites. */
    favorites: 20,
    /** Number of themes available for free (the first N in the theme list). */
    themes: 3,
};
exports.PREMIUM_LIMITS = {
    notificationsPerDay: 10,
};
/** How many of the most recently shown affirmations to avoid repeating. */
exports.RECENT_HISTORY_SIZE = 20;
/** How many days ahead local notifications are scheduled (refreshed on app open). */
exports.NOTIFICATION_HORIZON_DAYS = 7;
/**
 * RevenueCat public API keys. Leave empty to run in mock/dev subscription
 * mode (Expo Go friendly). Set real keys for production builds.
 */
exports.REVENUECAT_API_KEYS = {
    ios: '',
    android: '',
};
