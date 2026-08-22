import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { usePreferences } from '@/state/PreferencesContext';
import { fonts } from '@/theme/tokens';

/**
 * Bottom tab bar per the design: translucent theme surface with blur, top
 * hairline, four quiet items — thin 22px icons with 10px labels. The bar
 * floats over the themed content (position absolute).
 */
export default function TabsLayout() {
  const { theme, tokens } = usePreferences();

  const icon = (name: IconName) => {
    function TabIcon({ color }: { color: ColorValue }) {
      return <Icon name={name} size={22} color={String(color)} />;
    }
    return TabIcon;
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.ink,
        tabBarInactiveTintColor: tokens.faint,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: tokens.line,
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={40}
            tint={theme.dark ? 'dark' : 'light'}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.barBg }]} />
          </BlurView>
        ),
        tabBarLabelStyle: {
          fontFamily: fonts.sansSemiBold,
          fontSize: 10,
          letterSpacing: 0.2,
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Danas', tabBarIcon: icon('sun') }} />
      <Tabs.Screen name="categories" options={{ title: 'Kategorije', tabBarIcon: icon('grid') }} />
      <Tabs.Screen name="favorites" options={{ title: 'Omiljene', tabBarIcon: icon('heart') }} />
      <Tabs.Screen name="settings" options={{ title: 'Podešavanja', tabBarIcon: icon('sliders') }} />
    </Tabs>
  );
}
