import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { FREE_LIMITS, PREMIUM_LIMITS } from '@/constants/appConfig';
import { track } from '@/services/analytics';
import { formatTime } from '@/services/dates';
import { requestNotificationPermission } from '@/services/notifications';
import { usePreferences } from '@/state/PreferencesContext';
import { useSubscription } from '@/state/SubscriptionContext';
import { fonts, radius, spacing } from '@/theme/tokens';

/** Selectable reminder times — every full hour from 06:00 to 23:00. */
const TIME_OPTIONS = Array.from({ length: 18 }, (_, i) => formatTime(6 + i, 0));

export default function Reminders() {
  const router = useRouter();
  const { theme, preferences, updatePreferences } = usePreferences();
  const { isPremium } = useSubscription();
  const s = theme.surface;

  const { notifications } = preferences;
  const maxPerDay = isPremium
    ? PREMIUM_LIMITS.notificationsPerDay
    : FREE_LIMITS.notificationsPerDay;

  const setEnabled = async (enabled: boolean) => {
    updatePreferences({ notifications: { ...notifications, enabled } });
    if (enabled) {
      await requestNotificationPermission();
      track('notification_enabled', { times: notifications.times.length });
    }
  };

  const toggleTime = (time: string) => {
    const selected = notifications.times.includes(time);
    if (selected) {
      updatePreferences({
        notifications: {
          ...notifications,
          times: notifications.times.filter((t) => t !== time),
        },
      });
      return;
    }
    if (notifications.times.length >= maxPerDay) {
      if (!isPremium) router.push('/paywall?source=reminders');
      return;
    }
    updatePreferences({
      notifications: { ...notifications, times: [...notifications.times, time].sort() },
    });
  };

  return (
    <Screen
      back
      title="Podsetnici"
      subtitle={
        isPremium
          ? `Do ${PREMIUM_LIMITS.notificationsPerDay} podsetnika dnevno, u vreme koje ti odgovara.`
          : `Besplatno: ${FREE_LIMITS.notificationsPerDay} podsetnik dnevno. Uz Premium do ${PREMIUM_LIMITS.notificationsPerDay}.`
      }>
      <View style={[styles.switchRow, { backgroundColor: s.card, borderColor: s.border }]}>
        <Text style={[styles.switchLabel, { color: s.text }]}>Dnevni podsetnici</Text>
        <Switch value={notifications.enabled} onValueChange={(v) => void setEnabled(v)} />
      </View>

      {notifications.enabled && (
        <>
          <Text style={[styles.sectionLabel, { color: s.subtext }]}>
            VREME ({notifications.times.length}/{maxPerDay})
          </Text>
          <View style={styles.chipWrap}>
            {TIME_OPTIONS.map((time) => {
              const selected = notifications.times.includes(time);
              return (
                <Pressable
                  key={time}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => toggleTime(time)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: s.card,
                      borderColor: selected ? s.accent : s.border,
                    },
                  ]}>
                  <Text style={[styles.chipText, { color: selected ? s.text : s.subtext }]}>
                    {time}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {!isPremium && (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/paywall?source=reminders')}
              hitSlop={8}>
              <Text style={[styles.upsell, { color: s.accent }]}>
                Želiš više podsetnika dnevno? Pogledaj Premium →
              </Text>
            </Pressable>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  switchLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
  },
  sectionLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    letterSpacing: 1.8,
    marginTop: spacing.lg,
    marginBottom: spacing.sm + 2,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md - 2,
  },
  chipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
  upsell: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    marginTop: spacing.lg,
  },
});
