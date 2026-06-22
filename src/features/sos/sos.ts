import { collection, addDoc, serverTimestamp } from '@react-native-firebase/firestore';
import * as Location from 'expo-location';
import { db, auth } from '@/firebase';

/**
 * Log an SOS event → sosEvents/{id}. The onSosCreated function pushes it to all admins
 * and the doc is the admin-visible distress log. Captures last-known location if permitted.
 */
export async function logSos(): Promise<void> {
  const u = auth.currentUser;
  let lat: number | undefined, lng: number | undefined;
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.granted) {
      const loc = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({}));
      if (loc) { lat = loc.coords.latitude; lng = loc.coords.longitude; }
    }
  } catch { /* location optional */ }

  await addDoc(collection(db, 'sosEvents'), {
    authorId: u?.uid ?? 'anonymous',
    authorName: u?.displayName ?? null,
    phone: u?.phoneNumber ?? null,
    lat: lat ?? null,
    lng: lng ?? null,
    status: 'open',
    createdAt: Date.now(),
    serverTs: serverTimestamp(),
  });
}
