/**
 * React Native Firebase — MODULAR API only (namespaced is removed in v22).
 * Single source for all Firebase service instances.
 */
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getDatabase } from '@react-native-firebase/database';
import { getStorage } from '@react-native-firebase/storage';
import { getFunctions } from '@react-native-firebase/functions';
import { getMessaging } from '@react-native-firebase/messaging';

export const app = getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
// RTDB lives in europe-west1.
export const rtdb = getDatabase(
  app,
  'https://carmel-kinneret-default-rtdb.europe-west1.firebasedatabase.app'
);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'europe-west1');
export const messaging = getMessaging(app);
