import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';
import { TopicModeSection } from '@/components/TopicModeSection';
import { usePreferences } from '@/state/PreferencesContext';
import { useSubscription } from '@/state/SubscriptionContext';
import { fonts } from '@/theme/tokens';

/**
 * Widget topic controls (task §12). The native widget itself is untouched —
 * this only steers the TypeScript queue generation. Default: the widget
 * follows the Za danas topics; Premium may pick 1–5 independent themes.
 */
export default function WidgetTopics() {
  const router = useRouter();
  const { tokens, preferences, setSurfaceTopics } = usePreferences();
  const { isPremium } = useSubscription();

  return (
    <Screen back title="Widget">
      <Text style={[styles.lede, { color: tokens.sub }]}>
        Widget na početnom ekranu prikazuje jednu Sebi misao, više puta dnevno.
      </Text>
      <TopicModeSection
        title="Teme na widgetu"
        selection={preferences.topics.widget}
        isPremium={isPremium}
        seedCategoryIds={preferences.topics.feed.categoryIds}
        onChange={(selection) => setSurfaceTopics('widget', selection)}
        onLockedCustom={() => router.push('/paywall?source=widget_topics')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lede: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
});
