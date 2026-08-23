import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useToast } from '@/components/Toast';
import { track } from '@/services/analytics';
import { requestNotificationPermission } from '@/services/notifications';
import { shouldShowNotificationOptIn } from '@/services/notification-optin';
import { usePreferences } from '@/state/PreferencesContext';
import { fonts, radius, spacing } from '@/theme/tokens';

/** How long after the first Za danas message is visible the prompt appears. */
const PROMPT_DELAY_MS = 1800;

/**
 * Post-first-message reminder opt-in (task Phase 2). Shown ONCE, on the
 * Danas screen, only after onboarding is complete and the first
 * personalized message is already visible — never during onboarding, never
 * when reminders are already enabled, and never again after "Ne sada"
 * (Podešavanja → Podsetnici stays available). The OS permission dialog is
 * requested exclusively from the explicit CTA tap.
 */
export function NotificationOptIn() {
  const { tokens, preferences, updatePreferences } = usePreferences();
  const { showToast } = useToast();
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);

  const eligible = shouldShowNotificationOptIn(preferences);

  useEffect(() => {
    if (!eligible || shownRef.current) return;
    const timer = setTimeout(() => {
      shownRef.current = true;
      setVisible(true);
      track('notification_optin_shown');
      // Persist immediately: the prompt appears once, ever.
      updatePreferences({ notificationOptInPromptSeen: true });
    }, PROMPT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [eligible, updatePreferences]);

  const enable = async () => {
    setVisible(false);
    const granted = await requestNotificationPermission();
    if (granted) {
      // Free plan: effectively one reminder/day (the schedule caps times);
      // the default times keep 08:00 first — changeable in Podsetnici.
      updatePreferences({ notifications: { ...preferences.notifications, enabled: true } });
      track('notification_optin_enabled');
      showToast('Dnevni podsetnik je uključen.');
    } else {
      showToast('Obaveštenja možeš uključiti u podešavanjima telefona.');
    }
  };

  const decline = () => {
    setVisible(false);
    track('notification_optin_declined');
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={decline}>
      <Pressable style={styles.backdrop} onPress={decline}>
        <Pressable
          style={[styles.sheet, { backgroundColor: tokens.surface }]}
          onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: tokens.ink }]}>
            Želiš jednu Sebi poruku svakog dana?
          </Text>
          <Text style={[styles.sub, { color: tokens.sub }]}>Jedna misao, u pravo vreme.</Text>
          <PrimaryButton label="Uključi dnevni podsetnik" onPress={() => void enable()} />
          <Pressable accessibilityRole="button" onPress={decline} hitSlop={8}>
            <Text style={[styles.decline, { color: tokens.sub }]}>Ne sada</Text>
          </Pressable>
        </Pressable>
      </Pressable>
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
