import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThemedBackground } from '@/components/ThemedBackground';
import { SHARE_BRAND } from '@/constants/appConfig';
import type { Affirmation } from '@/models/types';
import type { AppTheme } from '@/theme/themes';
import { fonts, tokensFor, withAlpha } from '@/theme/tokens';

/**
 * 4:5 share card (rendered at 540×675, captured and upscaled to 1080×1350).
 * A dedicated composition — never a screenshot of the UI. Three templates
 * from the design, all inheriting the user's active theme:
 *  - `theme`     centered serif thought on the theme background
 *  - `ink`       editorial dark card with an oversized quote mark
 *  - `framed`    light card with a thin inset border and the brand dot
 */
export const SHARE_CARD_WIDTH = 540;
export const SHARE_CARD_HEIGHT = 675;

export type ShareTemplate = 'theme' | 'ink' | 'framed';

export const SHARE_TEMPLATES: ShareTemplate[] = ['theme', 'ink', 'framed'];

export const ShareCard = React.forwardRef<
  View,
  { affirmation: Affirmation; theme: AppTheme; template: ShareTemplate }
>(function ShareCard({ affirmation, theme, template }, ref) {
  const tokens = tokensFor(theme);

  if (template === 'ink') {
    return (
      <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: tokens.ctaBg }]}>
        <View style={styles.inkContent}>
          <Text style={[styles.inkQuote, { color: withAlpha(theme.dark ? theme.b : theme.a, 0.4) }]}>
            „
          </Text>
          <Text style={[styles.inkText, { color: tokens.ctaFg }]}>{affirmation.text}</Text>
          <Text style={[styles.inkBrand, { color: withAlpha(theme.dark ? theme.b : theme.a, 0.5) }]}>
            {SHARE_BRAND.toUpperCase()}
          </Text>
        </View>
      </View>
    );
  }

  if (template === 'framed') {
    return (
      <View ref={ref} collapsable={false} style={[styles.card, { backgroundColor: theme.a }]}>
        <View
          pointerEvents="none"
          style={[styles.frame, { borderColor: withAlpha(theme.ink, 0.22) }]}
        />
        <View style={styles.framedContent}>
          <View style={[styles.dot, { backgroundColor: theme.ink }]} />
          <Text style={[styles.framedText, { color: theme.ink }]}>{affirmation.text}</Text>
        </View>
        <Text style={[styles.framedBrand, { color: tokens.sub }]}>{SHARE_BRAND}</Text>
      </View>
    );
  }

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <ThemedBackground theme={theme} style={StyleSheet.absoluteFill}>
        <View style={styles.themeContent}>
          <Text style={[styles.themeText, { color: theme.ink }]}>{affirmation.text}</Text>
          <Text style={[styles.themeBrand, { color: tokens.sub }]}>{SHARE_BRAND}</Text>
        </View>
      </ThemedBackground>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    overflow: 'hidden',
  },
  // Template: theme
  themeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 60,
  },
  themeText: {
    fontFamily: fonts.serif,
    fontSize: 42,
    lineHeight: 60,
    textAlign: 'center',
  },
  themeBrand: {
    fontFamily: fonts.serif,
    fontSize: 22,
    marginTop: 44,
  },
  // Template: ink
  inkContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 66,
  },
  inkQuote: {
    fontFamily: fonts.serif,
    fontSize: 66,
    lineHeight: 46,
  },
  inkText: {
    fontFamily: fonts.serifItalic,
    fontSize: 40,
    lineHeight: 60,
    marginTop: 30,
  },
  inkBrand: {
    fontFamily: fonts.sansMedium,
    fontSize: 17,
    letterSpacing: 4,
    marginTop: 54,
  },
  // Template: framed
  frame: {
    position: 'absolute',
    top: 30,
    left: 30,
    right: 30,
    bottom: 30,
    borderWidth: 1.5,
    borderRadius: 7,
  },
  framedContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 74,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 36,
  },
  framedText: {
    fontFamily: fonts.serif,
    fontSize: 38,
    lineHeight: 57,
    textAlign: 'center',
  },
  framedBrand: {
    position: 'absolute',
    bottom: 56,
    alignSelf: 'center',
    fontFamily: fonts.serif,
    fontSize: 20,
  },
});
