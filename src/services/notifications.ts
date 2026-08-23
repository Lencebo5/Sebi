import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { APP_NAME, NOTIFICATION_HORIZON_DAYS } from '@/constants/appConfig';
import type { CategoryId, NotificationSettings, PersonalizationProfile } from '@/models/types';
import { notificationAffirmation } from '@/services/dailyContent';
import { parseTime } from '@/services/dates';

/**
 * Local scheduled notifications — no server involved.
 *
 * Local notifications can't pick a fresh affirmation at fire time, so we
 * pre-schedule concrete date triggers for the next NOTIFICATION_HORIZON_DAYS
 * days, each with a different affirmation, and rebuild the schedule on every
 * app open and settings change.
 *
 * `expo-notifications` is loaded lazily and skipped entirely in Expo Go:
 * since SDK 53 merely importing the package there throws (its push-token
 * auto-registration side effect), even though this app only uses LOCAL
 * notifications. In Expo Go the service is a silent no-op; development and
 * EAS builds get the full behavior.
 */

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type NotificationsModule = typeof import('expo-notifications');

async function native(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web' || isExpoGo) return null;
  return import('expo-notifications');
}

export function configureNotificationHandling() {
  void (async () => {
    const Notifications = await native();
    if (!Notifications) return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  })();
}

/** Whether the user has hard-denied notifications in system settings. */
export async function isNotificationPermissionDenied(): Promise<boolean> {
  const Notifications = await native();
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  return !current.granted && !current.canAskAgain;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await native();
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

/**
 * One-shot handoff from the post-first-message opt-in (see
 * NotificationOptIn): the NEXT schedule rebuild appends a single same-day
 * personalized reminder at this date. Living INSIDE the rebuild keeps the
 * existing rescheduling logic authoritative: the cancelAll at the top can
 * never leave it stale, every rebuild consumes the marker exactly once,
 * and disabling reminders or changing settings drops it naturally.
 */
let pendingFirstReminder: Date | null = null;

export function requestFirstOptInReminder(fireDate: Date): void {
  pendingFirstReminder = fireDate;
}

export interface ScheduleInput {
  settings: NotificationSettings;
  profile: PersonalizationProfile;
  isPremium: boolean;
  /** Plan-dependent cap on times per day. */
  maxPerDay: number;
  /** Effective reminder topics (services/topics.ts) — one set for all reminders. */
  topics: CategoryId[];
}

/**
 * Rebuild the entire local notification schedule from settings.
 * Cancels everything first so stale times never linger.
 */
export async function rescheduleNotifications({
  settings,
  profile,
  isPremium,
  maxPerDay,
  topics,
}: ScheduleInput): Promise<void> {
  const Notifications = await native();
  if (!Notifications) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
  // Consume the opt-in first-reminder marker on EVERY rebuild — a disabled
  // or permission-less rebuild simply drops it (no stale one-time reminder).
  const firstReminder = pendingFirstReminder;
  pendingFirstReminder = null;
  if (!settings.enabled || settings.times.length === 0) return;

  // Never request permission from this background sync — the system prompt
  // may only appear from an explicit user action (Podešavanja → Podsetnici).
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  const times = settings.times
    .map(parseTime)
    .filter((t): t is NonNullable<ReturnType<typeof parseTime>> => t !== null)
    .slice(0, maxPerDay);

  const now = new Date();
  const scheduled: Promise<string>[] = [];
  // Track what this batch already used so a week of reminders stays varied.
  const usedIds: string[] = [];
  for (let day = 0; day < NOTIFICATION_HORIZON_DAYS; day++) {
    for (const time of times) {
      const fireDate = new Date(now);
      fireDate.setDate(now.getDate() + day);
      fireDate.setHours(time.hour, time.minute, 0, 0);
      if (fireDate.getTime() <= now.getTime() + 60_000) continue;

      const affirmation = notificationAffirmation(profile, isPremium, fireDate, usedIds, topics);
      usedIds.push(affirmation.id);
      scheduled.push(
        Notifications.scheduleNotificationAsync({
          content: {
            title: APP_NAME,
            body: affirmation.text,
            data: { affirmationId: affirmation.id },
            sound: false,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireDate,
          },
        }),
      );
    }
  }

  // One-time same-day reminder right after the opt-in (Case B only — the
  // plan already guarantees no normal slot fires today). Same personalized
  // selector, same topics and entitlement, excluded from repeating within
  // this batch like every other slot.
  if (firstReminder && firstReminder.getTime() > now.getTime() + 60_000) {
    const affirmation = notificationAffirmation(profile, isPremium, firstReminder, usedIds, topics);
    scheduled.push(
      Notifications.scheduleNotificationAsync({
        content: {
          title: APP_NAME,
          body: affirmation.text,
          data: { affirmationId: affirmation.id },
          sound: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: firstReminder,
        },
      }),
    );
  }
  await Promise.all(scheduled);
}
