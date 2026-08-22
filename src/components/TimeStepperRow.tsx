import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { usePreferences } from '@/state/PreferencesContext';
import { fonts, spacing } from '@/theme/tokens';

/**
 * One reminder time with quiet − / + hour steppers, per the design's
 * onboarding and Podsetnici screens. Locked rows (free plan) show a lock
 * and route to the paywall instead.
 */
export function TimeStepperRow({
  time,
  onDecrement,
  onIncrement,
  locked = false,
  onLockedPress,
  bordered = false,
}: {
  time: string;
  onDecrement: () => void;
  onIncrement: () => void;
  /** Free plan: reminders beyond the first are Premium. */
  locked?: boolean;
  onLockedPress?: () => void;
  /** Hairline under the row (onboarding list style). */
  bordered?: boolean;
}) {
  const { tokens } = usePreferences();

  return (
    <View
      style={[
        styles.row,
        bordered && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.line },
        locked && { opacity: 0.45 },
      ]}>
      <Text style={[styles.time, { color: tokens.ink }]}>{time}</Text>
      {locked ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Premium podsetnik"
          onPress={onLockedPress}
          hitSlop={8}
          style={styles.lockRow}>
          <Icon name="lock" size={14} color={tokens.faint} />
          <Text style={[styles.lockLabel, { color: tokens.faint }]}>Premium</Text>
        </Pressable>
      ) : (
        <View style={styles.steppers}>
          <Stepper icon="minus" label="Sat ranije" onPress={onDecrement} />
          <Stepper icon="plus" label="Sat kasnije" onPress={onIncrement} />
        </View>
      )}
    </View>
  );
}

function Stepper({
  icon,
  label,
  onPress,
}: {
  icon: 'plus' | 'minus';
  label: string;
  onPress: () => void;
}) {
  const { tokens } = usePreferences();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.stepper,
        { backgroundColor: tokens.ghost },
        pressed && { opacity: 0.6 },
      ]}>
      <Icon name={icon} size={14} color={tokens.sub} strokeWidth={2} />
    </Pressable>
  );
}

/** Shift an "HH:MM" time by whole hours, wrapping at midnight. */
export function bumpHour(time: string, delta: number): string {
  const hour = (parseInt(time.slice(0, 2), 10) + delta + 24) % 24;
  return `${String(hour).padStart(2, '0')}${time.slice(2)}`;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.xs,
  },
  time: {
    fontFamily: fonts.sansMedium,
    fontSize: 20,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  steppers: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
  },
  lockLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
  },
});
