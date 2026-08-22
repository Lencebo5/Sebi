import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ThemedBackground } from '@/components/ThemedBackground';
import { usePreferences } from '@/state/PreferencesContext';
import { useSubscription } from '@/state/SubscriptionContext';
import { THEMES } from '@/theme/themes';
import { fonts, radius, spacing, withAlpha } from '@/theme/tokens';

/**
 * Theme picker per the design: a four-column grid of live theme previews
 * ("Aa" set in each theme's ink over its real layered background), a ring
 * on the selected one, a discreet lock on Premium themes.
 */
export default function Appearance() {
  const router = useRouter();
  const { tokens, preferences, updatePreferences } = usePreferences();
  const { isPremium } = useSubscription();

  const select = (id: string, premium: boolean) => {
    if (premium && !isPremium) {
      router.push('/paywall?source=themes');
      return;
    }
    updatePreferences({ themeId: id });
  };

  return (
    <Screen back title="Izgled">
      <View style={styles.grid}>
        {THEMES.map((option) => {
          const selected = preferences.themeId === option.id;
          const locked = option.premium && !isPremium;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={locked ? `${option.name} — Premium` : option.name}
              accessibilityState={{ selected }}
              onPress={() => select(option.id, option.premium)}
              style={({ pressed }) => [styles.cell, pressed && { opacity: 0.85 }]}>
              <View
                style={[
                  styles.swatchFrame,
                  selected
                    ? { borderColor: tokens.ink, padding: 2 }
                    : { borderColor: 'transparent', padding: 2 },
                ]}>
                <View
                  style={[
                    styles.swatchClip,
                    !selected && { borderWidth: 1, borderColor: withAlpha(tokens.ink, 0.14) },
                  ]}>
                  <ThemedBackground theme={option} style={styles.swatch}>
                    <View style={styles.swatchCenter}>
                      <Text style={[styles.swatchText, { color: option.ink }]}>Aa</Text>
                    </View>
                    {locked && (
                      <View style={styles.lock}>
                        <Icon
                          name="lock"
                          size={11}
                          color={option.ink}
                          strokeWidth={2}
                          style={{ opacity: 0.55 }}
                        />
                      </View>
                    )}
                  </ThemedBackground>
                </View>
              </View>
              <Text
                style={[styles.name, { color: selected ? tokens.ink : tokens.sub }]}
                numberOfLines={1}>
                {option.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!isPremium && (
        <Text style={[styles.freeNote, { color: tokens.faint }]}>
          Teme sa katancem su deo Sebi Premium paketa.
        </Text>
      )}
    </Screen>
  );
}

const CELL_WIDTH = '22.5%';

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: spacing.md - 2,
    paddingTop: spacing.sm,
  },
  cell: {
    flexBasis: CELL_WIDTH,
    flexGrow: 1,
    maxWidth: '24%',
  },
  swatchFrame: {
    borderWidth: 1.5,
    borderRadius: radius.card + 2,
  },
  swatchClip: {
    aspectRatio: 0.78,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  swatch: {
    flex: 1,
  },
  swatchCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchText: {
    fontFamily: fonts.serif,
    fontSize: 19,
  },
  lock: {
    position: 'absolute',
    top: 6,
    right: 7,
  },
  name: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 7,
  },
  freeNote: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    paddingTop: spacing.md,
  },
});
