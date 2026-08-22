import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { GoalChip, SelectableRow } from '@/components/SelectableCard';
import { ThemedBackground } from '@/components/ThemedBackground';
import { useToast } from '@/components/Toast';
import { GOAL_CATEGORIES } from '@/content/categories';
import {
  ADDRESS_MODE_OPTIONS,
  AGE_OPTIONS,
  CHALLENGE_OPTIONS,
  DELIVERY_STYLE_OPTIONS,
  LIFE_CONTEXT_NONE_LABEL,
  LIFE_CONTEXT_OPTIONS,
  MAX_CHALLENGES,
  MAX_GOALS,
  MAX_LIFE_CONTEXTS,
} from '@/content/personalization';
import type {
  AddressMode,
  AgeRange,
  CategoryId,
  DeliveryStyle,
  LifeContext,
  NeedTag,
  PersonalizationProfile,
} from '@/models/types';
import { track } from '@/services/analytics';
import { buildTodayFeed } from '@/services/dailyContent';
import { DEFAULT_PROFILE, usePreferences } from '@/state/PreferencesContext';
import { fonts, spacing, type } from '@/theme/tokens';

const STEPS = 7;

/**
 * Personalization onboarding v2 (docs/SEBI_INTEGRATION_README.md): age →
 * goals → current challenges → life context → address mode → delivery
 * style → personalized result. Reminders are deliberately NOT configured
 * here and no notification permission is requested — that lives in
 * Podešavanja → Podsetnici.
 */
