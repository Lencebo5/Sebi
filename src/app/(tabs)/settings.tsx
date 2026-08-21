import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Alert, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
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

export default function Settings() {
  const router = useRouter();
  const { theme } = usePreferences();
  const { isPremium, restore, adapterName } = useSubscription();
  const s = theme.surface;

  const storeUrl = Platform.OS === 'android' ? PLAY_STORE_URL : APP_STORE_URL;

  const handleRestore = async () => {
    try {
      const active = await restore();
      Alert.alert(
        active ? 'Kupovina je vraćena' : 'Nema aktivne pretplate',
        active ? 'Premium je ponovo aktivan.' : 'Nismo pronašli prethodnu kupovinu.',
      );
    } catch {
      Alert.alert('Greška', 'Vraćanje kupovine nije uspelo. Pokušaj ponovo.');
    }
  };

  const shareApp = () => {
    void Share.share({
      message: `${APP_NAME} — kratka dobra misao svakog dana. ${storeUrl}`,
    });
  };

  const rows: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; note?: string }[] = [
    { label: 'Moji ciljevi', icon: 'flag-outline', onPress: () => router.push('/settings/goals') },
    { label: 'Podsetnici', icon: 'notifications-outline', onPress: () => router.push('/settings/reminders') },
    { label: 'Izgled', icon: 'color-palette-outline', onPress: () => router.push('/settings/appearance') },
    {
      label: 'Premium',
      icon: 'star-outline',
      note: isPremium ? 'Aktivan' : undefined,
      onPress: () => router.push('/paywall?source=settings'),
    },
    { label: 'Oceni aplikaciju', icon: 'thumbs-up-outline', onPress: () => void WebBrowser.openBrowserAsync(storeUrl) },
    { label: 'Podeli aplikaciju', icon: 'gift-outline', onPress: shareApp },
    { label: 'Privatnost', icon: 'shield-checkmark-outline', onPress: () => void WebBrowser.openBrowserAsync(PRIVACY_URL) },
    { label: 'Uslovi korišćenja', icon: 'document-text-outline', onPress: () => void WebBrowser.openBrowserAsync(TERMS_URL) },
    { label: 'Vrati kupovinu', icon: 'refresh-outline', onPress: handleRestore },
  ];

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen title="Podešavanja">
      <View style={styles.list}>
        {rows.map((row) => (
          <Pressable
            key={row.label}
            accessibilityRole="button"
            onPress={row.onPress}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: s.card, borderColor: s.border },
              pressed && { opacity: 0.85 },
            ]}>
            <Ionicons name={row.icon} size={20} color={s.subtext} />
            <Text style={[styles.label, { color: s.text }]}>{row.label}</Text>
            {row.note && <Text style={[styles.note, { color: s.accent }]}>{row.note}</Text>}
            <Ionicons name="chevron-forward" size={16} color={s.subtext} />
          </Pressable>
        ))}
      </View>
      <Text style={[styles.version, { color: s.subtext }]}>
        {APP_NAME} v{version}
        {adapterName === 'mock' ? ' · dev režim pretplate' : ''}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    gap: spacing.md,
  },
  label: {
    flex: 1,
    fontFamily: fonts.sansMedium,
    fontSize: 15,
  },
  note: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
  },
  version: {
    fontFamily: fonts.sans,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
