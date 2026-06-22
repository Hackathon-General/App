import { doc, setDoc, getDoc } from '@react-native-firebase/firestore';
import { httpsCallable } from '@react-native-firebase/functions';
import * as Notifications from 'expo-notifications';
import { db, functions, auth } from '@/firebase';

const completeTrail = httpsCallable(functions, 'completeTrail');

/**
 * Record an auto-detected station visit (geofence entry) and, when the trail is complete,
 * fire the "המשך עשייה בבית" take-home notification with a personalised local-action link
 * (e.g. visited a senior home → link to volunteer with the elderly in your city).
 *
 * @param stationId the station the user just entered
 * @param totalStations total stations on the trail (to know when "all visited")
 */
export async function recordVisit(stationId: string, totalStations: number): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const userRef = doc(db, `users/${uid}`);

  // Read current visits, add this one (idempotent).
  const snap = await getDoc(userRef);
  const data: any = snap.data() ?? {};
  const visited: string[] = Array.isArray(data.stationsVisited) ? data.stationsVisited : [];
  if (visited.includes(stationId)) return; // already counted
  const next = [...visited, stationId];

  await setDoc(userRef, { stationsVisited: next, lastActiveAt: Date.now() }, { merge: true });

  // Trail finished → resolve take-home actions and notify (once).
  const alreadyDone = !!data.takeHomeSentAt;
  if (next.length >= totalStations && totalStations > 0 && !alreadyDone) {
    await sendTakeHome(next, userRef);
  }
}

async function sendTakeHome(stationIds: string[], userRef: any) {
  try {
    const res: any = await completeTrail({ stationIds });
    const matched: any[] = res?.data?.matched ?? [];
    // Mark sent so we don't re-notify.
    await setDoc(userRef, { takeHomeSentAt: Date.now() }, { merge: true });

    const top = matched[0];
    const title = 'סיימת את השביל! 🌿 המשך עשייה בבית';
    const body = top?.title
      ? `${top.title}${top.description ? ' — ' + top.description : ''}`
      : 'תודה שהשלמת את שביל כרמל-כנרת. הנה דרכים להמשיך לעשות טוב גם בבית.';

    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { url: 'carmelkinneret://(user)/profile', takeHome: '1' } },
      trigger: null,
    });
  } catch (e) {
    console.warn('[visits] take-home failed', e);
  }
}
