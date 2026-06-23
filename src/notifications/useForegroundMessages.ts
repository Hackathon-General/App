import { useEffect, useRef } from 'react';
import { onMessage } from '@react-native-firebase/messaging';
import { collection, query, orderBy, limit, onSnapshot } from '@react-native-firebase/firestore';
import { messaging, db } from '@/firebase';
import { notifyNow } from './notifications';

/**
 * While the app is OPEN (foreground), surface incoming events as a local notification banner:
 *  - FCM data/notification messages (geo-alerts, SOS) — iOS suppresses banners for foreground
 *    remote pushes, so we re-emit them as a local notification.
 *  - New `alerts` docs created after mount (covers the case where the device isn't in the
 *    push radius / push didn't arrive but the admin alert is relevant).
 * No extra in-app UI — just the standard notification.
 */
export function useForegroundMessages() {
  const startedAt = useRef(Date.now());

  // 1) Foreground FCM messages → local notification. Guarded so a native messaging quirk
  //    can't crash the app (release APK safety).
  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = onMessage(messaging, async (msg: any) => {
        const title = msg?.notification?.title ?? msg?.data?.title ?? 'התראה';
        const body = msg?.notification?.body ?? msg?.data?.body ?? '';
        console.log('[fcm] foreground message → notify', { title });
        await notifyNow(title, body, msg?.data);
      });
    } catch (e) { console.warn('[fcm] onMessage failed (non-fatal):', e); }
    return () => { try { unsub(); } catch {} };
  }, []);

  // 2) New admin alerts created while the app is open → local notification.
  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(1));
    const unsub = onSnapshot(q, (snap: any) => {
      snap.docChanges().forEach((c: any) => {
        if (c.type !== 'added') return;
        const a = c.doc.data();
        if (!a?.createdAt || a.createdAt < startedAt.current) return; // ignore pre-existing
        console.log('[alerts] new alert while open → notify', a.title);
        notifyNow(a.title ?? 'התראה מההנהלה', a.message ?? '', { type: 'alert', id: c.doc.id }).catch(() => {});
      });
    });
    return () => unsub();
  }, []);
}
