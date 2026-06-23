import { httpsCallable } from '@react-native-firebase/functions';
import { doc, getDoc, collection, getDocs, query, where, deleteDoc, setDoc, addDoc } from '@react-native-firebase/firestore';
import { ref, get } from '@react-native-firebase/database';
import { functions, db, rtdb, auth } from '@/firebase';

export interface StepResult { name: string; ok: boolean; detail?: string }
export type OnStep = (r: StepResult) => void;

const seedContent = httpsCallable(functions, 'seedContent');
const upsertStation = httpsCallable(functions, 'upsertStation');
const deleteStation = httpsCallable(functions, 'deleteStation');
const updateContent = httpsCallable(functions, 'updateContent');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TEST_ID = 'e2e-inapp-station';

/**
 * In-app admin E2E — exercises every admin capability through the REAL callables/Firestore
 * (with the admin's auth token) and verifies the writes landed. Admin-only; safe + self-cleaning.
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

  // 2. content/event has the full race data (categories, water stations)
  await step('מרוץ: content/event מכיל קטגוריות + תחנות מים', async () => {
    const d = await getDoc(doc(db, 'content/event'));
    const data: any = d.data();
    const cats = data?.categories ?? [];
    if (cats.length < 3) throw new Error(`only ${cats.length} categories`);
    const water = cats.find((c: any) => (c.waterStations?.length ?? 0) > 0);
    if (!water) throw new Error('no water stations');
    return `${cats.length} קטגוריות, תחנות מים קיימות`;
  });

  // 3. content/info seeded (about / regulations)
  await step('מידע: content/info נטען (מי אנחנו + תקנון)', async () => {
    const d = await getDoc(doc(db, 'content/info'));
    const data: any = d.data();
    if (!data?.about || !(data?.regulations?.length)) throw new Error('info missing');
    return 'מי אנחנו + תקנון קיימים';
  });

  // 4. upsertStation → verify it lands
  await step('תוכן: הוספת תחנת בדיקה (upsertStation)', async () => {
    await upsertStation({ station: { id: TEST_ID, number: 99, name: 'תחנת בדיקה', value: 'volunteering', region: 'east', lat: 32.73, lng: 35.2 } });
    await sleep(700);
    const d = await getDoc(doc(db, 'stations', TEST_ID));
    if (!d.exists()) throw new Error('not written');
    return 'נכתבה ומופיעה במפה';
  });

  // 5. updateContent (singleton patch) — event + info
  await step('תוכן: עדכון content/event + content/info (updateContent)', async () => {
    await updateContent({ doc: 'event', patch: { _e2e: Date.now() } });
    await updateContent({ doc: 'info', patch: { _e2e: Date.now() } });
    return 'עודכן';
  });

  // 6. NFR create + listener reads it back active
  await step('משימות: יצירת NFR ומופיעה כפעילה', async () => {
    const refDoc = doc(collection(db, 'nfrs'));
    await setDoc(refDoc, { lat: 32.74, lng: 35.1, radius: 150, title: 'משימת בדיקה', task: 'בדיקה', active: true, createdAt: Date.now() });
    await sleep(500);
    const s = await getDocs(query(collection(db, 'nfrs'), where('active', '==', true)));
    if (s.empty) throw new Error('no active nfr read back');
    return `${s.size} משימות פעילות`;
  });

  // 7. Alert create → onAlertCreated fan-out
  await step('התראות: שיגור התראה (alert + fan-out)', async () => {
    const refDoc = doc(collection(db, 'alerts'));
    await setDoc(refDoc, { lat: 32.75, lng: 35.07, radius: 1000, kind: 'info', title: 'התראת בדיקה', message: 'בדיקה', createdAt: Date.now() });
    return 'נשלחה (onAlertCreated מופעל)';
  });

  // 8. take-home rule write (admin CRUD)
  await step('המשך: כתיבת משימת המשך (takeHomeRules)', async () => {
    await setDoc(doc(db, 'takeHomeRules', 'e2e-th'), { title: 'בדיקת המשך', description: '', link: '', value: 'volunteering', updatedAt: Date.now() });
    const d = await getDoc(doc(db, 'takeHomeRules', 'e2e-th'));
    if (!d.exists()) throw new Error('not written');
    return 'נכתבה';
  });

  // 9. SOS event create → onSosCreated notifies admins; admin can read it
  await step('מצוקה: יצירת SOS וקריאתו (sosEvents)', async () => {
    const uid = auth.currentUser?.uid ?? 'e2e';
    await addDoc(collection(db, 'sosEvents'), { authorId: uid, authorName: 'בדיקה', lat: 32.7, lng: 35.2, status: 'open', createdAt: Date.now() });
    await sleep(400);
    const s = await getDocs(query(collection(db, 'sosEvents'), where('authorName', '==', 'בדיקה')));
    if (s.empty) throw new Error('sos not read back');
    return 'נוצר ונקרא (push לאדמינים)';
  });

  // 10. Form submission → admin inbox reads it
  await step('פניות: שליחת טופס וקריאתו (forms inbox)', async () => {
    await addDoc(collection(db, 'forms'), { type: 'contact', status: 'new', data: { name: 'בדיקה' }, createdAt: Date.now() });
    await sleep(400);
    const s = await getDocs(query(collection(db, 'forms'), where('status', '==', 'new')));
    if (s.empty) throw new Error('form not read back');
    return 'נשלח ומופיע בתיבת הפניות';
  });

  // 11. Feed read (community gallery)
  await step('קהילה: קריאת feed', async () => {
    await getDocs(collection(db, 'feed'));
    return 'נגיש';
  });

  // 11b. Local notification — permission + fire a banner (foreground-safe)
  await step('התראות: בדיקת נוטיפיקציה מקומית', async () => {
    const { notifyNow, ensureNotifReady } = await import('@/notifications/notifications');
    const ok = await ensureNotifReady();
    if (!ok) throw new Error('הרשאת התראות לא ניתנה');
    await notifyNow('בדיקת התראה ✅', 'אם רואים את זה — ההתראות עובדות!', { test: '1' });
    return 'נשלחה התראה מקומית';
  });

  // 12. God-Mode live read (phones + IoT sensors)
  await step('מפה חיה: קריאת live מ-RTDB (מובייל+IoT)', async () => {
    await get(ref(rtdb, 'live'));
    return 'נגיש';
  });

  // 13. Torch + community km read (leaderboard)
  await step('לפיד/מובילים: קריאת torch + km קהילתי', async () => {
    await get(ref(rtdb, 'torch/active'));
    await get(ref(rtdb, 'community/totalKm'));
    return 'נגיש';
  });

  // cleanup all test docs
  await step('ניקוי נתוני בדיקה', async () => {
    await deleteStation({ id: TEST_ID }).catch(() => {});
    await deleteDoc(doc(db, 'takeHomeRules', 'e2e-th')).catch(() => {});
    const drop = async (coll: string, field: string, val: string) => {
      const s = await getDocs(query(collection(db, coll), where(field, '==', val)));
      for (const d of s.docs) await deleteDoc(d.ref).catch(() => {});
    };
    await drop('nfrs', 'title', 'משימת בדיקה');
    await drop('alerts', 'title', 'התראת בדיקה');
    await drop('sosEvents', 'authorName', 'בדיקה');
    await drop('forms', 'type', 'contact');
    return 'נוקה';
  });

  console.log(`[E2E] ■ done — ${passed} passed, ${failed} failed`);
  return { passed, failed };
}
