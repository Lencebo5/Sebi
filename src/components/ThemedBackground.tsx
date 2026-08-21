import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { AppTheme } from '@/theme/themes';

/**
 * Full-bleed theme background: vertical gradient plus a soft off-center
 * glow. Everything is drawn locally — no images.
 */
export function ThemedBackground({
  theme,
  children,
}: {
  theme: AppTheme;
  children?: React.ReactNode;
}) {
  return (
    <LinearGradient colors={theme.gradient} style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={[styles.glow, { backgroundColor: theme.glow }]} />
      <View
        pointerEvents="none"
        style={[styles.glowSmall, { backgroundColor: theme.glow }]}
      />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: '12%',
    alignSelf: 'center',
    width: 420,
    height: 420,
    borderRadius: 210,
  },
  glowSmall: {
    position: 'absolute',
    bottom: '-8%',
    left: '-20%',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
});
