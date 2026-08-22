import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { APP_NAME, NOTIFICATION_HORIZON_DAYS } from '@/constants/appConfig';
import type { NotificationSettings, PersonalizationProfile } from '@/models/types';
import { notificationAffirmation } from '@/services/dailyContent';
import { parseTime } from '@/services/dates';

/**
 * Local scheduled notifications — no server involved.
 *
 * Local notifications can't pick a fresh affirmation at fire time, so we
 * pre-schedule concrete date triggers for the next NOTIFICATION_HORIZON_DAYS
 * days, each with a different affirmation, and rebuild the schedule on every
 * app open and settings change.
 */

export function configureNotificationHandling() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Whether the user has hard-denied notifications in system settings. */
export async function isNotificationPermissionDenied(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  return !current.granted && !current.canAskAgain;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export interface ScheduleInput {
  settings: NotificationSettings;
  profile: PersonalizationProfile;
  isPremium: boolean;
  /** Plan-dependent cap on times per day. */
  maxPerDay: number;
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
}: ScheduleInput): Promise<void> {
  if (Platform.OS === 'web') return;

  await Notifications.cancelAllScheduledNotificationsAsync();
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

      const affirmation = notificationAffirmation(profile, isPremium, fireDate, usedIds);
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
  await Promise.all(scheduled);
}
