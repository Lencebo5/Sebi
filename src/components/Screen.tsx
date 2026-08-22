import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { ThemedBackground } from '@/components/ThemedBackground';
import { usePreferences } from '@/state/PreferencesContext';
import { fonts, spacing, TAB_BAR_CONTENT_INSET } from '@/theme/tokens';

/**
 * Standard screen over the full theme background with an editorial Literata
 * title. Tab screens use the large 28px title; pushed sub-screens show a
 * back chevron and a 26px title, per the design.
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
  const { theme, tokens } = usePreferences();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const header = (
    <View style={styles.header}>
      {back && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nazad"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}>
          <Icon name="chevronLeft" size={19} color={tokens.ink} style={{ opacity: 0.75 }} />
        </Pressable>
      )}
      <Text style={[back ? styles.subScreenTitle : styles.title, { color: tokens.ink }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: tokens.sub }]}>{subtitle}</Text>
      ) : null}
    </View>
  );

  const topPadding = insets.top + (back ? spacing.sm : spacing.xl);

  return (
    <ThemedBackground theme={theme}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: topPadding,
              paddingBottom: insets.bottom + TAB_BAR_CONTENT_INSET + spacing.lg,
            },
          ]}
          showsVerticalScrollIndicator={false}>
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.container, { paddingTop: topPadding }]}>
          {header}
          {children}
        </View>
      )}
    </ThemedBackground>
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
    marginBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginLeft: -spacing.smd,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 37,
    marginTop: spacing.md,
  },
  subScreenTitle: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs + 2,
  },
});
