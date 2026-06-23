import { useEffect, useState, useCallback } from 'react';
import { ref, onValue } from '@react-native-firebase/database';
import { httpsCallable } from '@react-native-firebase/functions';
import { rtdb, functions } from '@/firebase';

export interface TorchState {
  status: 'waiting' | 'held';
  lat: number;
  lng: number;
  holderId?: string;
  holderName?: string;
  heldSince?: number;
  source?: 'phone' | 'sensor';
}

const takeTorchFn = httpsCallable(functions, 'takeTorch');
const dropTorchFn = httpsCallable(functions, 'dropTorch');
const resetTorchFn = httpsCallable(functions, 'resetTorch');

/** Subscribe to the live torch state + expose take/drop actions. */
export function useTorch() {
  const [torch, setTorch] = useState<TorchState | null>(null);

  useEffect(() => {
    const torchRef = ref(rtdb, 'torch/active');
    const unsub = onValue(torchRef, (snap) => {
      setTorch((snap.val() as TorchState | null) ?? null);
    });
    return () => unsub();
  }, []);

  const takeTorch = useCallback(
    (args: { lat: number; lng: number; name?: string; photo?: string }) => takeTorchFn(args),
    []
  );
  const dropTorch = useCallback(
    (args: { lat: number; lng: number; segmentKm: number }) => dropTorchFn(args),
    []
  );
  // Admin-only: place/relocate the torch at a point (status → waiting).
  const resetTorch = useCallback(
    (args: { lat: number; lng: number }) => resetTorchFn(args),
    []
  );

  return { torch, takeTorch, dropTorch, resetTorch };
}
