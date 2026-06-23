import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { doc, setDoc } from '@react-native-firebase/firestore';
import { db, auth } from '@/firebase';

// Show notifications in the FOREGROUND too. Include both new (banner/list) and legacy (alert) keys.
// Wrapped — a native quirk at module-eval must NEVER crash app startup (release APK safety).
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    } as any),
  });
} catch (e) {
  console.warn('[notif] setNotificationHandler failed (non-fatal):', e);
}

/** Ensure permission + Android channel. Safe to call before scheduling a local notification. */
export async function ensureNotifReady(): Promise<boolean> {
  let { granted } = await Notifications.getPermissionsAsync();
  if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
  console.log('[notif] permission granted?', granted);
  if (granted && Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'התראות השביל',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#D68C45',
    });
  }
  return granted;
}

/** Fire a local notification immediately (foreground-safe). Requests permission first. */
export async function notifyNow(title: string, body: string, data?: Record<string, unknown>) {
  const ok = await ensureNotifReady();
  console.log('[notif] notifyNow', { title, ok });
  if (!ok) return;
  await Notifications.scheduleNotificationAsync({ content: { title, body, data: data ?? {}, sound: true }, trigger: null });
}

/** Ask permission, set Android channel, register the device push token to users/{uid}.pushToken. */
export async function registerForPush(): Promise<string | null> {
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  if (!granted) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'התראות השביל',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#D68C45',
    });
  }

  try {
    // Native FCM/APNs device token (we use native Firebase, not Expo push service).
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    const uid = auth.currentUser?.uid;
    if (uid && token) {
      await setDoc(doc(db, 'users', uid), { pushToken: token }, { merge: true });
    }
    return token as string;
  } catch {
    return null;
  }
}
