import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, doc } from '@react-native-firebase/firestore';
import { db } from '@/firebase';
import stationsJson from './stations.json';
import eventsJson from './events.json';
import routesJson from './routes.json';
import he from './he.json';

export type Station = (typeof stationsJson.stations)[number];
export type ValueKey = Station['value'];

interface ContentState {
  stations: Station[];
  events: typeof eventsJson;
  routes: typeof routesJson;
  site: typeof he;
  loading: boolean; // true until first Firestore snapshot (JSON shown meanwhile)
}

// Bundled JSON is the instant fallback (offline / first paint); Firestore overrides it live.
const FALLBACK: ContentState = {
  stations: stationsJson.stations as Station[],
  events: eventsJson,
  routes: routesJson,
  site: he,
  loading: true,
};

const Ctx = createContext<ContentState>(FALLBACK);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ContentState>(FALLBACK);

  useEffect(() => {
    // Live stations.
    const unsubStations = onSnapshot(collection(db, 'stations'), (snap: any) => {
      if (!snap || snap.empty || !snap.docs?.length) return; // keep fallback until seeded
      const stations = snap.docs
        .map((d: any) => d.data() as Station)
        .sort((a: Station, b: Station) => (a.number ?? 0) - (b.number ?? 0));
      setState((s) => ({ ...s, stations, loading: false }));
    });

    // Live singletons (event / routes / site). RNFirebase: `exists` is a property; data() may be undefined.
    const unsubEvent = onSnapshot(doc(db, 'content/event'), (d: any) => {
      const data = d?.data?.();
      if (data) setState((s) => ({ ...s, events: { ...s.events, ...data } }));
    });
    const unsubRoutes = onSnapshot(doc(db, 'content/routes'), (d: any) => {
      const data = d?.data?.();
      if (data) setState((s) => ({ ...s, routes: { ...s.routes, ...data } }));
    });
    const unsubSite = onSnapshot(doc(db, 'content/site'), (d: any) => {
      const data = d?.data?.();
      if (data) setState((s) => ({ ...s, site: { ...s.site, ...data } }));
    });

    return () => {
      unsubStations();
      unsubEvent();
      unsubRoutes();
      unsubSite();
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useContent() {
  return useContext(Ctx);
}
