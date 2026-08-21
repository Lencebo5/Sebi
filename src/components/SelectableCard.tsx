import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { AppTheme } from '@/theme/themes';
import { fonts, radius, spacing } from '@/theme/tokens';

/** Selectable option card used in onboarding and goal settings. */
export function SelectableCard({
  label,
  selected,
  onPress,
  theme,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: AppTheme;
}) {
  const s = theme.surface;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: s.card,
          borderColor: selected ? s.accent : s.border,
        },
        pressed && { opacity: 0.85 },
      ]}>
      <Text style={[styles.label, { color: s.text }]}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={18} color={s.accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    flexShrink: 1,
  },
});
