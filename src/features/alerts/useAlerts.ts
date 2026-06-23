import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from '@react-native-firebase/firestore';
import { db } from '@/firebase';

export interface AdminAlert {
  id: string;
  lat: number;
  lng: number;
  radius?: number;
  kind?: 'info' | 'view' | 'hazard';
  title?: string;
  message?: string;
  createdAt?: number;
}

/** Live list of recent admin alerts (newest first) for the God-Mode map overlay. */
export function useAlerts(max = 50) {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(max));
    const unsub = onSnapshot(q,
      (snap: any) => setAlerts(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as AdminAlert)),
      (err: any) => console.warn('[alerts] listener error', err?.message ?? err),
    );
    return () => unsub();
  }, [max]);
  return alerts;
}

export const ALERT_KIND = {
  info:   { label: 'מידע',      color: '#A6E1F1', icon: 'information' },
  view:   { label: 'תצפית נוף', color: '#2C6E49', icon: 'binoculars' },
  hazard: { label: 'מפגע',      color: '#DF3131', icon: 'alert' },
} as const;
