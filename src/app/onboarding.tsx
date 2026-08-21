import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { SelectableCard } from '@/components/SelectableCard';
import { ThemedBackground } from '@/components/ThemedBackground';
import { getAffirmationsByCategory } from '@/content/affirmations';
import { FEELING_OPTIONS, GOAL_CATEGORIES } from '@/content/categories';
import type { CategoryId } from '@/models/types';
import { track } from '@/services/analytics';
import { requestNotificationPermission } from '@/services/notifications';
import { usePreferences } from '@/state/PreferencesContext';
import { fonts, radius, spacing } from '@/theme/tokens';

const TIME_OPTIONS = ['07:00', '08:00', '09:00', '12:00', '14:00', '17:00', '20:00', '22:00'];
const DEFAULT_TIMES = ['08:00', '14:00', '20:00'];

export default function Onboarding() {
  const router = useRouter();
  const { theme, updatePreferences } = usePreferences();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<CategoryId[]>([]);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [times, setTimes] = useState<string[]>(DEFAULT_TIMES);

  useMemo(() => track('onboarding_started'), []);

  const previewText = useMemo(() => {
    const firstGoal = goals[0];
    if (firstGoal && firstGoal !== 'today') {
      const pool = getAffirmationsByCategory(firstGoal);
      if (pool.length > 0) return pool[0].text;
    }
    return 'Ne moram danas sve da rešim.\nDovoljno je da napravim sledeći korak.';
  }, [goals]);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const finish = async () => {
    updatePreferences({
      onboardingCompleted: true,
      goals,
      feelings,
      notifications: {
        enabled: notificationsEnabled && times.length > 0,
        times: [...times].sort(),
      },
    });
    track('onboarding_completed', { goals });
    if (notificationsEnabled && times.length > 0) {
      await requestNotificationPermission();
      track('notification_enabled', { times: times.length });
    }
    router.replace('/(tabs)');
  };

  const s = theme.surface;

  const steps: { content: React.ReactNode; cta: string; onNext: () => void }[] = [
    {
      cta: 'Nastavi',
      onNext: () => setStep(1),
      content: (
        <View style={styles.centerStep}>
          <Text style={[styles.heroText, { color: theme.text }]}>
            Svaki dan počinje jednom mišlju.
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.subtle }]}>
            Odvoji nekoliko sekundi za sebe.
          </Text>
        </View>
      ),
    },
    {
      cta: 'Nastavi',
      onNext: () => setStep(2),
      content: (
        <StepList title="Na čemu želiš da radiš?">
          {GOAL_CATEGORIES.map((category) => (
            <SelectableCard
              key={category.id}
              label={category.name}
              selected={goals.includes(category.id)}
              onPress={() => setGoals((g) => toggle(g, category.id))}
              theme={theme}
            />
          ))}
        </StepList>
      ),
    },
    {
      cta: 'Nastavi',
      onNext: () => setStep(3),
      content: (
        <StepList title="Kako želiš da se osećaš?">
          {FEELING_OPTIONS.map((option) => (
            <SelectableCard
              key={option.id}
              label={option.label}
              selected={feelings.includes(option.id)}
              onPress={() => setFeelings((f) => toggle(f, option.id))}
              theme={theme}
            />
          ))}
        </StepList>
      ),
    },
    {
      cta: 'Nastavi',
      onNext: () => setStep(4),
      content: (
        <StepList title="Podsetićemo te kada ti najviše znači.">
          <View
            style={[
              styles.switchRow,
              { backgroundColor: s.card, borderColor: s.border },
            ]}>
            <Text style={[styles.switchLabel, { color: s.text }]}>Dnevni podsetnici</Text>
            <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
          </View>
          {notificationsEnabled && (
            <View style={styles.chipWrap}>
              {TIME_OPTIONS.map((time) => {
                const selected = times.includes(time);
                return (
                  <Pressable
                    key={time}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() => setTimes((t) => toggle(t, time))}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: s.card,
                        borderColor: selected ? s.accent : s.border,
                      },
                    ]}>
                    <Text style={[styles.chipText, { color: selected ? s.text : s.subtext }]}>
                      {time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </StepList>
      ),
    },
    {
      cta: 'Počni',
      onNext: finish,
      content: (
        <View style={styles.centerStep}>
          <Text style={[styles.previewLabel, { color: theme.subtle }]}>TVOJA PRVA MISAO</Text>
          <Text style={[styles.previewText, { color: theme.text }]}>{previewText}</Text>
        </View>
      ),
    },
  ];

  const current = steps[step];

  return (
    <ThemedBackground theme={theme}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg },
        ]}>
        <View style={styles.progressRow}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                { backgroundColor: i <= step ? theme.text : theme.subtle, opacity: i <= step ? 0.9 : 0.3 },
              ]}
            />
          ))}
        </View>
        <Animated.View
          key={step}
          entering={FadeIn.duration(350)}
          exiting={FadeOut.duration(150)}
          style={styles.stepBody}>
          {current.content}
        </Animated.View>
        <PrimaryButton label={current.cta} onPress={current.onNext} dark={theme.dark} />
      </View>
    </ThemedBackground>
  );
}

function StepList({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = usePreferences();
  return (
    <View style={styles.stepList}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>{title}</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.stepListContent}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepBody: {
    flex: 1,
  },
  centerStep: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  heroText: {
    fontFamily: fonts.serif,
    fontSize: 36,
    lineHeight: 48,
  },
  heroSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 17,
    lineHeight: 26,
  },
  stepList: {
    flex: 1,
    gap: spacing.lg,
  },
  stepTitle: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 38,
  },
  stepListContent: {
    gap: spacing.sm + 2,
    paddingBottom: spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  switchLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + 2,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  chipText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
  },
  previewLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    letterSpacing: 2.4,
  },
  previewText: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 44,
  },
});
