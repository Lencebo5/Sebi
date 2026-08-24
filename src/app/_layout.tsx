import {
  Literata_400Regular,
  Literata_400Regular_Italic,
  Literata_500Medium,
} from '@expo-google-fonts/literata';
import {
  SchibstedGrotesk_400Regular,
  SchibstedGrotesk_500Medium,
  SchibstedGrotesk_600SemiBold,
  useFonts,
} from '@expo-google-fonts/schibsted-grotesk';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastProvider } from '@/components/Toast';
import { FREE_LIMITS, PREMIUM_LIMITS } from '@/constants/appConfig';
import { setDanasFocus } from '@/services/danas-focus';
import {
  configureNotificationHandling,
  observeNotificationTaps,
  rescheduleNotifications,
} from '@/services/notifications';
import { effectiveTopics } from '@/services/topics';
import { PreferencesProvider, usePreferences } from '@/state/PreferencesContext';
import { SubscriptionProvider, useSubscription } from '@/state/SubscriptionContext';
import { refreshSebiWidget } from '@/widgets/widget-refresh';

SplashScreen.preventAutoHideAsync();
configureNotificationHandling();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Literata_400Regular,
    Literata_400Regular_Italic,
    Literata_500Medium,
    SchibstedGrotesk_400Regular,
    SchibstedGrotesk_500Medium,
    SchibstedGrotesk_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SubscriptionProvider>
        <PreferencesProvider>
          <ToastProvider>
            <AppShell />
          </ToastProvider>
        </PreferencesProvider>
      </SubscriptionProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const { ready, preferences, theme } = usePreferences();
  const { isPremium } = useSubscription();

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
      // Once per app open: after storage/content migrations settle, give any
      // placed home-screen widget a chance to catch up.
      refreshSebiWidget();
    }
  }, [ready]);

  // Notification tap → Danas showing the exact tapped affirmation,
  // regardless of which screen was open (or whether the app was killed).
  // The focus store is consume-once, so navigation happens exactly once.
  useEffect(() => {
    if (!ready || !preferences.onboardingCompleted) return;
    return observeNotificationTaps((affirmationId) => {
      setDanasFocus(affirmationId);
      router.navigate('/(tabs)');
    });
  }, [ready, preferences.onboardingCompleted]);

  // Keep the local notification schedule in sync with settings, goals,
  // topics and plan — refreshed on every app open so the 7-day horizon
  // rolls forward.
  useEffect(() => {
    if (!ready || !preferences.onboardingCompleted) return;
    void rescheduleNotifications({
      settings: preferences.notifications,
      profile: preferences.profile,
      isPremium,
      maxPerDay: isPremium
        ? PREMIUM_LIMITS.notificationsPerDay
        : FREE_LIMITS.notificationsPerDay,
      topics: effectiveTopics('notification', preferences.topics, isPremium),
    });
  }, [
    ready,
    preferences.onboardingCompleted,
    preferences.notifications,
    preferences.profile,
    preferences.topics,
    isPremium,
  ]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="viewer/[categoryId]"
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen
          name="paywall"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </>
  );
}
