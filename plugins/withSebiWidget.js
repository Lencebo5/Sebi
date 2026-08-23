const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Sebi-specific fixes on top of the react-native-android-widget plugin.
 *
 * 1. The library declares the AppWidget receiver android:exported="false";
 *    the canonical Android sample exports it and some OEM launchers omit
 *    non-exported providers from the widget picker. APPWIDGET_UPDATE is a
 *    protected system broadcast, so exporting adds no attack surface.
 *
 * 2. The library's initialLayout (@layout/rn_widget) is fully transparent,
 *    so a widget that has not rendered yet is invisible. Replace it with a
 *    simple native Linen surface with a quiet "Sebi" wordmark — the user
 *    must never see a fully transparent widget. The library always draws
 *    updates through its own RemoteViews layout, so this only affects the
 *    pre-first-render state.
 *
 * ORDERING: config mods execute in REVERSE plugin-array order, so this
 * plugin must be listed BEFORE react-native-android-widget in app.json to
 * run after it. Verified via prebuild.
 */

const INITIAL_LAYOUT = `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/sebi_widget_initial_bg">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="center"
        android:text="Sebi"
        android:textColor="#733A342B"
        android:textSize="15sp"
        android:fontFamily="serif" />
</FrameLayout>
`;

const INITIAL_BG = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#F6F1E7" />
    <corners android:radius="24dp" />
</shape>
`;

module.exports = function withSebiWidget(config) {
  config = withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    for (const receiver of application?.receiver ?? []) {
      const name = receiver.$['android:name'] ?? '';
      if (name.endsWith('.widget.Sebi')) {
        receiver.$['android:exported'] = 'true';
      }
    }
    return mod;
  });

  config = withDangerousMod(config, [
    'android',
    (mod) => {
      const resDir = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res');
      fs.mkdirSync(path.join(resDir, 'layout'), { recursive: true });
      fs.mkdirSync(path.join(resDir, 'drawable'), { recursive: true });
      fs.writeFileSync(path.join(resDir, 'layout', 'sebi_widget_initial.xml'), INITIAL_LAYOUT);
      fs.writeFileSync(path.join(resDir, 'drawable', 'sebi_widget_initial_bg.xml'), INITIAL_BG);

      const providerXmlPath = path.join(resDir, 'xml', 'widgetprovider_sebi.xml');
      if (fs.existsSync(providerXmlPath)) {
        const xml = fs.readFileSync(providerXmlPath, 'utf8');
        fs.writeFileSync(
          providerXmlPath,
          xml.replace('android:initialLayout="@layout/rn_widget"', 'android:initialLayout="@layout/sebi_widget_initial"'),
        );
      }
      return mod;
    },
  ]);

  return config;
};
