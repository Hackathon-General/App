import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { db } from '@/firebase';

export interface Nfr {
  id: string;
  lat: number;
  lng: number;
  radius?: number;
  title?: string;
  task?: string;
  active?: boolean;
  createdAt?: number;
}

/** Live list of active NFR missions (admin map shows them as numbered, pulsing markers). */
export function useNfrs() {
  const [nfrs, setNfrs] = useState<Nfr[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'nfrs'), where('active', '==', true));
    const unsub = onSnapshot(q,
      (snap: any) => {
        const list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as Nfr);
        console.log('[nfrs] snapshot:', list.length, 'active missions');
        setNfrs(list);
      },
      (err: any) => console.warn('[nfrs] listener error', err?.message ?? err),
    );
    return () => unsub();
  }, []);
  return nfrs;
}
