import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  GoogleAuthProvider,
  linkWithCredential,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { doc, getDoc, setDoc } from '@react-native-firebase/firestore';
import { auth, db } from '@/firebase';

/**
 * Ensure a users/{uid} profile exists (created client-side on first sign-in, since the
 * server-side blocking trigger requires GCIP). Only sets role:'user' — never admin.
 */
async function ensureProfile(user: FirebaseAuthTypes.User) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(
    ref,
    {
      uid: user.uid,
      role: 'user',
      provider: user.isAnonymous ? 'anonymous' : 'google',
      isAnonymous: user.isAnonymous,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      email: user.email ?? null,
      stationsVisited: [],
      totalKm: 0,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    },
    { merge: true }
  );
}

type Role = 'user' | 'admin';

interface AuthCtx {
  user: FirebaseAuthTypes.User | null;
  role: Role;
  initializing: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAnon: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [role, setRole] = useState<Role>('user');
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    GoogleSignin.configure({
      // webClientId comes from google-services.json / GoogleService-Info.plist at build time.
    });
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        ensureProfile(u).catch(() => {});
        const token = await u.getIdTokenResult();
        setRole((token.claims.role as Role) === 'admin' ? 'admin' : 'user');
      } else {
        setRole('user');
      }
      setInitializing(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    await GoogleSignin.hasPlayServices();
    const { data } = await GoogleSignin.signIn();
    const idToken = data?.idToken;
    if (!idToken) throw new Error('No Google idToken');
    const credential = GoogleAuthProvider.credential(idToken);
    // If currently anonymous, link to keep the same uid (km, feed history).
    if (auth.currentUser?.isAnonymous) {
      try {
        await linkWithCredential(auth.currentUser, credential);
        return;
      } catch {
        // already linked / credential in use → fall through to sign-in
      }
    }
    await signInWithCredential(auth, credential);
  };

  const signInAnon = async () => {
    await signInAnonymously(auth);
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
    } catch {
      /* ignore */
    }
    await auth.signOut();
  };

  const value = useMemo(
    () => ({ user, role, initializing, signInWithGoogle, signInAnon, signOut }),
    [user, role, initializing]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
