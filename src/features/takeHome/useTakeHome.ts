import { useCallback } from 'react';
import { httpsCallable } from '@react-native-firebase/functions';
import { functions } from '@/firebase';

const completeTrailFn = httpsCallable(functions, 'completeTrail');

export interface TakeHomeRule {
  id: string;
  title?: string;
  description?: string;
  link?: string;
  stationId?: string;
}

/** Marks visited stations and returns matched take-home actions (משימת המשך לבית). */
export function useTakeHome() {
  const completeTrail = useCallback(async (stationIds: string[]): Promise<TakeHomeRule[]> => {
    const res = await completeTrailFn({ stationIds });
    return ((res.data as { matched?: TakeHomeRule[] })?.matched) ?? [];
  }, []);

  return { completeTrail };
}
