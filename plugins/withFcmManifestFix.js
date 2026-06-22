/**
 * Config plugin: resolve the AndroidManifest merge conflict between expo-notifications and
 * @react-native-firebase/messaging — both declare the FCM default-notification meta-data keys.
 * We add tools:replace so the app manifest's values win cleanly (no merge failure).
 */
const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const KEYS = [
  'com.google.firebase.messaging.default_notification_channel_id',
  'com.google.firebase.messaging.default_notification_color',
];

module.exports = function withFcmManifestFix(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app['meta-data'] = app['meta-data'] || [];
    for (const name of KEYS) {
      const existing = app['meta-data'].find((m) => m.$['android:name'] === name);
      if (existing) {
        existing.$['tools:replace'] = 'android:value' in existing.$ ? 'android:value' : 'android:resource';
      }
    }
    // ensure tools namespace is present on <manifest>
    cfg.modResults.manifest.$ = cfg.modResults.manifest.$ || {};
    cfg.modResults.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    return cfg;
  });
};
