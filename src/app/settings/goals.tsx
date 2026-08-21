import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { SelectableCard } from '@/components/SelectableCard';
import { GOAL_CATEGORIES } from '@/content/categories';
import type { CategoryId } from '@/models/types';
import { usePreferences } from '@/state/PreferencesContext';
import { spacing } from '@/theme/tokens';

export default function Goals() {
  const { theme, preferences, updatePreferences } = usePreferences();

  const toggle = (id: CategoryId) => {
    const goals = preferences.goals.includes(id)
      ? preferences.goals.filter((g) => g !== id)
      : [...preferences.goals, id];
    updatePreferences({ goals });
  };

  return (
    <Screen
      back
      title="Moji ciljevi"
      subtitle="Tvoj dnevni izbor misli prati ono što ovde izabereš.">
      <View style={styles.list}>
        {GOAL_CATEGORIES.map((category) => (
          <SelectableCard
            key={category.id}
            label={category.name}
            selected={preferences.goals.includes(category.id)}
            onPress={() => toggle(category.id)}
            theme={theme}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm + 2,
  },
});
