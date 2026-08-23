import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import type { WidgetRefreshReason } from '@/widgets/widget-content';

/**
 * Regenerate the widget queue and hand it to the native widget.
 *
 * The reason routes the behavior (see WidgetRefreshReason in
 * widget-content.ts): 'personalization' rebuilds with the new profile and
 * replaces the currently shown message immediately; 'entitlement' rebuilds
 * but keeps the current message while entitled; 'maintenance' (app open)
 * only tops up a stale/low queue and never disturbs the current message.
 *
 * No-ops on iOS/web and in Expo Go (no native module there) and never
 * throws into the app; failures in a real Android build are logged loudly.
 */

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function refreshSebiWidget(reason: WidgetRefreshReason = 'maintenance'): void {
  if (Platform.OS !== 'android' || isExpoGo) return;
  void (async () => {
    try {
      const { getWidgetStorage } = await import('@/widgets/widget-bridge');
      const storage = getWidgetStorage();
      if (!storage) {
        // A real Android build always has the module — this means the
        // native project was built without the widget (stale build).
        console.error('[SEBI_WIDGET] native module SebiWidgetStorage missing — rebuild the app');
        return;
      }
      const { buildWidgetQueuePayload } = await import('@/widgets/widget-content');
      const payload = await buildWidgetQueuePayload(reason);
      if (payload == null) {
        console.log(`[SEBI_WIDGET] queue still fresh (${reason}) — no regeneration needed`);
        return;
      }
      const slots = await storage.setQueue(payload);
      console.log(`[SEBI_WIDGET] queue delivered (${slots} slots, reason=${reason})`);
    } catch (error) {
      console.error('[SEBI_WIDGET] queue refresh failed', error);
    }
  })();
}
