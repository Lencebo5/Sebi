import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import {
  APP_NAME,
  APP_STORE_URL,
  PLAY_STORE_URL,
  PRIVACY_URL,
  TERMS_URL,
} from '@/constants/appConfig';
import { usePreferences } from '@/state/PreferencesContext';
import { useSubscription } from '@/state/SubscriptionContext';
import { fonts, radius, spacing } from '@/theme/tokens';
import {
  advanceWidgetStage,
  getWidgetStage,
  WIDGET_DEBUG,
  WIDGET_STAGE_LABELS,
} from '@/widgets/widget-debug';
import { refreshSebiWidget } from '@/widgets/widget-refresh';

interface Row {
  label: string;
  onPress: () => void;
  /** Ghost pill next to the chevron (e.g. "Aktivan"). */
  badge?: string;
  /** Starts a new visual group. */
  gapAbove?: boolean;
}

/**
 * Settings as quiet native-feeling rows on the theme background — hairline
 * separators and grouped spacing instead of cards, per the design.
 */
export default function Settings() {
  const router = useRouter();
  const { tokens, resetOnboarding } = usePreferences();
  const { isPremium, restore, adapterName } = useSubscription();
  const { showToast } = useToast();
  // TEMPORARY (widget render diagnosis): current test stage, see widget-debug.ts.
  const [widgetStage, setWidgetStage] = useState<number | null>(null);
  useEffect(() => {
    if (WIDGET_DEBUG && Platform.OS === 'android') {
      void getWidgetStage().then(setWidgetStage);
    }
  }, []);

  const storeUrl = Platform.OS === 'android' ? PLAY_STORE_URL : APP_STORE_URL;

  const handleRestore = async () => {
    try {
      const active = await restore();
      showToast(active ? 'Kupovina je vraćena.' : 'Nismo pronašli prethodnu kupovinu.');
    } catch {
      showToast('Vraćanje kupovine nije uspelo. Pokušaj ponovo.');
    }
  };

  const shareApp = () => {
    void Share.share({
      message: `${APP_NAME} — dobre misli za svaki dan. ${storeUrl}`,
    });
  };

  const rows: Row[] = [
    { label: 'Personalizacija', onPress: () => router.push('/settings/goals') },
    { label: 'Podsetnici', onPress: () => router.push('/settings/reminders') },
    { label: 'Izgled', onPress: () => router.push('/settings/appearance') },
    {
      label: 'Sebi Premium',
      gapAbove: true,
      badge: isPremium ? 'Aktivan' : undefined,
      onPress: () => router.push('/paywall?source=settings'),
    },
    {
      label: 'Oceni aplikaciju',
      gapAbove: true,
      onPress: () => void WebBrowser.openBrowserAsync(storeUrl),
    },
    { label: 'Podeli aplikaciju', onPress: shareApp },
    {
      label: 'Privatnost',
      gapAbove: true,
      onPress: () => void WebBrowser.openBrowserAsync(PRIVACY_URL),
    },
    { label: 'Uslovi korišćenja', onPress: () => void WebBrowser.openBrowserAsync(TERMS_URL) },
    { label: 'Vrati kupovinu', onPress: () => void handleRestore() },
  ];

  if (__DEV__) {
    rows.push({
      label: 'Resetuj onboarding (dev)',
      gapAbove: true,
      onPress: () => {
        resetOnboarding();
        router.replace('/onboarding');
      },
    });
  }

  // TEMPORARY widget render diagnosis: advances the test stage and refreshes
  // the placed widget immediately — one build walks the whole ladder.
  if (WIDGET_DEBUG && Platform.OS === 'android' && widgetStage !== null) {
    rows.push({
      label: `Widget test: ${WIDGET_STAGE_LABELS[widgetStage]}`,
      gapAbove: true,
      onPress: () => {
        void advanceWidgetStage().then((next) => {
          setWidgetStage(next);
          refreshSebiWidget();
          showToast(`Widget faza: ${WIDGET_STAGE_LABELS[next]}`);
        });
      },
    });
  }

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen title="Podešavanja">
      <View>
        {rows.map((row) => (
          <Pressable
            key={row.label}
            accessibilityRole="button"
            onPress={row.onPress}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: tokens.line },
              row.gapAbove && { marginTop: spacing.lg + 2 },
              pressed && { opacity: 0.7 },
            ]}>
            <Text style={[styles.label, { color: tokens.ink }]}>{row.label}</Text>
            <View style={styles.rowRight}>
              {row.badge && (
                <View style={[styles.badge, { backgroundColor: tokens.ghost }]}>
                  <Text style={[styles.badgeText, { color: tokens.sub }]}>{row.badge}</Text>
                </View>
              )}
              <Icon name="chevronRight" size={13} color={tokens.faint} strokeWidth={1.8} />
            </View>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.version, { color: tokens.faint }]}>
        {APP_NAME} · verzija {version}
        {adapterName === 'mock' ? ' · dev režim pretplate' : ''}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 15.5,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  version: {
    fontFamily: fonts.sans,
    fontSize: 12,
    textAlign: 'center',
    paddingTop: spacing.lg + 2,
  },
});
