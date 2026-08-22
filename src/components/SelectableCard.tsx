import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GOAL_ICONS, Icon } from '@/components/Icon';
import type { CategoryId } from '@/models/types';
import { usePreferences } from '@/state/PreferencesContext';
import { fonts, radius, spacing } from '@/theme/tokens';

/**
 * Goal chip for the 2-column selection grid (onboarding step 2 and
 * "Moji ciljevi"): thin line icon + label; selected fills with ink.
 */
export function GoalChip({
  categoryId,
  label,
  selected,
  onPress,
}: {
  categoryId: CategoryId;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { tokens } = usePreferences();
  const fg = selected ? tokens.ctaFg : tokens.ink;
  const icon = GOAL_ICONS[categoryId];

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? tokens.ctaBg : tokens.outline,
          backgroundColor: selected ? tokens.ctaBg : 'transparent',
        },
      ]}>
      {icon && (
        <View style={styles.chipIcon}>
          <Icon name={icon} size={20} color={fg} />
        </View>
      )}
      <Text style={[styles.chipLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Selectable row for onboarding/settings choices: quiet outline, ghost fill
 * and a check mark when selected; optional secondary description line.
 */
export function SelectableRow({
  label,
  description,
  selected,
  onPress,
  multi = false,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** Checkbox semantics for multi-select lists (default: radio). */
  multi?: boolean;
}) {
  const { tokens } = usePreferences();
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      onPress={onPress}
      style={[
        styles.row,
        {
          borderColor: selected ? tokens.ink : tokens.line,
          backgroundColor: selected ? tokens.ghost : 'transparent',
        },
      ]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: tokens.ink }]}>{label}</Text>
        {description ? (
          <Text style={[styles.rowDescription, { color: tokens.sub }]}>{description}</Text>
        ) : null}
      </View>
      <View style={{ opacity: selected ? 1 : 0 }}>
        <Icon name="check" size={16} color={tokens.ink} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 48,
  },
  chipIcon: {
    opacity: 0.85,
  },
  chipLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 18,
    flexShrink: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.smd,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 52,
    marginBottom: spacing.sm + 2,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 15.5,
    lineHeight: 21,
  },
  rowDescription: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
  },
});
