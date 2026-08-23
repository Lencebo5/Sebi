// Boot the normal Expo Router app exactly as before — this import must stay
// first so navigation registers the root component unchanged.
import 'expo-router/entry';

import { Platform } from 'react-native';

// Register the Android home-screen widget headless task. IMPORTANT: in a
// release Android build this registration must NEVER be skipped — any
// failure is logged loudly ([SEBI_WIDGET] in logcat), not swallowed. The
// try/catch exists solely because importing the widget library throws in
// Expo Go, where the native module does not exist.
if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { widgetTaskHandler } = require('./src/widgets/widget-task-handler');
    registerWidgetTaskHandler(widgetTaskHandler);
    console.log('[SEBI_WIDGET] task handler registered');
  } catch (error) {
    console.error('[SEBI_WIDGET] task handler registration FAILED', error);
  }
}
