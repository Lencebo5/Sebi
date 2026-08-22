import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { getAffirmation } from '@/content/affirmations';
import { getCategory } from '@/content/categories';
import { usePreferences } from '@/state/PreferencesContext';
import { fonts, spacing } from '@/theme/tokens';

/**
 * Personal collection of saved thoughts — an editorial list with generous
 * spacing; each row opens the full-screen viewer. Refined empty state per
 * the design.
 */
export default function Favorites() {
  const router = useRouter();
  const { tokens, favorites, toggleFavorite } = usePreferences();

  const items = favorites
    .map((id) => getAffirmation(id))
    .filter((a): a is NonNullable<typeof a> => a != null)
    .reverse();

  if (items.length === 0) {
    return (
      <Screen title="Omiljene" scroll={false}>
        <View style={styles.empty}>
          <Icon name="heart" size={24} color={tokens.faint} strokeWidth={1.5} />
          <Text style={[styles.emptyTitle, { color: tokens.ink }]}>
            Ovde će živeti misli koje želiš da sačuvaš.
          </Text>
          <Text style={[styles.emptySubtitle, { color: tokens.sub }]}>
            Dodirni srce na bilo kojoj misli.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Omiljene">
      <View>
        {items.map((affirmation) => (
          <View
            key={affirmation.id}
            style={[styles.row, { borderBottomColor: tokens.line }]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/viewer/favorites?start=${affirmation.id}`)}
              style={({ pressed }) => pressed && { opacity: 0.7 }}>
              <Text style={[styles.text, { color: tokens.ink }]}>{affirmation.text}</Text>
            </Pressable>
            <View style={styles.rowFooter}>
              <Text style={[styles.categoryLabel, { color: tokens.faint }]}>
                {getCategory(affirmation.category).name.toUpperCase()}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ukloni iz omiljenih"
                onPress={() => toggleFavorite(affirmation.id)}
                hitSlop={8}
                style={styles.removeButton}>
                <Icon
                  name="heart"
                  size={16}
                  color={tokens.ink}
                  fill={tokens.ink}
                  strokeWidth={1.5}
                  style={{ opacity: 0.6 }}
                />
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md - 2,
    paddingHorizontal: spacing.mlg,
    marginTop: -60,
  },
  emptyTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    textAlign: 'center',
  },
  row: {
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 26,
    marginBottom: spacing.sm,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 10.5,
    letterSpacing: 1.8,
  },
  removeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
