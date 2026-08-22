import { Redirect, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ThemedBackground } from '@/components/ThemedBackground';
import { usePreferences } from '@/state/PreferencesContext';
import { fonts } from '@/theme/tokens';

/**
 * Entry: returning users go straight to the tabs; first launch shows the
 * quiet branded splash (dot · wordmark · tagline) before onboarding.
 */
export default function Index() {
  const { preferences } = usePreferences();

  if (preferences.onboardingCompleted) return <Redirect href="/(tabs)" />;
  return <BrandSplash />;
}

function BrandSplash() {
  const router = useRouter();
  const { theme, tokens } = usePreferences();

  useEffect(() => {
    const timer = setTimeout(() => router.replace('/onboarding'), 1800);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <ThemedBackground theme={theme}>
      <Animated.View entering={FadeInUp.duration(900)} style={styles.center}>
        <View style={[styles.dot, { backgroundColor: tokens.ink }]} />
        <Text style={[styles.wordmark, { color: tokens.ink }]}>Sebi</Text>
        <Text style={[styles.tagline, { color: tokens.sub }]}>Dobre misli za svaki dan.</Text>
      </Animated.View>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    opacity: 0.85,
  },
  wordmark: {
    fontFamily: fonts.serif,
    fontSize: 42,
    letterSpacing: 0.5,
  },
  tagline: {
    fontFamily: fonts.sans,
    fontSize: 13.5,
    letterSpacing: 0.2,
  },
});
