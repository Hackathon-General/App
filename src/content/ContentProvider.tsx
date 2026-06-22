import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, doc } from '@react-native-firebase/firestore';
import { db } from '@/firebase';
import stationsJson from './stations.json';
import eventsJson from './events.json';
import routesJson from './routes.json';
import he from './he.json';
import infoJson from './info.json';

export type Station = (typeof stationsJson.stations)[number];
export type ValueKey = Station['value'];

interface ContentState {
  stations: Station[];
  events: typeof eventsJson;
  routes: typeof routesJson;
  site: typeof he;
  info: typeof infoJson;
  loading: boolean; // true until first Firestore snapshot (JSON shown meanwhile)
}

// Bundled JSON is the instant fallback (offline / first paint); Firestore overrides it live.
const FALLBACK: ContentState = {
  stations: stationsJson.stations as Station[],
  events: eventsJson,
  routes: routesJson,
  site: he,
  info: infoJson,
  loading: true,
};

const Ctx = createContext<ContentState>(FALLBACK);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ContentState>(FALLBACK);

  useEffect(() => {
    console.log('[Content] subscribing to Firestore (stations + content/*)…');
    // Live stations.
    const unsubStations = onSnapshot(
      collection(db, 'stations'),
      (snap: any) => {
        if (!snap || snap.empty || !snap.docs?.length) {
          console.log('[Content] stations snapshot EMPTY → using bundled JSON fallback');
          return;
        }
        const stations = snap.docs
          .map((d: any) => d.data() as Station)
          .sort((a: Station, b: Station) => (a.number ?? 0) - (b.number ?? 0));
        console.log(`[Content] stations FROM FIRESTORE: ${stations.length} docs (live)`);
        setState((s) => ({ ...s, stations, loading: false }));
      },
      (err: any) => console.warn('[Content] stations listener error:', err?.message ?? err)
    );

    // Live singletons (event / routes / site). RNFirebase: `exists` is a property; data() may be undefined.
    const unsubEvent = onSnapshot(doc(db, 'content/event'), (d: any) => {
      const data = d?.data?.();
      if (data) { console.log('[Content] content/event FROM FIRESTORE'); setState((s) => ({ ...s, events: { ...s.events, ...data } })); }
    });
    const unsubRoutes = onSnapshot(doc(db, 'content/routes'), (d: any) => {
      const data = d?.data?.();
      if (data) { console.log('[Content] content/routes FROM FIRESTORE'); setState((s) => ({ ...s, routes: { ...s.routes, ...data } })); }
    });
    const unsubSite = onSnapshot(doc(db, 'content/site'), (d: any) => {
      const data = d?.data?.();
      if (data) { console.log('[Content] content/site FROM FIRESTORE'); setState((s) => ({ ...s, site: { ...s.site, ...data } })); }
    });
    const unsubInfo = onSnapshot(doc(db, 'content/info'), (d: any) => {
      const data = d?.data?.();
      if (data) { console.log('[Content] content/info FROM FIRESTORE'); setState((s) => ({ ...s, info: { ...s.info, ...data } })); }
    });

    return () => {
      unsubStations();
      unsubEvent();
      unsubRoutes();
      unsubInfo();
      unsubSite();
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useContent() {
  return useContext(Ctx);
}
