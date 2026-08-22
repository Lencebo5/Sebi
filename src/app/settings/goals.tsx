import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { GoalChip, SelectableRow } from '@/components/SelectableCard';
import { useToast } from '@/components/Toast';
import { GOAL_CATEGORIES } from '@/content/categories';
import {
  ADDRESS_MODE_OPTIONS,
  AGE_OPTIONS,
  CHALLENGE_OPTIONS,
  DELIVERY_STYLE_OPTIONS,
  LIFE_CONTEXT_NONE_LABEL,
  LIFE_CONTEXT_OPTIONS,
  MAX_CHALLENGES,
  MAX_GOALS,
  MAX_LIFE_CONTEXTS,
} from '@/content/personalization';
import type { LifeContext } from '@/models/types';
import { usePreferences } from '@/state/PreferencesContext';
import { spacing, type } from '@/theme/tokens';

/**
 * Personalization settings — every onboarding answer editable without
 * repeating the flow: goals, current challenges, life context, address
 * mode, delivery style and age range. Extends the former "Moji ciljevi"
 * screen (same route) in the approved design language.
 */
export default function Personalization() {
  const { tokens, profile, updateProfile } = usePreferences();
  const { showToast } = useToast();
  // Distinguish an explicit "Ništa od ovoga" from simply having none saved,
  // for the session only — persisted state is the same (no contexts).
  const [lifeNone, setLifeNone] = useState(false);

  const toggleCapped = <T,>(list: T[], value: T, max: number, capMessage: string): T[] => {
    if (list.includes(value)) return list.filter((v) => v !== value);
    if (list.length >= max) {
      showToast(capMessage);
      return list;
    }
    return [...list, value];
  };

  const toggleLifeContext = (id: LifeContext) => {
    setLifeNone(false);
    updateProfile({
      lifeContexts: toggleCapped(profile.lifeContexts, id, MAX_LIFE_CONTEXTS, 'Najviše 2 odgovora.'),
    });
  };

  const sectionLabel = (label: string) => (
    <Text style={[styles.sectionLabel, { color: tokens.sub }]}>{label}</Text>
  );

  return (
    <Screen back title="Personalizacija" subtitle="Tvoje misli se prilagođavaju onome što ovde izabereš.">
      {sectionLabel('CILJEVI · DO 3')}
      <View style={styles.goalGrid}>
        {GOAL_CATEGORIES.map((category) => (
          <View key={category.id} style={styles.goalCell}>
            <GoalChip
              categoryId={category.id}
              label={category.goalName ?? category.name}
              selected={profile.goals.includes(category.id)}
              onPress={() =>
                updateProfile({
                  goals: toggleCapped(profile.goals, category.id, MAX_GOALS, 'Najviše 3 oblasti.'),
                })
              }
            />
          </View>
        ))}
      </View>

      {sectionLabel('TRENUTNI IZAZOVI · DO 2')}
      {CHALLENGE_OPTIONS.map((option) => (
        <SelectableRow
          key={option.id}
          multi
          label={option.label}
          description={option.description}
          selected={profile.currentChallenges.includes(option.id)}
          onPress={() =>
            updateProfile({
              currentChallenges: toggleCapped(
                profile.currentChallenges,
                option.id,
                MAX_CHALLENGES,
                'Najviše 2 stvari.',
              ),
            })
          }
        />
      ))}

      {sectionLabel('ŽIVOTNI KONTEKST · DO 2')}
      {LIFE_CONTEXT_OPTIONS.map((option) => (
        <SelectableRow
          key={option.id}
          multi
          label={option.label}
          selected={profile.lifeContexts.includes(option.id)}
          onPress={() => toggleLifeContext(option.id)}
        />
      ))}
      <SelectableRow
        multi
        label={LIFE_CONTEXT_NONE_LABEL}
        selected={lifeNone}
        onPress={() => {
          setLifeNone((prev) => !prev);
          updateProfile({ lifeContexts: [] });
        }}
      />

      {sectionLabel('OBRAĆANJE')}
      {ADDRESS_MODE_OPTIONS.map((option) => (
        <SelectableRow
          key={option.id}
          label={option.label}
          description={option.description}
          selected={profile.addressMode === option.id}
          onPress={() => updateProfile({ addressMode: option.id })}
        />
      ))}

      {sectionLabel('STIL RAZGOVORA')}
      {DELIVERY_STYLE_OPTIONS.map((option) => (
        <SelectableRow
          key={option.id}
          label={option.label}
          description={option.description}
          selected={profile.deliveryStyle === option.id}
          onPress={() => updateProfile({ deliveryStyle: option.id })}
        />
      ))}

      {sectionLabel('GODINE')}
      {AGE_OPTIONS.map((option) => (
        <SelectableRow
          key={option.id}
          label={option.label}
          selected={profile.ageRange === option.id}
          onPress={() =>
            updateProfile({ ageRange: profile.ageRange === option.id ? undefined : option.id })
          }
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...type.eyebrow,
    marginTop: spacing.lg,
    marginBottom: spacing.smd,
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  goalCell: {
    flexBasis: '48%',
    flexGrow: 1,
  },
});
