import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useContent, type Station } from '@/content/ContentProvider';
import { distanceMeters } from '@/features/torch/distance';
import { recordVisit } from './visits';

const TRIGGER_RADIUS_M = 120; // matches the background geofence radius
const REARM_RADIUS_M = 250;   // must leave this far before the same station can re-fire

/**
 * Foreground geofence watcher. While the app is open it polls location and, when the user
 * crosses into a station's radius, surfaces a BLOCKING mission modal (active NFR — camera+write).
 * Each station re-arms only after the user walks away (REARM_RADIUS_M) so it won't spam.
 * (Background entries still fire a notification via location/geofencing.ts.)
 */
export function useGeofenceMission() {
  const { stations } = useContent();
  const [active, setActive] = useState<Station | null>(null);
  const firedRef = useRef<Set<string>>(new Set()); // stations currently "inside" (armed-off)

  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    let cancelled = false;
    (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted || cancelled) return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 15, timeInterval: 5000 },
        (loc) => {
          const me = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          for (const s of stations) {
            const d = distanceMeters(me, { lat: s.lat, lng: s.lng });
            if (d <= TRIGGER_RADIUS_M && !firedRef.current.has(s.id)) {
              firedRef.current.add(s.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              setActive((cur) => cur ?? s); // don't stomp an open mission
              // Auto-record the visit; fires the take-home notification when all are visited.
              recordVisit(s.id, stations.length).catch(() => {});
            } else if (d > REARM_RADIUS_M && firedRef.current.has(s.id)) {
              firedRef.current.delete(s.id); // re-arm after leaving
            }
          }
        }
      );
    })();
    return () => { cancelled = true; sub?.remove(); };
  }, [stations]);

  return { active, dismiss: () => setActive(null) };
}
