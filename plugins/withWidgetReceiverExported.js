const { withAndroidManifest } = require('expo/config-plugins');

/**
 * react-native-android-widget declares its AppWidget receivers with
 * android:exported="false". The canonical Android AppWidget sample declares
 * the receiver exported, and several OEM launchers have been reported to
 * omit non-exported providers from the widget picker. APPWIDGET_UPDATE is a
 * protected system broadcast, so exporting the receiver adds no attack
 * surface.
 *
 * ORDERING: Android-manifest mods execute in REVERSE plugin-array order, so
 * this plugin must be listed BEFORE react-native-android-widget in app.json
 * to run after it and see the receiver it adds. Verified via prebuild.
 */
module.exports = function withWidgetReceiverExported(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    for (const receiver of application?.receiver ?? []) {
      const name = receiver.$['android:name'] ?? '';
      if (name.endsWith('.widget.Sebi')) {
        receiver.$['android:exported'] = 'true';
      }
    }
    return mod;
  });
};
