import type { Preferences } from '@/models/types';
import { parseTime } from '@/services/dates';

/**
 * Gate for the one-time post-first-message reminder opt-in prompt — pure so
 * the verification harness tests it. True only when:
 * - onboarding is complete (the user is on Danas seeing a real message),
 * - reminders are not already enabled,
 * - the prompt has never been HANDLED (an explicit "Uključi"/"Ne sada"
 *   decision — merely appearing on screen does not consume it).
 */
export function shouldShowNotificationOptIn(prefs: Preferences): boolean {
  return (
    prefs.onboardingCompleted === true &&
    prefs.notifications.enabled !== true &&
    prefs.notificationOptInPromptSeen !== true
  );
}

/** Delay before the special same-day first reminder after opt-in. */
export const FIRST_REMINDER_DELAY_MINUTES = 90;
/** No special reminder lands later than 21:30 local time. */
export const FIRST_REMINDER_CUTOFF = { hour: 21, minute: 30 };

export interface FirstReminderPlan {
  /** True when a one-time same-day reminder should be scheduled. */
  sameDay: boolean;
  fireDate: Date | null;
}

/**
 * Decide the FIRST reminder after enabling from the opt-in prompt, so a
 * user who enables at 15:00 with an 08:00 daily slot still sees Sebi work
 * today — pure, so the verification harness runs the real logic.
 *
 * - Case A: any effective daily time is still ahead today → nothing
 *   special; the normal schedule already covers today (no duplicates).
 * - Case B: every slot has passed → one-time reminder ~90 minutes from
 *   now (long enough to forget the app, so the notification has value).
 * - Case C: that would land after 21:30 local (or past midnight) → skip;
 *   the first reminder is simply tomorrow's normal one.
 *
 * `effectiveTimes` must already be capped by the plan's per-day limit
 * (Free 1/day), matching what rescheduleNotifications will schedule.
 */
export function planFirstOptInReminder(now: Date, effectiveTimes: string[]): FirstReminderPlan {
  for (const time of effectiveTimes) {
    const parsed = parseTime(time);
    if (!parsed) continue;
    const slot = new Date(now);
    slot.setHours(parsed.hour, parsed.minute, 0, 0);
    if (slot.getTime() > now.getTime() + 60_000) return { sameDay: false, fireDate: null };
  }
  const fireDate = new Date(now.getTime() + FIRST_REMINDER_DELAY_MINUTES * 60_000);
  const cutoff = new Date(now);
  cutoff.setHours(FIRST_REMINDER_CUTOFF.hour, FIRST_REMINDER_CUTOFF.minute, 0, 0);
  if (fireDate.getTime() > cutoff.getTime() || fireDate.getDate() !== now.getDate()) {
    return { sameDay: false, fireDate: null };
  }
  return { sameDay: true, fireDate };
}
