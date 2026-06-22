import { useEffect, useState } from 'react';
import { ref, onValue } from '@react-native-firebase/database';
import { rtdb } from '@/firebase';

export interface LivePin {
  id: string;
  lat: number;
  lng: number;
  speed?: number;
  ts: number;
  source: 'phone' | 'sensor';
  name?: string;
}

/** Subscribe to all live pins (phones + IoT sensors) for the God-Mode map. */
export function useLive() {
  const [pins, setPins] = useState<LivePin[]>([]);

  useEffect(() => {
    const unsub = onValue(ref(rtdb, 'live'), (snap) => {
      const val = (snap.val() as Record<string, Omit<LivePin, 'id'>>) || {};
      setPins(Object.entries(val).map(([id, p]) => ({ id, ...p })));
    });
    return () => unsub();
  }, []);

  return pins;
}