export default function Onboarding() {
  const router = useRouter();
  const { theme, tokens, updatePreferences } = usePreferences();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [ageRange, setAgeRange] = useState<AgeRange | undefined>(undefined);
  const [goals, setGoals] = useState<CategoryId[]>([]);
  const [challenges, setChallenges] = useState<NeedTag[]>([]);
  const [lifeContexts, setLifeContexts] = useState<LifeContext[]>([]);
  const [lifeNone, setLifeNone] = useState(false);
  const [addressMode, setAddressMode] = useState<AddressMode>('neutral');
  const [deliveryStyle, setDeliveryStyle] = useState<DeliveryStyle | 'mixed'>('mixed');

  useMemo(() => track('onboarding_started'), []);

  const draftProfile: PersonalizationProfile = useMemo(
    () => ({ ageRange, goals, currentChallenges: challenges, lifeContexts, addressMode, deliveryStyle }),
    [ageRange, goals, challenges, lifeContexts, addressMode, deliveryStyle],
  );

  // The personalized first thought — computed once the user reaches the
  // result step, from the profile they just described.
  const preview = useMemo(() => {
    if (step !== STEPS - 1) return null;
    return buildTodayFeed(draftProfile, false, [])[0] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const toggleCapped = <T,>(list: T[], value: T, max: number, capMessage: string): T[] => {
    if (list.includes(value)) return list.filter((v) => v !== value);
    if (list.length >= max) {
      showToast(capMessage);
      return list;
    }
    return [...list, value];
  };

  const toggleLifeContext = (id: LifeContext) => {
    setLifeNone(false);
    setLifeContexts((prev) =>
      toggleCapped(prev, id, MAX_LIFE_CONTEXTS, 'Najviše 2 odgovora.'),
    );
  };

  const selectLifeNone = () => {
    // "Ništa od ovoga" is exclusive — it clears every real context.
    setLifeNone((prev) => !prev);
    setLifeContexts([]);
  };

  const finish = () => {
    updatePreferences({ onboardingCompleted: true, profile: draftProfile });
    track('onboarding_completed', { goals, challenges });
    router.replace('/(tabs)');
  };

  const skipAll = () => {
    updatePreferences({ onboardingCompleted: true, profile: DEFAULT_PROFILE });
    router.replace('/(tabs)');
  };

  const canContinue =
    step === 1 ? goals.length >= 1 : step === 2 ? challenges.length >= 1 : true;

  const next = () => {
    if (!canContinue) return;
    if (step === 0) track('onboarding_age_selected', { ageRange: ageRange ?? 'skipped' });
    if (step === 1) track('onboarding_goals_selected', { goals });
    if (step === 2) track('onboarding_challenges_selected', { challenges });
    if (step === 3) {
      track('onboarding_life_context_selected', { contexts: lifeNone ? ['none'] : lifeContexts });
    }
    if (step === 4) track('onboarding_address_mode_selected', { mode: addressMode });
    if (step === 5) track('onboarding_style_selected', { style: deliveryStyle });
    if (step < STEPS - 1) setStep(step + 1);
    else finish();
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
          <Pressable accessibilityRole="button" onPress={skipAll} hitSlop={8} style={styles.skipButton}>
            <Text style={[styles.skipLabel, { color: tokens.faint }]}>Preskoči</Text>
          </Pressable>
        </View>

        <Animated.View
          key={step}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(140)}
          style={styles.stepBody}>
          {step === 0 && (
            <StepList
              title="Koliko imaš godina?"
              subtitle="Pomaže nam da biramo poruke bliže periodu života u kom se nalaziš.">
              {AGE_OPTIONS.map((option) => (
                <SelectableRow
                  key={option.id}
                  label={option.label}
                  selected={ageRange === option.id}
                  onPress={() => setAgeRange((prev) => (prev === option.id ? undefined : option.id))}
                />
              ))}
            </StepList>
          )}

          {step === 1 && (
            <StepList title="Na čemu želiš da radiš?" subtitle="Izaberi do 3 oblasti koje su ti trenutno najvažnije.">
              <View style={styles.goalGrid}>
                {GOAL_CATEGORIES.map((category) => (
                  <View key={category.id} style={styles.goalCell}>
                    <GoalChip
                      categoryId={category.id}
                      label={category.goalName ?? category.name}
                      selected={goals.includes(category.id)}
                      onPress={() =>
                        setGoals((prev) =>
                          toggleCapped(prev, category.id, MAX_GOALS, 'Najviše 3 oblasti.'),
                        )
                      }
                    />
                  </View>
                ))}
              </View>
            </StepList>
          )}

          {step === 2 && (
            <StepList
              title="Šta ti je ovih dana najteže?"
              subtitle="Izaberi najviše 2 stvari. Ovo možeš kasnije da promeniš.">
              {CHALLENGE_OPTIONS.map((option) => (
                <SelectableRow
                  key={option.id}
                  multi
                  label={option.label}
                  description={option.description}
                  selected={challenges.includes(option.id)}
                  onPress={() =>
                    setChallenges((prev) =>
                      toggleCapped(prev, option.id, MAX_CHALLENGES, 'Najviše 2 stvari.'),
                    )
                  }
                />
              ))}
            </StepList>
          )}

          {step === 3 && (
            <StepList
              title="Šta trenutno najbolje opisuje tvoj život?"
              subtitle="Možeš da izabereš do 2 odgovora.">
              {LIFE_CONTEXT_OPTIONS.map((option) => (
                <SelectableRow
                  key={option.id}
                  multi
                  label={option.label}
                  selected={lifeContexts.includes(option.id)}
                  onPress={() => toggleLifeContext(option.id)}
                />
              ))}
              <SelectableRow multi label={LIFE_CONTEXT_NONE_LABEL} selected={lifeNone} onPress={selectLifeNone} />
            </StepList>
          )}

          {step === 4 && (
            <StepList
              title="Kako želiš da ti se Sebi obraća?"
              subtitle="Većina poruka je neutralna. Ovo nam omogućava i ličnije formulacije.">
              {ADDRESS_MODE_OPTIONS.map((option) => (
                <SelectableRow
                  key={option.id}
                  label={option.label}
                  description={option.description}
                  selected={addressMode === option.id}
                  onPress={() => setAddressMode(option.id)}
                />
              ))}
            </StepList>
          )}

          {step === 5 && (
            <StepList
              title="Kako želiš da Sebi razgovara sa tobom?"
              subtitle="Izaberi stil koji ti najviše prija.">
              {DELIVERY_STYLE_OPTIONS.map((option) => (
                <SelectableRow
                  key={option.id}
                  label={option.label}
                  description={option.description}
                  selected={deliveryStyle === option.id}
                  onPress={() => setDeliveryStyle(option.id)}
                />
              ))}
            </StepList>
          )}

          {step === 6 && (
            <View style={styles.resultStep}>
              <Text style={[styles.resultTitle, { color: tokens.ink }]}>Sve je spremno.</Text>
              <Text style={[styles.resultSubtitle, { color: tokens.sub }]}>
                Sebi će birati poruke prema onome što ti je trenutno važno.
              </Text>
              {preview && (
                <View style={styles.previewBlock}>
                  <Text style={[styles.previewLabel, { color: tokens.sub }]}>TVOJA PRVA MISAO</Text>
                  <Text style={[styles.previewText, { color: tokens.ink }]}>{preview.text}</Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>

        <PrimaryButton
          label={step === STEPS - 1 ? 'Počni' : 'Nastavi'}
          onPress={next}
          disabled={!canContinue}
        />
      </View>
    </ThemedBackground>
  );
}

function StepList({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { tokens } = usePreferences();
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listStep}>
      <Text style={[styles.stepTitle, { color: tokens.ink }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.stepSubtitle, { color: tokens.sub }]}>{subtitle}</Text>
      ) : null}
      {children}
    </ScrollView>
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
  listStep: {
    paddingTop: spacing.lg,
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
    lineHeight: 19,
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
  resultStep: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  resultTitle: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 37,
    textAlign: 'center',
  },
  resultSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 300,
  },
  previewBlock: {
    alignItems: 'center',
    marginTop: spacing.xl + 8,
    gap: spacing.md,
  },
  previewLabel: {
    ...type.eyebrow,
  },
  previewText: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 38,
    textAlign: 'center',
    maxWidth: 330,
  },
});
