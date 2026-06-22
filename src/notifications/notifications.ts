import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { doc, setDoc } from '@react-native-firebase/firestore';
import { db, auth } from '@/firebase';

// Show notifications in foreground too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
