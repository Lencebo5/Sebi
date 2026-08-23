import type { Preferences } from '@/models/types';

/**
 * Gate for the one-time post-first-message reminder opt-in prompt — pure so
 * the verification harness tests it. True only when:
 * - onboarding is complete (the user is on Danas seeing a real message),
 * - reminders are not already enabled,
 * - the prompt has never been shown before.
 */
export function shouldShowNotificationOptIn(prefs: Preferences): boolean {
  return (
    prefs.onboardingCompleted === true &&
    prefs.notifications.enabled !== true &&
    prefs.notificationOptInPromptSeen !== true
  );
}
