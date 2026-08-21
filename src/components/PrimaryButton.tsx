import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { fonts, radius, spacing } from '@/theme/tokens';

export function PrimaryButton({
  label,
  onPress,
  variant = 'solid',
  dark,
  loading = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'ghost';
  /** Whether the button sits on a dark background. */
  dark: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const solidBg = dark ? '#F2F1EC' : '#23241F';
  const solidText = dark ? '#1B1C24' : '#F7F4EE';
  const ghostText = dark ? '#F2F1EC' : '#23241F';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'solid' ? { backgroundColor: solidBg } : styles.ghost,
        pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'solid' ? solidText : ghostText} />
      ) : (
        <Text style={[styles.label, { color: variant === 'solid' ? solidText : ghostText }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
  },
});
