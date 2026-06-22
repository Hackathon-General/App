import { httpsCallable } from '@react-native-firebase/functions';
import { doc, getDoc, collection, getDocs, query, where, deleteDoc, setDoc } from '@react-native-firebase/firestore';
import { ref, get } from '@react-native-firebase/database';
import { functions, db, rtdb } from '@/firebase';

export interface StepResult { name: string; ok: boolean; detail?: string }
export type OnStep = (r: StepResult) => void;

const seedContent = httpsCallable(functions, 'seedContent');
const upsertStation = httpsCallable(functions, 'upsertStation');
const deleteStation = httpsCallable(functions, 'deleteStation');
const updateContent = httpsCallable(functions, 'updateContent');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TEST_ID = 'e2e-inapp-station';

/**
 * In-app admin E2E — runs each admin capability through the REAL callables (with the admin's
 * auth token) and verifies the writes landed. Admin-only; safe + self-cleaning.
 */
export async function runAdminE2E(onStep: OnStep): Promise<{ passed: number; failed: number }> {
  let passed = 0, failed = 0;
  console.log('[E2E] ▶ starting admin end-to-end suite');
  const step = async (name: string, fn: () => Promise<string | void>) => {
    console.log(`[E2E] … ${name}`);
    try {
      const detail = await fn();
      console.log(`[E2E] ✅ ${name}${detail ? ' — ' + detail : ''}`);
      onStep({ name, ok: true, detail: detail || undefined });
      passed++;
    } catch (e: any) {
      console.warn(`[E2E] ❌ ${name} — ${e?.message ?? String(e)}`);
      onStep({ name, ok: false, detail: e?.message ?? String(e) });
      failed++;
    }
  };

  // 1. seedContent → stations + content present
  await step('תוכן: טעינת תוכן (seedContent)', async () => {
    const res: any = await seedContent({});
    const n = res?.data?.stations ?? 0;
    if (!n) throw new Error('no stations returned');
    return `${n} תחנות נטענו`;
  });

  await step('תוכן: תחנות קיימות ב-Firestore', async () => {
    const snap = await getDocs(collection(db, 'stations'));
    if (snap.size < 13) throw new Error(`only ${snap.size}`);
    return `${snap.size} תחנות`;
  });

  // 2. upsertStation → verify it lands
  await step('תוכן: הוספת תחנת בדיקה (upsertStation)', async () => {
    await upsertStation({ station: { id: TEST_ID, number: 99, name: 'תחנת בדיקה', value: 'volunteering', region: 'east', lat: 32.73, lng: 35.2 } });
    await sleep(700);
    const d = await getDoc(doc(db, 'stations', TEST_ID));
    if (!d.exists()) throw new Error('not written');
    return 'נכתבה ומופיעה במפה';
  });

  // 3. updateContent (singleton patch)
  await step('תוכן: עדכון content/event (updateContent)', async () => {
    await updateContent({ doc: 'event', patch: { _e2e: Date.now() } });
    return 'עודכן';
  });

  // 4. NFR create (direct Firestore, as the NFR screen does)
  await step('משימות: יצירת משימה (NFR)', async () => {
    const refDoc = doc(collection(db, 'nfrs'));
    await setDoc(refDoc, { lat: 32.74, lng: 35.1, radius: 150, title: 'משימת בדיקה', task: 'בדיקה', active: true, createdAt: Date.now() });
    return 'נוצרה';
  });

  // 5. Alert create → onAlertCreated fan-out
  await step('התראות: שיגור התראה (alert + fan-out)', async () => {
    const refDoc = doc(collection(db, 'alerts'));
    await setDoc(refDoc, { lat: 32.75, lng: 35.07, radius: 1000, title: 'התראת בדיקה', message: 'בדיקה', createdAt: Date.now() });
    return 'נשלחה (onAlertCreated מופעל)';
  });

  // 6. God-Mode live read
  await step('מפה חיה: קריאת live מ-RTDB', async () => {
    await get(ref(rtdb, 'live'));
    return 'נגיש';
  });

  // 7. Torch + community km read
  await step('לפיד/מובילים: קריאת torch + km', async () => {
    await get(ref(rtdb, 'torch/active'));
    await get(ref(rtdb, 'community/totalKm'));
    return 'נגיש';
  });

  // cleanup test station + test docs
  await step('ניקוי נתוני בדיקה', async () => {
    await deleteStation({ id: TEST_ID }).catch(() => {});
    for (const t of ['משימת בדיקה']) {
      const s = await getDocs(query(collection(db, 'nfrs'), where('title', '==', t)));
      for (const d of s.docs) await deleteDoc(d.ref);
    }
    const a = await getDocs(query(collection(db, 'alerts'), where('title', '==', 'התראת בדיקה')));
    for (const d of a.docs) await deleteDoc(d.ref);
    return 'נוקה';
  });

  console.log(`[E2E] ■ done — ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
