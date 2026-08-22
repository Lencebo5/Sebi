import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { GoalChip } from '@/components/SelectableCard';
import { GOAL_CATEGORIES } from '@/content/categories';
import type { CategoryId } from '@/models/types';
import { usePreferences } from '@/state/PreferencesContext';
import { spacing } from '@/theme/tokens';

/** The same 2×4 goal grid as onboarding, editable any time. */
export default function Goals() {
  const { preferences, updatePreferences } = usePreferences();

  const toggle = (id: CategoryId) => {
    const goals = preferences.goals.includes(id)
      ? preferences.goals.filter((g) => g !== id)
      : [...preferences.goals, id];
    updatePreferences({ goals });
  };

  return (
    <Screen back title="Moji ciljevi" subtitle="Tvoje misli se prilagođavaju izabranim oblastima.">
      <View style={styles.grid}>
        {GOAL_CATEGORIES.map((category) => (
          <View key={category.id} style={styles.cell}>
            <GoalChip
              categoryId={category.id}
              label={category.goalName ?? category.name}
              selected={preferences.goals.includes(category.id)}
              onPress={() => toggle(category.id)}
            />
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: spacing.sm,
  },
  cell: {
    flexBasis: '48%',
    flexGrow: 1,
  },
});
