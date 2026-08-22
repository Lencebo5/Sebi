import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedBackground } from '@/components/ThemedBackground';
import { useToast } from '@/components/Toast';
import { PRIVACY_URL, TERMS_URL } from '@/constants/appConfig';
import type { SubscriptionPlan } from '@/models/types';
import { track } from '@/services/analytics';
import { usePreferences } from '@/state/PreferencesContext';
import { useSubscription } from '@/state/SubscriptionContext';
import { fonts, radius, spacing, type } from '@/theme/tokens';

const BENEFITS = [
  'Sve kategorije',
  'Više dnevnih podsetnika',
  'Sve teme',
  'Neograničene omiljene',
  'Novi sadržaj svake nedelje',
];

/**
 * Sebi Premium paywall per the design: quiet close, serif headline,
 * checked benefits, two plan cards with the annual one emphasized, one
 * solid CTA. No countdowns, no dark patterns. A calm full-screen success
 * state confirms the purchase.
 */
export default function Paywall() {
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const { theme, tokens } = usePreferences();
  const { isPremium, offerings, purchase, restore } = useSubscription();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('annual');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    track('paywall_viewed', { source: source ?? 'unknown' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const annual = offerings.find((o) => o.plan === 'annual');
  const monthly = offerings.find((o) => o.plan === 'monthly');
  const selected = selectedPlan === 'annual' ? annual : monthly;

  const handlePurchase = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const active = await purchase(selected.plan);
      if (active) setSuccess(true);
    } catch {
      showToast('Nešto nije u redu. Kupovina nije uspela — pokušaj ponovo.');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const active = await restore();
      if (active) {
        showToast('Kupovina je vraćena.');
        close();
      } else {
        showToast('Nismo pronašli prethodnu kupovinu.');
      }
    } catch {
      showToast('Vraćanje kupovine nije uspelo. Pokušaj ponovo.');
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <ThemedBackground theme={theme}>
        <Animated.View entering={FadeIn.duration(350)} style={styles.successHost}>
          <View style={[styles.successCircle, { borderColor: tokens.ink }]}>
            <Icon name="check" size={26} color={tokens.ink} strokeWidth={1.8} />
          </View>
          <Text style={[styles.successTitle, { color: tokens.ink }]}>Sve je otključano.</Text>
          <Text style={[styles.successText, { color: tokens.sub }]}>
            Hvala ti što podržavaš Sebi. Sve kategorije, teme i podsetnici su sada tvoji.
          </Text>
          <PrimaryButton label="Nastavi" onPress={close} style={styles.successButton} />
        </Animated.View>
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground theme={theme}>
      <View style={[styles.host, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zatvori"
            onPress={close}
            hitSlop={8}
            style={[styles.closeButton, { backgroundColor: tokens.ghost }]}>
            <Icon name="close" size={15} color={tokens.sub} strokeWidth={2} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(400)}>
            <Text style={[styles.eyebrow, { color: tokens.sub }]}>SEBI PREMIUM</Text>
            <Text style={[styles.title, { color: tokens.ink }]}>
              Više dobrih misli. Svaki dan.
            </Text>

            <View style={styles.benefits}>
              {BENEFITS.map((benefit) => (
                <View key={benefit} style={styles.benefitRow}>
                  <Icon name="check" size={15} color={tokens.ink} strokeWidth={2} />
                  <Text style={[styles.benefitText, { color: tokens.ink }]}>{benefit}</Text>
                </View>
              ))}
            </View>

            {isPremium ? (
              <Text style={[styles.alreadyPremium, { color: tokens.sub }]}>
                Premium je već aktivan. Hvala ti!
              </Text>
            ) : (
              <View style={styles.plans}>
                {annual && (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selectedPlan === 'annual' }}
                    onPress={() => setSelectedPlan('annual')}
                    style={[
                      styles.plan,
                      selectedPlan === 'annual'
                        ? { borderWidth: 1.5, borderColor: tokens.ink, backgroundColor: tokens.ghost }
                        : { borderWidth: 1, borderColor: tokens.line },
                    ]}>
                    <View style={[styles.planBadge, { backgroundColor: tokens.ctaBg }]}>
                      <Text style={[styles.planBadgeText, { color: tokens.ctaFg }]}>
                        NAJBOLJA VREDNOST
                      </Text>
                    </View>
                    <View>
                      <Text style={[styles.planTitle, { color: tokens.ink }]}>Godišnje</Text>
                      <Text style={[styles.planSub, { color: tokens.sub }]}>
                        {annual.priceString} godišnje
                      </Text>
                    </View>
                    {annual.perMonthPriceString && (
                      <Text style={[styles.planRight, { color: tokens.ink }]}>
                        ≈ {annual.perMonthPriceString} / mes
                      </Text>
                    )}
                  </Pressable>
                )}
                {monthly && (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selectedPlan === 'monthly' }}
                    onPress={() => setSelectedPlan('monthly')}
                    style={[
                      styles.plan,
                      selectedPlan === 'monthly'
                        ? { borderWidth: 1.5, borderColor: tokens.ink }
                        : { borderWidth: 1, borderColor: tokens.line },
                    ]}>
                    <View>
                      <Text style={[styles.planTitle, { color: tokens.ink }]}>Mesečno</Text>
                      <Text style={[styles.planSub, { color: tokens.sub }]}>
                        Naplata svakog meseca
                      </Text>
                    </View>
                    <Text style={[styles.planRight, { color: tokens.ink }]}>
                      {monthly.priceString} / mes
                    </Text>
                  </Pressable>
                )}
                {offerings.length === 0 && (
                  <Text style={[styles.alreadyPremium, { color: tokens.sub }]}>
                    Ponude trenutno nisu dostupne. Pokušaj kasnije.
                  </Text>
                )}
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {!isPremium && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
            <PrimaryButton
              label="Nastavi"
              onPress={() => void handlePurchase()}
              loading={busy}
              loadingLabel="Obrada…"
            />
            <Text style={[styles.legalNote, { color: tokens.faint }]}>
              Otkaži bilo kada. Naplata preko prodavnice aplikacija.
            </Text>
            <View style={styles.links}>
              <FooterLink label="Vrati kupovinu" onPress={() => void handleRestore()} color={tokens.sub} />
              <FooterLink
                label="Privatnost"
                onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}
                color={tokens.sub}
              />
              <FooterLink
                label="Uslovi"
                onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}
                color={tokens.sub}
              />
            </View>
          </View>
        )}
      </View>
    </ThemedBackground>
  );
}

