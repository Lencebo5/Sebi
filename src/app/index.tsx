import { Redirect } from 'expo-router';
import React from 'react';

import { usePreferences } from '@/state/PreferencesContext';

export default function Index() {
  const { preferences } = usePreferences();
  return preferences.onboardingCompleted ? (
    <Redirect href="/(tabs)" />
  ) : (
    <Redirect href="/onboarding" />
  );
}
