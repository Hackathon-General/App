import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { ref, set, serverTimestamp } from '@react-native-firebase/database';
import { rtdb, auth } from '@/firebase';
import { stations } from '@/content';
import { recordVisit } from '@/features/missions/visits';

export const LIVE_LOCATION_TASK = 'ck-live-location';
export const GEOFENCE_TASK = 'ck-geofence';

// Geofence radius around each station (m) for the NFR mission trigger.
const STATION_RADIUS_M = 120;

// --- Cost / DDoS safety: hard client-side throttle on RTDB writes ---
// Even if the OS fires location callbacks rapidly, we write at most once per
// MIN_WRITE_INTERVAL_MS AND only when the user actually moved MIN_WRITE_DISTANCE_M.
const MIN_WRITE_INTERVAL_MS = 10000; // ≤ 1 write / 10s
const MIN_WRITE_DISTANCE_M = 25; // and only after moving ≥25m
let lastWriteTs = 0;
let lastWrite: { lat: number; lng: number } | null = null;

function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Background task: write THROTTLED live position to RTDB live/{uid} (source:phone). */
TaskManager.defineTask(LIVE_LOCATION_TASK, async ({ data, error }: any) => {
  if (error || !data) return;
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const loc = data.locations?.[data.locations.length - 1];
  if (!loc) return;

  const now = Date.now();
  const pos = { lat: loc.coords.latitude, lng: loc.coords.longitude };

  // Rate gate: skip if too soon OR not enough movement (collapses bursts → ~0 wasted writes).
  if (now - lastWriteTs < MIN_WRITE_INTERVAL_MS) return;
  if (lastWrite && metersBetween(lastWrite, pos) < MIN_WRITE_DISTANCE_M) return;

  try {
    await set(ref(rtdb, `live/${uid}`), {
      lat: pos.lat,
      lng: pos.lng,
      speed: loc.coords.speed ?? null,
      ts: now,
      name: auth.currentUser?.displayName ?? 'מטייל/ת',
    });
    lastWriteTs = now;
    lastWrite = pos;
  } catch {
    /* offline — skip, do not retry-storm */
  }
});

/** Geofence task: when entering a station region, fire a local mission notification + record the visit. */
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: any) => {
  if (error || !data) return;
  const { eventType, region } = data;
  if (eventType !== Location.GeofencingEventType.Enter) return;
  const station = stations.find((s) => s.id === region.identifier);
  if (!station) return;
  const who = (auth.currentUser?.displayName ?? '').trim().split(/\s+/)[0] || 'מטייל/ת';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${who}, הגעת ל${station.name}`,
      body: station.whatYouDo,
      data: { url: `carmelkinneret://station/${station.id}` },
    },
    trigger: null,
  });
  // Auto-record the visit (also works in the background); fires take-home when all visited.
  await recordVisit(station.id, stations.length).catch(() => {});
});

/** Start background live-location updates (throttled: ≥25m / ≥10s). */
export async function startLiveLocation() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return false;
  // Background is best-effort; foreground still works without it.
  await Location.requestBackgroundPermissionsAsync().catch(() => {});

  const already = await Location.hasStartedLocationUpdatesAsync(LIVE_LOCATION_TASK).catch(() => false);
  if (!already) {
    await Location.startLocationUpdatesAsync(LIVE_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 25,
      timeInterval: 10000,
      showsBackgroundLocationIndicator: false,
      foregroundService: {
        notificationTitle: 'שביל כרמל-כנרת',
        notificationBody: 'עוקב אחר מיקומך לאורך השביל',
      },
    });
  }
  return true;
}

/** Register geofences for all stations. */
export async function startGeofencing() {
  const regions = stations.map((s) => ({
    identifier: s.id,
    latitude: s.lat,
    longitude: s.lng,
    radius: STATION_RADIUS_M,
    notifyOnEnter: true,
    notifyOnExit: false,
  }));
  const already = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(() => false);
  if (already) await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {});
  await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
}

/** Stop all background tracking (e.g. on sign-out). */
export async function stopTracking() {
  await Location.stopLocationUpdatesAsync(LIVE_LOCATION_TASK).catch(() => {});
  await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {});
}

// silence unused import in some bundler configs
void serverTimestamp;
