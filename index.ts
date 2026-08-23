import { Platform } from 'react-native';

// Boot the normal Expo Router app exactly as before — this import must stay
// first so navigation registers the root component unchanged.
import 'expo-router/entry';

// Register the Android home-screen widget headless task. Guarded so iOS and
// Expo Go (where the native widget module does not exist) boot untouched.
if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { widgetTaskHandler } = require('./src/widgets/widget-task-handler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // Expo Go / environments without the native widget module — app runs on.
  }
}
