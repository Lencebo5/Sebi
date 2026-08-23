import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useToast } from '@/components/Toast';
import { FREE_LIMITS, PREMIUM_LIMITS } from '@/constants/appConfig';
import { track } from '@/services/analytics';
import {
  requestFirstOptInReminder,
  requestNotificationPermission,
} from '@/services/notifications';
import {
  planFirstOptInReminder,
  shouldShowNotificationOptIn,
} from '@/services/notification-optin';
import { usePreferences } from '@/state/PreferencesContext';
import { useSubscription } from '@/state/SubscriptionContext';
import { fonts, radius, spacing } from '@/theme/tokens';

/** How long after the first Za danas message is visible the prompt appears. */
const PROMPT_DELAY_MS = 1800;

/**
 * Post-first-message reminder opt-in (1.3.1 semantics). Shown on the Danas
 * screen only after onboarding is complete and the first personalized
 * message is already visible — never during onboarding and never when
 * reminders are already enabled.
 *
 * `notificationOptInPromptSeen` is persisted ONLY on an explicit decision
 * ("Uključi dnevni podsetnik" — including a permission denial — or
 * "Ne sada"). Backgrounding, killing the app or the Android back button
 * leave the prompt eligible for a later visit. The backdrop deliberately
 * does not dismiss: "Ne sada" is the one clear, non-coercive exit.
 *
 * Enabling applies first-reminder timing (services/notification-optin.ts):
 * if today's normal slot already passed, a one-time personalized reminder
 * lands ~90 minutes from now (never after 21:30 local) — delivered through
 * the normal reschedule pipeline, so no duplicates and no stale leftovers.
 */
export function NotificationOptIn() {
  const { tokens, preferences, updatePreferences } = usePreferences();
  const { isPremium } = useSubscription();
  const { showToast } = useToast();
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);

  const eligible = shouldShowNotificationOptIn(preferences);

  useEffect(() => {
    if (!eligible || shownRef.current) return;
    const timer = setTimeout(() => {
      // Once per screen visit; NOT persisted — only a decision persists.
      shownRef.current = true;
      setVisible(true);
      track('notification_optin_shown');
    }, PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [eligible]);

  const markHandled = () => updatePreferences({ notificationOptInPromptSeen: true });

  const enable = async () => {
    setVisible(false);
    // No-op system prompt when permission is already granted — the service
    // early-returns on granted and only asks the OS when it may.
    const granted = await requestNotificationPermission();
    markHandled(); // explicit decision, whatever the OS answered
    if (!granted) {
      // Reminders stay off; Podešavanja → Podsetnici remains the retry path.
      showToast('Obaveštenja možeš uključiti u podešavanjima telefona.');
      return;
    }
    const maxPerDay = isPremium
      ? PREMIUM_LIMITS.notificationsPerDay
      : FREE_LIMITS.notificationsPerDay;
    const plan = planFirstOptInReminder(
      new Date(),
      preferences.notifications.times.slice(0, maxPerDay),
    );
    if (plan.fireDate) requestFirstOptInReminder(plan.fireDate);
    track('notification_optin_first_scheduled', { same_day: plan.sameDay });
    track('notification_optin_enabled');
    // Enabling triggers the normal reschedule (layout effect), which owns
    // the whole schedule — including the one-time first reminder above.
    updatePreferences({ notifications: { ...preferences.notifications, enabled: true } });
    showToast('Dnevni podsetnik je uključen.');
  };

  const decline = () => {
    setVisible(false);
    markHandled();
    track('notification_optin_declined');
  };

  /** Android back button: close WITHOUT consuming the prompt. */
  const dismissWithoutDecision = () => setVisible(false);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={dismissWithoutDecision}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: tokens.surface }]}>
          <Text style={[styles.title, { color: tokens.ink }]}>
            Želiš jednu Sebi poruku svakog dana?
          </Text>
          <Text style={[styles.sub, { color: tokens.sub }]}>Jedna misao, u pravo vreme.</Text>
          <PrimaryButton label="Uključi dnevni podsetnik" onPress={() => void enable()} />
          <Pressable accessibilityRole="button" onPress={decline} hitSlop={8}>
            <Text style={[styles.decline, { color: tokens.sub }]}>Ne sada</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(30, 26, 20, 0.35)',
  },
  sheet: {
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 30,
  },
  sub: {
    fontFamily: fonts.sans,
    fontSize: 14.5,
    marginBottom: spacing.sm,
  },
  decline: {
    fontFamily: fonts.sansMedium,
    fontSize: 14.5,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
