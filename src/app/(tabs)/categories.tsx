import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { CATEGORIES } from '@/content/categories';
import type { Category } from '@/models/types';
import { track } from '@/services/analytics';
import { usePreferences } from '@/state/PreferencesContext';
import { useSubscription } from '@/state/SubscriptionContext';
import { fonts } from '@/theme/tokens';

/**
 * Editorial category list per the design: serif names on hairline rows —
 * no cards. Premium categories carry a discreet lock.
 *
 * Two distinct interactions per row (product model, task §5):
 * - tapping the row opens the category feed (existing Free/Premium gate);
 * - tapping the small circle marks the category as a preferred Za danas
 *   topic ("show me more of this") — allowed on ANY category, including
 *   Premium ones, even for Free users: personalization may then include
 *   that category, while the full category feed stays gated.
 */
export default function Categories() {
  const router = useRouter();
  const { tokens, preferences, toggleFeedTopic } = usePreferences();
  const { isPremium } = useSubscription();
  const { showToast } = useToast();

  const selected = new Set(preferences.topics.feed.categoryIds);

  const open = (category: Category) => {
    if (category.premium) {
      track('premium_category_opened', { category: category.id, locked: !isPremium });
    }
    if (category.premium && !isPremium) {
      router.push(`/paywall?source=category_${category.id}`);
      return;
    }
    track('category_opened', { category: category.id });
    router.push(`/viewer/${category.id}`);
  };

  const toggle = (category: Category) => {
    const result = toggleFeedTopic(category.id);
    if (result === 'limit') showToast('Najviše 5 tema.');
    if (result === 'last') showToast('Bar jedna tema ostaje izabrana.');
  };

  return (
    <Screen title="Kategorije">
      <Text style={[styles.introTitle, { color: tokens.sub }]}>TEME ZA TEBE</Text>
      <Text style={[styles.introText, { color: tokens.faint }]}>
        Označi teme koje želiš češće u Za danas.
      </Text>
      <View style={styles.list}>
        {CATEGORIES.map((category) => {
          const locked = category.premium && !isPremium;
          const selectable = category.id !== 'today';
          const isSelected = selected.has(category.id);
          return (
            <View
              key={category.id}
              style={[styles.row, { borderBottomColor: tokens.line }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={locked ? `${category.name} — Premium` : category.name}
                onPress={() => open(category)}
                style={({ pressed }) => [styles.openArea, pressed && { opacity: 0.7 }]}>
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
              {selectable && (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={
                    isSelected
                      ? `${category.name} — izabrana tema za Za danas`
                      : `${category.name} — dodaj u teme za Za danas`
                  }
                  onPress={() => toggle(category)}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.check,
                    { borderColor: isSelected ? tokens.ink : tokens.outline },
                    isSelected && { backgroundColor: tokens.ink },
                    pressed && { opacity: 0.7 },
                  ]}>
                  {isSelected && (
                    <Icon name="check" size={12} color={tokens.surface} strokeWidth={2.4} />
                  )}
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  introTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.6,
    marginTop: 2,
  },
  introText: {
    fontFamily: fonts.sans,
    fontSize: 13.5,
    marginTop: 4,
    marginBottom: 6,
  },
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  openArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 17,
    paddingRight: 14,
  },
  name: {
    fontFamily: fonts.serif,
    fontSize: 19,
    flexShrink: 1,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
