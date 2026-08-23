import Constants, { ExecutionEnvironment } from 'expo-constants';
import React from 'react';
import { Platform } from 'react-native';

/**
 * Ask Android to re-render any placed Sebi widgets with fresh content —
 * called after personalization changes, premium changes and on app open.
 * No-ops on iOS/web and in Expo Go (no native widget module there), and
 * never throws into the app.
 */

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function refreshSebiWidget(): void {
  if (Platform.OS !== 'android' || isExpoGo) return;
  void (async () => {
    try {
      const { requestWidgetUpdate } = await import('react-native-android-widget');
      const { getWidgetDisplay } = await import('@/widgets/widget-content');
      const { SebiWidget } = await import('@/widgets/SebiWidget');

      console.log('[SEBI_WIDGET] refresh requested');
      const display = await getWidgetDisplay();
      await requestWidgetUpdate({
        widgetName: 'Sebi',
        renderWidget: (info) =>
          React.createElement(SebiWidget, {
            layout: info.width > 0 && info.width < 220 ? 'small' : 'medium',
            text: display.affirmation.text,
            label: display.label,
            surface: display.surface,
          }),
      });
    } catch (error) {
      // Best-effort, but never silent while diagnosing.
      console.error('[SEBI_WIDGET] refresh failed', error);
    }
  })();
}
