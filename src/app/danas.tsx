import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

import { setDanasFocus } from '@/services/danas-focus';
import { usePreferences } from '@/state/PreferencesContext';

/**
 * Deep-link entry: sebi://danas?affirmationId=<id> (used by the native
 * widget's PendingIntent; notification taps use the same focus store
 * imperatively). Hands the id to the consume-once focus store and lands on
 * the real Danas tab — no separate detail screen. A missing/malformed id
 * simply opens normal Danas; pre-onboarding links defer to the normal
 * entry flow.
 */
export default function DanasDeepLink() {
  const { preferences } = usePreferences();
  const { affirmationId } = useLocalSearchParams<{ affirmationId?: string }>();

  if (!preferences.onboardingCompleted) return <Redirect href="/" />;
  if (typeof affirmationId === 'string' && affirmationId.length > 0) {
    setDanasFocus(affirmationId);
  }
  return <Redirect href="/(tabs)" />;
}
