const { withAndroidManifest, withDangerousMod, withMainApplication } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Sebi native Android widget — the whole widget, no widget library.
 *
 * The widget is a plain AppWidgetProvider over RemoteViews TextViews. The
 * app's personalization engine precomputes a queue of future messages and
 * writes it to SharedPreferences through a tiny native module; the provider
 * rotates through it natively (no JS, no bitmaps, no ContentProvider).
 *
 * This plugin wires the checked-in sources under native/android/sebi-widget
 * into the prebuilt project:
 *   1. copies Java sources into app/src/main/java/com/sebi/app/widget/
 *   2. copies layouts / drawables / provider XML / strings into res/
 *   3. copies the widget picker preview image into res/drawable-nodpi/
 *   4. declares the receiver in AndroidManifest (exported=true — some OEM
 *      launchers omit non-exported providers from the widget picker;
 *      APPWIDGET_UPDATE is a protected broadcast, so this adds no surface)
 *   5. registers SebiWidgetPackage in MainApplication.kt (fails the build
 *      loudly if the template anchor is missing — a silently unregistered
 *      bridge would break queue delivery)
 */

// Resolved against the Expo project root (provided by the prebuild mod
// request) so the plugin works regardless of the process working directory.
const nativeDir = (projectRoot) => path.join(projectRoot, 'native', 'android', 'sebi-widget');
const previewSource = (projectRoot) => path.join(projectRoot, 'assets', 'widget-preview', 'sebi.png');

const JAVA_FILES = [
  'SebiWidgetLogic.java',
  'SebiWidgetProvider.java',
  'SebiWidgetStorageModule.java',
  'SebiWidgetPackage.java',
];

const RES_FILES = [
  'layout/sebi_widget_small.xml',
  'layout/sebi_widget_medium.xml',
  'drawable/sebi_widget_bg_morning.xml',
  'drawable/sebi_widget_bg_linen.xml',
  'drawable/sebi_widget_bg_paper.xml',
  'drawable/sebi_widget_bg_night.xml',
  'xml/sebi_widget_info.xml',
  'values/sebi_widget_strings.xml',
];

function copyNativeSources(projectRoot, platformProjectRoot) {
  const javaDir = path.join(platformProjectRoot, 'app/src/main/java/com/sebi/app/widget');
  fs.mkdirSync(javaDir, { recursive: true });
  for (const file of JAVA_FILES) {
    const source = path.join(nativeDir(projectRoot), 'java', file);
    if (!fs.existsSync(source)) {
      throw new Error(`[withSebiWidget] missing native source: ${source}`);
    }
    fs.copyFileSync(source, path.join(javaDir, file));
  }

  const resDir = path.join(platformProjectRoot, 'app/src/main/res');
  for (const file of RES_FILES) {
    const source = path.join(nativeDir(projectRoot), 'res', file);
    if (!fs.existsSync(source)) {
      throw new Error(`[withSebiWidget] missing native resource: ${source}`);
    }
    const target = path.join(resDir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }

  const preview = previewSource(projectRoot);
  if (!fs.existsSync(preview)) {
    throw new Error(`[withSebiWidget] missing widget preview image: ${preview}`);
  }
  const previewDir = path.join(resDir, 'drawable-nodpi');
  fs.mkdirSync(previewDir, { recursive: true });
  fs.copyFileSync(preview, path.join(previewDir, 'sebi_widget_preview.png'));
}

function addReceiver(androidManifest) {
  const application = androidManifest.manifest.application?.[0];
  if (!application) {
    throw new Error('[withSebiWidget] AndroidManifest has no <application>');
  }
  application.receiver = (application.receiver ?? []).filter(
    (receiver) => receiver.$?.['android:name'] !== '.widget.SebiWidgetProvider',
  );
  application.receiver.push({
    $: {
      'android:name': '.widget.SebiWidgetProvider',
      'android:exported': 'true',
      'android:label': 'Sebi',
    },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
      },
    ],
    'meta-data': [
      {
        $: {
          'android:name': 'android.appwidget.provider',
          'android:resource': '@xml/sebi_widget_info',
        },
      },
    ],
  });
  return androidManifest;
}

const PACKAGE_LINE = 'add(com.sebi.app.widget.SebiWidgetPackage())';
const PACKAGE_ANCHOR = '// add(MyReactNativePackage())';

function registerPackage(mainApplication) {
  if (mainApplication.includes(PACKAGE_LINE)) return mainApplication;
  if (!mainApplication.includes(PACKAGE_ANCHOR)) {
    throw new Error(
      '[withSebiWidget] could not find the package-list anchor in MainApplication.kt — ' +
        'the template changed; SebiWidgetPackage would not be registered.',
    );
  }
  return mainApplication.replace(PACKAGE_ANCHOR, `${PACKAGE_ANCHOR}\n          ${PACKAGE_LINE}`);
}

module.exports = function withSebiWidget(config) {
  config = withAndroidManifest(config, (mod) => {
    mod.modResults = addReceiver(mod.modResults);
    return mod;
  });

  config = withMainApplication(config, (mod) => {
    if (mod.modResults.language !== 'kt') {
      throw new Error('[withSebiWidget] expected a Kotlin MainApplication');
    }
    mod.modResults.contents = registerPackage(mod.modResults.contents);
    return mod;
  });

  config = withDangerousMod(config, [
    'android',
    (mod) => {
      copyNativeSources(mod.modRequest.projectRoot, mod.modRequest.platformProjectRoot);
      return mod;
    },
  ]);

  return config;
};
