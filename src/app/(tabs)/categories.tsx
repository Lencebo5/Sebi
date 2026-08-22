import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { CATEGORIES } from '@/content/categories';
import type { Category } from '@/models/types';
import { track } from '@/services/analytics';
import { usePreferences } from '@/state/PreferencesContext';
import { useSubscription } from '@/state/SubscriptionContext';
import { fonts } from '@/theme/tokens';

/**
 * Editorial category list per the design: serif names on hairline rows —
 * no cards. Premium categories carry a discreet lock.
 */
export default function Categories() {
  const router = useRouter();
  const { tokens } = usePreferences();
  const { isPremium } = useSubscription();

  const open = (category: Category) => {
    if (category.premium && !isPremium) {
      router.push(`/paywall?source=category_${category.id}`);
      return;
    }
    track('category_opened', { category: category.id });
    router.push(`/viewer/${category.id}`);
  };

  return (
    <Screen title="Kategorije">
      <View>
        {CATEGORIES.map((category) => {
          const locked = category.premium && !isPremium;
          return (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={locked ? `${category.name} — Premium` : category.name}
              onPress={() => open(category)}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: tokens.line },
                pressed && { opacity: 0.7 },
              ]}>
              <Text
                style={[styles.name, { color: tokens.ink, opacity: locked ? 0.72 : 1 }]}>
                {category.name}
              </Text>
              <Icon
                name={locked ? 'lock' : 'chevronRight'}
                size={locked ? 15 : 14}
                color={tokens.faint}
                strokeWidth={1.7}
              />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 17,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: {
    fontFamily: fonts.serif,
    fontSize: 19,
    flexShrink: 1,
  },
});
