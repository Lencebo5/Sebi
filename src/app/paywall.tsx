import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ThemedBackground } from '@/components/ThemedBackground';
import { PRIVACY_URL, TERMS_URL } from '@/constants/appConfig';
import type { SubscriptionPlan } from '@/models/types';
import { track } from '@/services/analytics';
import { usePreferences } from '@/state/PreferencesContext';
import { useSubscription } from '@/state/SubscriptionContext';
import { fonts, radius, spacing } from '@/theme/tokens';

const BENEFITS = [
  'Sve kategorije',
  'Više dnevnih podsetnika',
  'Sve teme',
  'Neograničeni favoriti',
  'Novi sadržaj',
];

export default function Paywall() {
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const { theme } = usePreferences();
  const { isPremium, offerings, purchase, restore } = useSubscription();
  const insets = useSafeAreaInsets();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('annual');
  const [busy, setBusy] = useState(false);

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
      if (active) close();
    } catch {
      Alert.alert('Kupovina nije uspela', 'Pokušaj ponovo za koji trenutak.');
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
        Alert.alert('Kupovina je vraćena', 'Premium je ponovo aktivan.');
        close();
      } else {
        Alert.alert('Nema aktivne pretplate', 'Nismo pronašli prethodnu kupovinu.');
      }
    } catch {
      Alert.alert('Greška', 'Vraćanje kupovine nije uspelo. Pokušaj ponovo.');
    } finally {
      setBusy(false);
    }
  };

  const ctaLabel = selected
    ? selected.plan === 'annual'
      ? `Nastavi — ${selected.priceString} godišnje`
      : `Nastavi — ${selected.priceString} mesečno`
    : 'Nastavi';

  return (
    <ThemedBackground theme={theme}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zatvori"
          onPress={close}
          hitSlop={12}
          style={styles.closeButton}>
          <Ionicons name="close" size={26} color={theme.subtle} />
        </Pressable>

        <Animated.View entering={FadeInDown.duration(400)} style={styles.body}>
          <Text style={[styles.title, { color: theme.text }]}>
            Više dobrih misli.{'\n'}Svaki dan.
          </Text>

          <View style={styles.benefits}>
            {BENEFITS.map((benefit) => (
              <View key={benefit} style={styles.benefitRow}>
                <Ionicons name="checkmark" size={18} color={theme.text} />
                <Text style={[styles.benefitText, { color: theme.text }]}>{benefit}</Text>
              </View>
            ))}
          </View>

          {isPremium ? (
            <Text style={[styles.alreadyPremium, { color: theme.subtle }]}>
              Premium je već aktivan. Hvala ti!
            </Text>
          ) : (
            <View style={styles.plans}>
              {annual && (
                <PlanOption
                  title="Godišnje"
                  price={`${annual.priceString} / god.`}
                  note={
                    annual.perMonthPriceString
                      ? `≈ ${annual.perMonthPriceString} mesečno`
                      : 'Najbolja vrednost'
                  }
                  badge="PREPORUČENO"
                  selected={selectedPlan === 'annual'}
                  onPress={() => setSelectedPlan('annual')}
                  themeDark={theme.dark}
                  textColor={theme.text}
                  subtleColor={theme.subtle}
                />
              )}
              {monthly && (
                <PlanOption
                  title="Mesečno"
                  price={`${monthly.priceString} / mes.`}
                  selected={selectedPlan === 'monthly'}
                  onPress={() => setSelectedPlan('monthly')}
                  themeDark={theme.dark}
                  textColor={theme.text}
                  subtleColor={theme.subtle}
                />
              )}
              {offerings.length === 0 && (
                <Text style={[styles.alreadyPremium, { color: theme.subtle }]}>
                  Ponude trenutno nisu dostupne. Pokušaj kasnije.
                </Text>
              )}
            </View>
          )}
        </Animated.View>

        {!isPremium && (
          <View style={styles.footer}>
            <PrimaryButton
              label={ctaLabel}
              onPress={handlePurchase}
              dark={theme.dark}
              loading={busy}
            />
            <Text style={[styles.legalNote, { color: theme.subtle }]}>
              Pretplata se automatski obnavlja. Otkaži bilo kada u podešavanjima prodavnice.
            </Text>
            <View style={styles.links}>
              <FooterLink label="Vrati kupovinu" onPress={handleRestore} color={theme.subtle} />
              <FooterLink
                label="Uslovi"
                onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}
                color={theme.subtle}
              />
              <FooterLink
                label="Privatnost"
                onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
                color={theme.subtle}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </ThemedBackground>
  );
}

function PlanOption({
  title,
  price,
  note,
  badge,
  selected,
  onPress,
  themeDark,
  textColor,
  subtleColor,
}: {
  title: string;
  price: string;
  note?: string;
  badge?: string;
  selected: boolean;
  onPress: () => void;
  themeDark: boolean;
  textColor: string;
  subtleColor: string;
}) {
  const borderColor = selected ? textColor : themeDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.plan, { borderColor, backgroundColor: themeDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.45)' }]}>
      <View style={styles.planText}>
        <View style={styles.planTitleRow}>
          <Text style={[styles.planTitle, { color: textColor }]}>{title}</Text>
          {badge && (
            <View style={[styles.badge, { backgroundColor: textColor }]}>
              <Text style={[styles.badgeText, { color: themeDark ? '#1B1C24' : '#F7F4EE' }]}>
                {badge}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.planPrice, { color: textColor }]}>{price}</Text>
        {note && <Text style={[styles.planNote, { color: subtleColor }]}>{note}</Text>}
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? textColor : subtleColor}
      />
    </Pressable>
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
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: spacing.xl,
    paddingTop: spacing.md,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 44,
  },
  benefits: {
    gap: spacing.sm + 2,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  benefitText: {
    fontFamily: fonts.sans,
    fontSize: 16,
  },
  plans: {
    gap: spacing.sm + 2,
  },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  planText: {
    flex: 1,
    gap: 3,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planTitle: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  planPrice: {
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  planNote: {
    fontFamily: fonts.sans,
    fontSize: 13,
  },
  alreadyPremium: {
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  footer: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  legalNote: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  linkText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
  },
});