function FooterLink({
  label,
  onPress,
  color,
}: {
  label: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <Text style={[styles.linkText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  topRow: {
    paddingHorizontal: spacing.md - 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg + 4,
    paddingBottom: spacing.md,
  },
  eyebrow: {
    ...type.eyebrow,
    marginBottom: spacing.smd,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 38,
    marginBottom: spacing.lg,
  },
  benefits: {
    gap: 13,
    marginBottom: spacing.lg,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  benefitText: {
    fontFamily: fonts.sans,
    fontSize: 14.5,
  },
  plans: {
    gap: spacing.smd,
    paddingTop: spacing.sm,
  },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.button,
    paddingVertical: 15,
    paddingHorizontal: spacing.md,
  },
  planBadge: {
    position: 'absolute',
    top: -9,
    left: 14,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
  },
  planBadgeText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9.5,
    letterSpacing: 1.2,
  },
  planTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
  },
  planSub: {
    fontFamily: fonts.sans,
    fontSize: 12.5,
    marginTop: 2,
  },
  planRight: {
    fontFamily: fonts.sansMedium,
    fontSize: 13.5,
  },
  alreadyPremium: {
    fontFamily: fonts.sans,
    fontSize: 15,
    paddingTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.smd,
  },
  legalNote: {
    fontFamily: fonts.sans,
    fontSize: 11,
    textAlign: 'center',
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    paddingBottom: spacing.sm,
  },
  linkText: {
    fontFamily: fonts.sans,
    fontSize: 12,
  },
  successHost: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md + 2,
    paddingHorizontal: 40,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  successTitle: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 34,
    textAlign: 'center',
  },
  successText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  successButton: {
    marginTop: spacing.smd,
    alignSelf: 'stretch',
  },
});
