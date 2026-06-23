import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/auth/AuthProvider';
import { startLiveLocation, startGeofencing, stopTracking } from './geofencing';
import { registerForPush } from '@/notifications/notifications';
import { useForegroundMessages } from '@/notifications/useForegroundMessages';

/**
 * Starts the trail background services once a user is signed in:
 *  - live location → RTDB, geofencing for station missions, push registration,
 *  - and routes notification taps to their deep link.
 */
export function useTrailServices() {
  const { user } = useAuth();
  useForegroundMessages(); // foreground FCM + new alerts → local notification banner

  useEffect(() => {
    if (!user) {
      stopTracking().catch(() => {});
      return;
    }
    let cancelled = false;
    (async () => {
      const ok = await startLiveLocation();
      if (ok && !cancelled) await startGeofencing().catch(() => {});
      await registerForPush().catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  // Notification tap → deep link.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const url = resp.notification.request.content.data?.url as string | undefined;
      if (url) router.push(url as never);
    });
    return () => sub.remove();
  }, []);
}
