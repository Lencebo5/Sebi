import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { GoalChip, SelectableRow } from '@/components/SelectableCard';
import { ThemedBackground } from '@/components/ThemedBackground';
import { bumpHour, TimeStepperRow } from '@/components/TimeStepperRow';
import { useToast } from '@/components/Toast';
import { getAffirmationsByCategory } from '@/content/affirmations';
import { FEELING_OPTIONS, GOAL_CATEGORIES } from '@/content/categories';
import type { CategoryId } from '@/models/types';
import { track } from '@/services/analytics';
import { requestNotificationPermission } from '@/services/notifications';
import { usePreferences } from '@/state/PreferencesContext';
import { fonts, spacing, type } from '@/theme/tokens';

const DEFAULT_TIMES = ['08:00', '14:00', '20:00'];
const MAX_TIMES = 5;
const STEPS = 5;

/**
 * Five-step onboarding per the design: emotional opener, goal grid,
 * feelings, reminder times with hour steppers, personalized preview.
 * One action per screen; progress dots with a stretched active pill.
 */
export default function Onboarding() {
  const router = useRouter();
  const { theme, tokens, updatePreferences } = usePreferences();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<CategoryId[]>([]);
  const [feeling, setFeeling] = useState<string>(FEELING_OPTIONS[0].id);
  const [times, setTimes] = useState<string[]>(DEFAULT_TIMES);

  useMemo(() => track('onboarding_started'), []);

  const previewText = useMemo(() => {
    const firstGoal = goals[0];
    if (firstGoal && firstGoal !== 'today') {
      const pool = getAffirmationsByCategory(firstGoal);
      if (pool.length > 0) return pool[0].text;
    }
    return 'Ne moram danas sve da rešim. Dovoljno je da napravim sledeći korak.';
  }, [goals]);

  const toggleGoal = (id: CategoryId) =>
    setGoals((g) => (g.includes(id) ? g.filter((v) => v !== id) : [...g, id]));

  const finish = async () => {
    updatePreferences({
      onboardingCompleted: true,
      goals,
      feelings: [feeling],
      notifications: { enabled: times.length > 0, times: [...times].sort() },
    });
    track('onboarding_completed', { goals });
    if (times.length > 0) {
      await requestNotificationPermission();
      track('notification_enabled', { times: times.length });
    }
    router.replace('/(tabs)');
  };

  const skip = () => {
    updatePreferences({
      onboardingCompleted: true,
      notifications: { enabled: true, times: DEFAULT_TIMES },
    });
    router.replace('/(tabs)');
  };

  const addTime = () => {
    if (times.length >= MAX_TIMES) {
      showToast('Najviše 5 podsetnika dnevno.');
      return;
    }
    setTimes((t) => [...t, '17:00']);
  };

  const next = () => {
    if (step < STEPS - 1) setStep(step + 1);
    else void finish();
  };

  return (
    <ThemedBackground theme={theme}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.mlg },
        ]}>
        {/* Header: back · progress dots · skip */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nazad"
            disabled={step === 0}
            onPress={() => setStep((s) => Math.max(0, s - 1))}
            style={[styles.headerButton, { opacity: step > 0 ? 1 : 0 }]}>
            <Icon name="chevronLeft" size={19} color={tokens.sub} strokeWidth={1.8} />
          </Pressable>
          <View style={styles.dots}>
            {Array.from({ length: STEPS }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: i === step ? 18 : 6,
                    backgroundColor: i === step ? tokens.ink : tokens.outline,
                  },
                ]}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={skip}
            hitSlop={8}
            style={styles.skipButton}>
            <Text style={[styles.skipLabel, { color: tokens.faint }]}>Preskoči</Text>
          </Pressable>
        </View>

        <Animated.View
          key={step}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(140)}
          style={styles.stepBody}>
          {step === 0 && (
            <View style={styles.centerStep}>
              <Text style={[styles.heroText, { color: tokens.ink }]}>
                Svaki dan počinje jednom mišlju.
              </Text>
              <Text style={[styles.heroSubtitle, { color: tokens.sub }]}>
                Odvoji nekoliko sekundi za sebe.
              </Text>
            </View>
          )}

          {step === 1 && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listStep}>
              <Text style={[styles.stepTitle, { color: tokens.ink }]}>Na čemu želiš da radiš?</Text>
              <Text style={[styles.stepSubtitle, { color: tokens.sub }]}>
                Izaberi jednu ili više oblasti.
              </Text>
              <View style={styles.goalGrid}>
                {GOAL_CATEGORIES.map((category) => (
                  <View key={category.id} style={styles.goalCell}>
                    <GoalChip
                      categoryId={category.id}
                      label={category.goalName ?? category.name}
                      selected={goals.includes(category.id)}
                      onPress={() => toggleGoal(category.id)}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {step === 2 && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listStep}>
              <Text style={[styles.stepTitle, { color: tokens.ink, marginBottom: spacing.lg }]}>
                Kako želiš da se osećaš?
              </Text>
              {FEELING_OPTIONS.map((option) => (
                <SelectableRow
                  key={option.id}
                  label={option.label}
                  selected={feeling === option.id}
                  onPress={() => setFeeling(option.id)}
                />
              ))}
            </ScrollView>
          )}

          {step === 3 && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listStep}>
              <Text style={[styles.stepTitle, { color: tokens.ink }]}>
                Mala poruka u pravom trenutku.
              </Text>
              <Text style={[styles.stepSubtitle, { color: tokens.sub }]}>
                Podsetnici tokom dana. Menjaš ih kasnije u Podešavanjima.
              </Text>
              {times.map((time, i) => (
                <TimeStepperRow
                  key={i}
                  time={time}
                  bordered
                  onDecrement={() => setTimes((t) => t.map((v, j) => (j === i ? bumpHour(v, -1) : v)))}
                  onIncrement={() => setTimes((t) => t.map((v, j) => (j === i ? bumpHour(v, 1) : v)))}
                />
              ))}
              <Pressable
                accessibilityRole="button"
                onPress={addTime}
                style={styles.addTimeRow}>
                <Icon name="plus" size={14} color={tokens.sub} strokeWidth={2} />
                <Text style={[styles.addTimeLabel, { color: tokens.sub }]}>Dodaj vreme</Text>
              </Pressable>
            </ScrollView>
          )}

          {step === 4 && (
            <View style={styles.centerStep}>
              <Text style={[styles.previewLabel, { color: tokens.sub }]}>TVOJA PRVA MISAO</Text>
              <Text style={[styles.previewText, { color: tokens.ink }]}>{previewText}</Text>
            </View>
          )}
        </Animated.View>

        <PrimaryButton label={step === STEPS - 1 ? 'Počni' : 'Nastavi'} onPress={next} />
      </View>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: -spacing.smd,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
  skipButton: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.smd,
  },
  skipLabel: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
  },
  stepBody: {
    flex: 1,
  },
  centerStep: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  heroText: {
    fontFamily: fonts.serif,
    fontSize: 31,
    lineHeight: 42,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    textAlign: 'center',
  },
  listStep: {
    paddingTop: spacing.xl + 2,
    paddingBottom: spacing.lg,
  },
  stepTitle: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 34,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 13.5,
    marginBottom: spacing.lg,
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  goalCell: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  addTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  addTimeLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
  previewLabel: {
    ...type.eyebrow,
  },
  previewText: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 40,
    textAlign: 'center',
    maxWidth: 320,
  },
});
