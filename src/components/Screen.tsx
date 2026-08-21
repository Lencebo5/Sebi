import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePreferences } from '@/state/PreferencesContext';
import { fonts, spacing } from '@/theme/tokens';

/**
 * Standard scrollable screen with the theme's surface background and an
 * editorial serif title. Used by list/settings screens.
 */
export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  back = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  /** Show a back button (for pushed sub-screens). */
  back?: boolean;
}) {
  const { theme } = usePreferences();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const s = theme.surface;

  const header = (
    <View style={styles.header}>
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nazad"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={s.text} />
        </Pressable>
      )}
      <Text style={[styles.title, { color: s.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: s.subtext }]}>{subtitle}</Text> : null}
    </View>
  );

  if (!scroll) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: s.background, paddingTop: insets.top + spacing.lg },
        ]}>
        {header}
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: s.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl },
      ]}
      showsVerticalScrollIndicator={false}>
      {header}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    marginLeft: -6,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 38,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
  },
});
