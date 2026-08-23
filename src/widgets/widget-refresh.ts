import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Regenerate the widget queue and hand it to the native widget. Called
 * after personalization changes, premium changes and onboarding completion
 * (force: true — always rebuild) and once per app open (unforced — rebuilds
 * only when the stored queue is stale or low; see widget-content.ts).
 *
 * No-ops on iOS/web and in Expo Go (no native module there) and never
 * throws into the app; failures in a real Android build are logged loudly.
 */

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function refreshSebiWidget(options: { force?: boolean } = {}): void {
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
      const payload = await buildWidgetQueuePayload(options);
      if (payload == null) {
        console.log('[SEBI_WIDGET] queue still fresh — no regeneration needed');
        return;
      }
      const slots = await storage.setQueue(payload);
      console.log(`[SEBI_WIDGET] queue delivered (${slots} slots)`);
    } catch (error) {
      console.error('[SEBI_WIDGET] queue refresh failed', error);
    }
  })();
}
