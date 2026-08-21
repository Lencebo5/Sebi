import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { usePreferences } from '@/state/PreferencesContext';
import { useSubscription } from '@/state/SubscriptionContext';
import { isThemeFree, THEMES } from '@/theme/themes';
import { fonts, radius, spacing } from '@/theme/tokens';

export default function Appearance() {
  const router = useRouter();
  const { theme, preferences, updatePreferences } = usePreferences();
  const { isPremium } = useSubscription();
  const s = theme.surface;

  const select = (id: string) => {
    if (!isPremium && !isThemeFree(id)) {
      router.push('/paywall?source=themes');
      return;
    }
    updatePreferences({ themeId: id });
  };

  return (
    <Screen back title="Izgled" subtitle="Pozadina uz koju ti misli najlepše stoje.">
      <View style={styles.grid}>
        {THEMES.map((option) => {
          const selected = preferences.themeId === option.id;
          const locked = !isPremium && !isThemeFree(option.id);
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={option.name}
              onPress={() => select(option.id)}
              style={({ pressed }) => [styles.cell, pressed && { opacity: 0.85 }]}>
              <View
                style={[
                  styles.swatchFrame,
                  { borderColor: selected ? s.accent : s.border },
                ]}>
                <LinearGradient colors={option.gradient} style={styles.swatch}>
                  <Text style={[styles.swatchText, { color: option.text }]}>Aa</Text>
                  {locked && (
                    <View style={styles.lock}>
                      <Ionicons name="lock-closed" size={14} color={option.subtle} />
                    </View>
                  )}
                </LinearGradient>
              </View>
              <Text style={[styles.name, { color: selected ? s.text : s.subtext }]}>
                {option.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cell: {
    width: '30%',
    minWidth: 96,
    alignItems: 'center',
    gap: spacing.sm,
  },
  swatchFrame: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderWidth: 2,
    borderRadius: radius.md,
    padding: 3,
  },
  swatch: {
    flex: 1,
    borderRadius: radius.md - 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchText: {
    fontFamily: fonts.serif,
    fontSize: 22,
  },
  lock: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  name: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
  },
});
