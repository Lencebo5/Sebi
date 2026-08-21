import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { CATEGORIES } from '@/content/categories';
import type { Category } from '@/models/types';
import { track } from '@/services/analytics';
import { usePreferences } from '@/state/PreferencesContext';
import { useSubscription } from '@/state/SubscriptionContext';
import { fonts, radius, spacing } from '@/theme/tokens';

export default function Categories() {
  const router = useRouter();
  const { theme } = usePreferences();
  const { isPremium } = useSubscription();
  const s = theme.surface;

  const open = (category: Category) => {
    if (category.premium && !isPremium) {
      router.push(`/paywall?source=category_${category.id}`);
      return;
    }
    track('category_opened', { category: category.id });
    router.push(`/viewer/${category.id}`);
  };

  return (
    <Screen title="Kategorije" subtitle="Izaberi ono što ti danas treba.">
      <View style={styles.list}>
        {CATEGORIES.map((category) => {
          const locked = category.premium && !isPremium;
          return (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              onPress={() => open(category)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: s.card, borderColor: s.border },
                pressed && { opacity: 0.85 },
              ]}>
              <View style={styles.rowText}>
                <Text style={[styles.name, { color: s.text }]}>{category.name}</Text>
                <Text style={[styles.description, { color: s.subtext }]}>
                  {category.description}
                </Text>
              </View>
              <Ionicons
                name={locked ? 'lock-closed-outline' : 'chevron-forward'}
                size={18}
                color={locked ? s.accent : s.subtext}
              />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm + 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
  },
  description: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
  },
});
