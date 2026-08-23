import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { TopicModeSection } from '@/components/TopicModeSection';
import { bumpHour, TimeStepperRow } from '@/components/TimeStepperRow';
import { useToast } from '@/components/Toast';
import { FREE_LIMITS, PREMIUM_LIMITS } from '@/constants/appConfig';
import { track } from '@/services/analytics';
import {
  isNotificationPermissionDenied,
  requestNotificationPermission,
} from '@/services/notifications';
import { usePreferences } from '@/state/PreferencesContext';
import { useSubscription } from '@/state/SubscriptionContext';
import { fonts, radius, spacing } from '@/theme/tokens';

/**
 * Reminders per the design: master toggle, one row per time with quiet
 * − / + hour steppers, "Dodaj vreme" to append. On the free plan only the
 * first reminder is active — the rest carry a discreet Premium lock.
 * A soft banner appears when system notifications are denied.
 */
export default function Reminders() {
  const router = useRouter();
  const { tokens, preferences, updatePreferences, setSurfaceTopics } = usePreferences();
  const { isPremium } = useSubscription();
  const { showToast } = useToast();
  const [denied, setDenied] = useState(false);

  const { notifications } = preferences;
  const maxPerDay = PREMIUM_LIMITS.notificationsPerDay;

  useEffect(() => {
    void isNotificationPermissionDenied().then(setDenied);
  }, []);

  const setEnabled = async (enabled: boolean) => {
    updatePreferences({ notifications: { ...notifications, enabled } });
    if (enabled) {
      await requestNotificationPermission();
      setDenied(await isNotificationPermissionDenied());
      track('notification_enabled', { times: notifications.times.length });
    }
  };

  const setTime = (index: number, delta: number) => {
    const times = notifications.times.map((t, i) => (i === index ? bumpHour(t, delta) : t));
    updatePreferences({ notifications: { ...notifications, times } });
  };

  const addTime = () => {
    if (!isPremium) {
      router.push('/paywall?source=reminders');
      return;
    }
    if (notifications.times.length >= maxPerDay) {
      showToast(`Najviše ${maxPerDay} podsetnika dnevno.`);
      return;
    }
    updatePreferences({
      notifications: { ...notifications, times: [...notifications.times, '17:00'] },
    });
  };

  return (
    <Screen back title="Podsetnici">
      {denied && (
        <View style={[styles.deniedCard, { backgroundColor: tokens.ghost }]}>
          <View style={styles.deniedIcon}>
            <Icon name="bell" size={18} color={tokens.sub} strokeWidth={1.6} />
          </View>
          <View style={styles.deniedBody}>
            <Text style={[styles.deniedTitle, { color: tokens.ink }]}>
              Obaveštenja su isključena
            </Text>
            <Text style={[styles.deniedText, { color: tokens.sub }]}>
              Uključi ih u podešavanjima telefona da bi Sebi mogao da ti šalje misli.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void Linking.openSettings()}
              hitSlop={6}>
              <Text style={[styles.deniedLink, { color: tokens.ink }]}>
                Otvori podešavanja telefona
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.toggleRow}>
        <Text style={[styles.toggleLabel, { color: tokens.ink }]}>Dnevni podsetnici</Text>
        <Switch
          value={notifications.enabled}
          onValueChange={(v) => void setEnabled(v)}
          trackColor={{ false: tokens.line, true: tokens.ink }}
          thumbColor={tokens.surface}
          ios_backgroundColor={tokens.line}
        />
      </View>

      <View style={{ opacity: notifications.enabled ? 1 : 0.35 }}>
        {notifications.times.map((time, i) => {
          const locked = !isPremium && i >= FREE_LIMITS.notificationsPerDay;
          return (
            <TimeStepperRow
              key={i}
              time={time}
              locked={locked}
              onLockedPress={() => router.push('/paywall?source=reminders')}
              onDecrement={() => setTime(i, -1)}
              onIncrement={() => setTime(i, 1)}
            />
          );
        })}
        <Pressable accessibilityRole="button" onPress={addTime} style={styles.addTimeRow}>
          <Icon name="plus" size={14} color={tokens.sub} strokeWidth={2} />
          <Text style={[styles.addTimeLabel, { color: tokens.sub }]}>Dodaj vreme</Text>
        </Pressable>
        {!isPremium && (
          <Text style={[styles.freeNote, { color: tokens.faint }]}>
            Besplatna verzija uključuje jedan podsetnik dnevno. Više njih je deo Sebi Premium
            paketa.
          </Text>
        )}
      </View>

      <TopicModeSection
        title="Teme podsetnika"
        selection={preferences.topics.notifications}
        isPremium={isPremium}
        seedCategoryIds={preferences.topics.feed.categoryIds}
        onChange={(selection) => setSurfaceTopics('notifications', selection)}
        onLockedCustom={() => router.push('/paywall?source=reminder_topics')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  deniedCard: {
    flexDirection: 'row',
    gap: spacing.smd,
    padding: spacing.md - 2,
    borderRadius: radius.card,
    marginBottom: spacing.sm,
  },
  deniedIcon: {
    marginTop: 2,
  },
  deniedBody: {
    flex: 1,
    gap: 3,
  },
  deniedTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13.5,
  },
  deniedText: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    lineHeight: 18,
  },
  deniedLink: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12.5,
    marginTop: spacing.sm - 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  toggleLabel: {
    fontFamily: fonts.sans,
    fontSize: 15.5,
  },
  addTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.xs,
  },
  addTimeLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
  freeNote: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: spacing.xs,
    paddingTop: 2,
  },
});
