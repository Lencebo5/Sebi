import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SHARE_BRAND } from '@/constants/appConfig';
import type { Affirmation } from '@/models/types';
import type { AppTheme } from '@/theme/themes';
import { fonts } from '@/theme/tokens';

/**
 * 4:5 share card (rendered at 540×675, captured and upscaled to
 * 1080×1350). A dedicated composition — never a screenshot of the UI.
 */
export const SHARE_CARD_WIDTH = 540;
export const SHARE_CARD_HEIGHT = 675;

export const ShareCard = React.forwardRef<View, { affirmation: Affirmation; theme: AppTheme }>(
  function ShareCard({ affirmation, theme }, ref) {
    return (
      <View ref={ref} collapsable={false} style={styles.card}>
        <LinearGradient colors={theme.gradient} style={StyleSheet.absoluteFill}>
          <View pointerEvents="none" style={[styles.glow, { backgroundColor: theme.glow }]} />
        </LinearGradient>
        <View style={styles.content}>
          <View style={[styles.rule, { backgroundColor: theme.subtle }]} />
          <Text style={[styles.text, { color: theme.text }]}>{affirmation.text}</Text>
          <View style={[styles.rule, { backgroundColor: theme.subtle }]} />
        </View>
        <Text style={[styles.brand, { color: theme.subtle }]}>{SHARE_BRAND.toUpperCase()}</Text>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: '18%',
    alignSelf: 'center',
    width: 460,
    height: 460,
    borderRadius: 230,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 56,
    gap: 36,
  },
  rule: {
    width: 36,
    height: 2,
    borderRadius: 1,
    alignSelf: 'center',
    opacity: 0.7,
  },
  text: {
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 48,
    textAlign: 'center',
  },
  brand: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    letterSpacing: 4,
  },
});
