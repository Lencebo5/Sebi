import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { usePreferences } from '@/state/PreferencesContext';
import { fonts, radius, spacing } from '@/theme/tokens';

/**
 * Solid CTA per the design: ink background, theme-surface text, 54px tall,
 * 16px radius, slight press scale. The ghost variant is a quiet outline.
 */
export function PrimaryButton({
  label,
  onPress,
  variant = 'solid',
  loading = false,
  loadingLabel,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'ghost';
  loading?: boolean;
  /** Optional label shown next to the spinner (e.g. "Obrada…"). */
  loadingLabel?: string;
  style?: ViewStyle;
}) {
  const { tokens } = usePreferences();
  const solid = variant === 'solid';
  const textColor = solid ? tokens.ctaFg : tokens.ink;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        solid
          ? { backgroundColor: tokens.ctaBg }
          : { borderWidth: 1, borderColor: tokens.outline },
        pressed && { transform: [{ scale: 0.985 }] },
        style,
      ]}>
      {loading && <ActivityIndicator size="small" color={textColor} />}
      {(!loading || loadingLabel) && (
        <Text style={[styles.label, { color: textColor }]}>
          {loading ? loadingLabel : label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    letterSpacing: 0.2,
  },
});
