import { collection, addDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { db, auth } from '@/firebase';

export type FormType = 'registration' | 'volunteer' | 'teamFinder' | 'contact';

export interface FormSubmission {
  id: string;
  type: FormType;
  status: 'new' | 'handled' | 'archived';
  data: Record<string, string>;
  uid?: string;
  authorName?: string;
  createdAt: number;
}

/** Submit a form → forms/{id}. Rules require status:'new' + signed-in. */
export async function submitForm(type: FormType, data: Record<string, string>) {
  await addDoc(collection(db, 'forms'), {
    type,
    status: 'new',
    data,
    uid: auth.currentUser?.uid ?? null,
    authorName: auth.currentUser?.displayName ?? null,
    createdAt: Date.now(),
    serverTs: serverTimestamp(),
  });
}

export const FORM_META: Record<FormType, { title: string; icon: string }> = {
  registration: { title: 'הרשמה למרוץ', icon: 'clipboard-text' },
  volunteer: { title: 'התנדבות במרוץ', icon: 'hand-heart' },
  teamFinder: { title: 'חיפוש צוות', icon: 'account-search' },
  contact: { title: 'יצירת קשר', icon: 'email' },
};
