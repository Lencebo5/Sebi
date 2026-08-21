import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { getAffirmation } from '@/content/affirmations';
import { getCategory } from '@/content/categories';
import { usePreferences } from '@/state/PreferencesContext';
import { fonts, radius, spacing } from '@/theme/tokens';

export default function Favorites() {
  const router = useRouter();
  const { theme, favorites } = usePreferences();
  const s = theme.surface;

  const items = favorites
    .map((id) => getAffirmation(id))
    .filter((a): a is NonNullable<typeof a> => a != null)
    .reverse();

  return (
    <Screen
      title="Omiljene"
      subtitle={
        items.length > 0
          ? 'Misli koje si sačuvao za sebe.'
          : 'Dodirni srce na misli koja ti znači — ovde će te čekati.'
      }>
      <View style={styles.list}>
        {items.map((affirmation) => (
          <Pressable
            key={affirmation.id}
            accessibilityRole="button"
            onPress={() => router.push(`/viewer/favorites?start=${affirmation.id}`)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: s.card, borderColor: s.border },
              pressed && { opacity: 0.85 },
            ]}>
            <Text style={[styles.categoryLabel, { color: s.subtext }]}>
              {getCategory(affirmation.category).name.toUpperCase()}
            </Text>
            <Text style={[styles.text, { color: s.text }]}>{affirmation.text}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm + 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    gap: spacing.sm,
  },
  categoryLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.8,
  },
  text: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 27,
  },
});
