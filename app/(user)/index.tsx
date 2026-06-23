import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Platform, Linking } from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { distanceMeters } from '@/features/torch/distance';
import { MAP_PROVIDER, LivePinMarkers, TorchMarker, FeedPinMarkers } from '@/map/markers';

// Open Waze navigation to a point (mirrors the carmel-kinneret.org race-page Waze links).
function openWaze(lat: number, lng: number) {
  const waze = `waze://?ll=${lat},${lng}&navigate=yes`;
  const web = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  Linking.openURL(waze).catch(() => Linking.openURL(web));
}
import { colors, spacing, radius, valueTheme } from '@/theme';
import { content } from '@/content';
import { useContent, type Station, type ValueKey } from '@/content/ContentProvider';
import { StationSheet } from '@/components/StationSheet';
import { BottomSheet } from '@/components/BottomSheet';
import { StationCarousel, type CarouselHandle } from '@/components/StationCarousel';
import { PulseRing } from '@/components/PulseRing';
import { SosButton } from '@/components/SosButton';
import { useTorch } from '@/features/torch/useTorch';
import { useLive } from '@/features/live/useLive';
import { useFeedPins } from '@/features/feed/feed';
import { useAuth } from '@/auth/AuthProvider';

const VALUE_KEYS = Object.keys(valueTheme) as ValueKey[];

const visibleStationsList = (all: Station[], filter: ValueKey | 'all') =>
  filter === 'all' ? all.slice() : all.filter((s) => s.value === filter);

interface RelayLeg { n: number; from: string; to: string; km: number; fromLat: number; fromLng: number; toLat: number; toLng: number }

const INITIAL_REGION: Region = {
  latitude: 32.72,
  longitude: 35.27,
  latitudeDelta: 0.55,
  longitudeDelta: 0.55,
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { stations, routes } = useContent();
  const [selected, setSelected] = useState<Station | null>(null);
  const [filter, setFilter] = useState<ValueKey | 'all'>('all');
  const [leg, setLeg] = useState<RelayLeg | null>(null);
  const { torch } = useTorch();
  const { user } = useAuth();
  const livePins = useLive(); // everyone sharing publicly (phones + sensors), Snapchat-style
  const feedPins = useFeedPins(); // community moments users opted to show on the map
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [showList, setShowList] = useState(false); // toggleable proximity carousel
  const [activeId, setActiveId] = useState<string | null>(null); // carousel ↔ map highlighted station (by id, list is proximity-sorted)
  const carouselRef = useRef<CarouselHandle>(null);

  // Track my location for proximity sorting + "center on me".
  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 30, timeInterval: 8000 },
        (l) => setMyPos({ lat: l.coords.latitude, lng: l.coords.longitude })
      );
    })();
    return () => sub?.remove();
  }, []);

  // Stations ordered by proximity to me (fallback: trail order).
  const orderedStations = useMemo(() => {
    const xs = visibleStationsList(stations, filter);
    if (!myPos) return xs;
    return xs
      .map((s) => ({ s, d: distanceMeters(myPos, { lat: s.lat, lng: s.lng }) }))
      .sort((a, b) => a.d - b.d)
      .map((x) => ({ ...x.s, _distM: x.d }));
  }, [stations, filter, myPos]);

  // The station currently highlighted in the carousel (by id — drives marker pulse + path-to-me).
  const activeStation = showList && activeId ? orderedStations.find((s) => s.id === activeId) : undefined;

  const focusStation = (s: { lat: number; lng: number }) => {
    mapRef.current?.animateToRegion(
      { latitude: s.lat, longitude: s.lng, latitudeDelta: 0.012, longitudeDelta: 0.012 },
      600
    );
  };

  // Carousel centered card changed. Highlight updates LIVE (so the map marker matches the card
  // in real time); the map only pans when the scroll has SETTLED (avoids jerky mid-swipe panning).
  const onCarouselActive = (id: string, settled: boolean) => {
    setActiveId(id);
    if (settled) {
      const s = orderedStations.find((x) => x.id === id);
      if (s) focusStation(s);
    }
  };

  // A station marker was tapped → open the carousel, sync it to that card (by id), zoom in.
  const onStationMarkerPress = (s: Station) => {
    setShowList(true);
    setActiveId(s.id);
    carouselRef.current?.scrollToId(s.id);
    focusStation(s);
    setSelected(s);
  };

  const centerOnMe = () => {
    if (!myPos) return;
    mapRef.current?.animateToRegion(
      { latitude: myPos.lat, longitude: myPos.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      700
    );
  };

  // Zoom in/out. Works on both providers: scale the current region's deltas (Apple Maps doesn't
  // expose camera.zoom), with a camera-zoom fast path when available (Google Maps).
  const regionRef = useRef<Region>(INITIAL_REGION);
  const zoom = async (dir: 1 | -1) => {
    Haptics.selectionAsync().catch(() => {});
    const factor = dir === 1 ? 0.5 : 2; // in → halve span, out → double
    const cam = await mapRef.current?.getCamera().catch(() => undefined);
    if (cam && cam.zoom != null) {
      mapRef.current?.animateCamera({ zoom: Math.max(3, Math.min(20, cam.zoom + dir)) }, { duration: 250 });
      return;
    }
    const r = regionRef.current;
    mapRef.current?.animateToRegion({
      latitude: r.latitude, longitude: r.longitude,
      latitudeDelta: Math.max(0.002, Math.min(1.2, r.latitudeDelta * factor)),
      longitudeDelta: Math.max(0.002, Math.min(1.2, r.longitudeDelta * factor)),
    }, 250);
  };

  // "Recenter on the trail" — fit the whole Carmel→Kinneret route in view.
  const [offTrail, setOffTrail] = useState(false);
  const fitToTrail = () => {
    Haptics.selectionAsync().catch(() => {});
    mapRef.current?.fitToCoordinates(
      routes.waypoints.map((w) => ({ latitude: w.lat, longitude: w.lng })),
      { edgePadding: { top: 120, right: 60, bottom: 180, left: 60 }, animated: true }
    );
    setOffTrail(false);
  };

  // Trail bounding box (from the waypoints) — for accurate "is the trail in view?" checks.
  const trailBounds = useMemo(() => {
    const ws = routes.waypoints;
    if (!ws?.length) return null;
    const lats = ws.map((w) => w.lat), lngs = ws.map((w) => w.lng);
    return { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLng: Math.min(...lngs), maxLng: Math.max(...lngs) };
  }, [routes.waypoints]);

  // Show "חזרה לשביל" only when the trail's bbox does NOT overlap the visible region.
  const onRegionChange = (r: Region) => {
    regionRef.current = r; // keep latest region for delta-based zoom
    if (!trailBounds) return;
    const viewMinLat = r.latitude - r.latitudeDelta / 2, viewMaxLat = r.latitude + r.latitudeDelta / 2;
    const viewMinLng = r.longitude - r.longitudeDelta / 2, viewMaxLng = r.longitude + r.longitudeDelta / 2;
    const overlaps =
      trailBounds.minLat <= viewMaxLat && trailBounds.maxLat >= viewMinLat &&
      trailBounds.minLng <= viewMaxLng && trailBounds.maxLng >= viewMinLng;
    setOffTrail(!overlaps);
  };

  const visibleStations = useMemo(
    () => (filter === 'all' ? stations : stations.filter((s) => s.value === filter)),
    [stations, filter]
  );

  return (
    <View style={styles.container}>
      {/* Header bar: solid background, above the map */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>{content.siteTitle}</Text>
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            <Chip label="הכל" icon="map-marker-multiple" active={filter === 'all'} color={colors.forest} onPress={() => setFilter('all')} />
            {VALUE_KEYS.map((k) => (
              <Chip key={k} label={valueTheme[k].label} icon={valueTheme[k].icon} active={filter === k} color={valueTheme[k].color} onPress={() => setFilter(k)} />
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Map fills the rest, with rounded top corners tucked under the header */}
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={MAP_PROVIDER}
          initialRegion={INITIAL_REGION}
          showsUserLocation
          showsMyLocationButton={false}
          onRegionChangeComplete={onRegionChange}
        >
          {/* Interactive route: leg-colored polyline segments (Carmel→Kinneret) */}
          {routes.relayLegs.map((leg, i) => (
            <Polyline
              key={`leg-${leg.n}`}
              coordinates={[
                { latitude: leg.fromLat, longitude: leg.fromLng },
                { latitude: leg.toLat, longitude: leg.toLng },
              ]}
              strokeColor={i % 2 === 0 ? colors.terracotta : colors.forest}
              strokeWidth={5}
              tappable
              onPress={() => setLeg(leg)}
            />
          ))}

          {/* נקודות מעבר (waypoints) — distinct diamond marker with start/finish/number */}
          {routes.waypoints.map((w, i) => {
            const isStart = i === 0;
            const isFinish = i === routes.waypoints.length - 1;
            const bg = isStart ? colors.success : isFinish ? colors.danger : colors.deepGreen;
            return (
              <Marker
                key={`wp-${i}`}
                coordinate={{ latitude: w.lat, longitude: w.lng }}
                title={w.name}
                description={isStart ? 'זינוק' : isFinish ? 'סיום' : `נקודת מעבר ${i}`}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={[styles.wpMarker, { backgroundColor: bg }]}>
                  {isStart || isFinish ? (
                    <MaterialCommunityIcons name={isStart ? 'flag' : 'flag-checkered'} size={14} color="#fff" style={styles.wpIcon} />
                  ) : (
                    <Text style={styles.wpMarkerTxt}>{i}</Text>
                  )}
                </View>
              </Marker>
            );
          })}

          {/* Dashed "to you" path from the highlighted station to your location */}
          {activeStation && myPos && (
            <Polyline
              coordinates={[
                { latitude: activeStation.lat, longitude: activeStation.lng },
                { latitude: myPos.lat, longitude: myPos.lng },
              ]}
              strokeColor={valueTheme[activeStation.value].color}
              strokeWidth={3}
              lineDashPattern={[8, 8]}
            />
          )}

          {/* התנדבויות (value stations) — round value-colored badge with the value icon */}
          {visibleStations.map((s) => {
            const isActive = activeStation?.id === s.id;
            const vc = valueTheme[s.value].color;
            return (
              <Marker
                key={s.id}
                coordinate={{ latitude: s.lat, longitude: s.lng }}
                onPress={() => onStationMarkerPress(s)}
                title={s.name}
                description={valueTheme[s.value].label}
                anchor={{ x: 0.5, y: 1 }}
                zIndex={isActive ? 999 : 1}
              >
                <View style={styles.stationMarker}>
                  {isActive && (
                    <View style={styles.pulseWrap} pointerEvents="none">
                      <PulseRing size={70} color={vc} rings={2} />
                    </View>
                  )}
                  <View style={[styles.stationPin, { backgroundColor: vc }, isActive && styles.stationPinActive]}>
                    <MaterialCommunityIcons name={valueTheme[s.value].icon as never} size={isActive ? 20 : 16} color="#fff" />
                  </View>
                  <View style={[styles.stationTip, { borderTopColor: vc }]} />
                </View>
              </Marker>
            );
          })}
          {/* Live people sharing publicly (Snapchat-style) — phones = avatar, sensors = runner */}
          {livePins
            .filter((p) => p.id !== user?.uid)
            .map((p) => (
              <Marker
                key={`live-${p.id}`}
                coordinate={{ latitude: p.lat, longitude: p.lng }}
                title={p.name ?? 'מטייל/ת'}
                description={p.source === 'sensor' ? 'חיישן' : 'משתף/ת מיקום'}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={[styles.personMarker, p.source === 'sensor' && styles.sensorMarker]}>
                  {p.source === 'sensor' ? (
                    <MaterialCommunityIcons name="run-fast" size={20} color="#fff" />
                  ) : (
                    <Text style={styles.personTxt}>{(p.name ?? 'מ')[0]}</Text>
                  )}
                </View>
              </Marker>
            ))}

          {/* Community moments shared to the map — photo-thumbnail pins */}
          <FeedPinMarkers pins={feedPins} />

          {torch && (
            <Marker
              coordinate={{ latitude: torch.lat, longitude: torch.lng }}
              title={torch.status === 'held' ? content.ui.torch.heldByOther : content.ui.torch.waiting}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.torchMarker}>
                <MaterialCommunityIcons name="torch" size={22} color="#fff" />
              </View>
            </Marker>
          )}
        </MapView>

        {/* Leg ("cut"/מקטע) detail card — appears when a route segment is tapped */}
        {leg && (
          <View style={styles.legCard}>
            <View style={styles.legHeaderRow}>
              <View style={styles.legBadge}><Text style={styles.legBadgeTxt}>מקטע {leg.n}</Text></View>
              <TouchableOpacity onPress={() => setLeg(null)}><Text style={styles.legClose}>✕</Text></TouchableOpacity>
            </View>
            <Text style={styles.legRoute}>{leg.from} ← {leg.to}</Text>
            <Text style={styles.legKm}>{leg.km} ק"מ</Text>
            <View style={styles.legActions}>
              <TouchableOpacity style={styles.wazeBtn} onPress={() => openWaze(leg.toLat, leg.toLng)}>
                <MaterialCommunityIcons name="navigation-variant" size={16} color={colors.ink} />
                <Text style={styles.wazeTxt}>נווט עם Waze</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* "Recenter on the trail" — appears when you've panned away from the path */}
        {offTrail && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.recenterWrap}>
            <TouchableOpacity style={styles.recenterBtn} onPress={fitToTrail} activeOpacity={0.85}>
              <MaterialCommunityIcons name="map-marker-path" size={18} color="#fff" />
              <Text style={styles.recenterTxt}>חזרה לשביל</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Floating map controls — grouped zoom pill + round action buttons */}
        <View style={styles.fabCol} pointerEvents="box-none">
          <View style={styles.zoomPill}>
            <TouchableOpacity style={styles.zoomBtn} onPress={() => zoom(1)} activeOpacity={0.7}>
              <MaterialCommunityIcons name="plus" size={22} color={colors.ink} />
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity style={styles.zoomBtn} onPress={() => zoom(-1)} activeOpacity={0.7}>
              <MaterialCommunityIcons name="minus" size={22} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.fab} onPress={centerOnMe} activeOpacity={0.8}>
            <MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.forest} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fab, showList && styles.fabActive]} activeOpacity={0.8} onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setShowList((v) => {
              const next = !v;
              if (next && orderedStations[0]) { setActiveId(orderedStations[0].id); focusStation(orderedStations[0]); }
              return next;
            });
          }}>
            <MaterialCommunityIcons name={showList ? 'close' : 'view-list'} size={22} color={showList ? '#fff' : colors.forest} />
          </TouchableOpacity>
        </View>

        {/* Snap-to-zoom proximity carousel — swipe → map zooms to & pulses the centered station */}
        {showList && orderedStations.length > 0 && (
          <View style={styles.carousel}>
            <StationCarousel
              ref={carouselRef}
              stations={orderedStations}
              activeId={activeId}
              onActiveChange={onCarouselActive}
              onPressCard={(s) => { focusStation(s); setSelected(stations.find((x) => x.id === s.id) ?? null); }}
              onWaze={(s) => openWaze(s.lat, s.lng)}
            />
          </View>
        )}
      </View>

      {/* SOS — only on the map page; hidden while the list OR a station sheet is open */}
      {!showList && !selected && <SosButton />}

      {/* Station detail sheet — animated, drag-to-dismiss */}
      <BottomSheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && <StationSheet station={selected} onClose={() => setSelected(null)} onStartMission={() => setSelected(null)} />}
      </BottomSheet>
    </View>
  );
}

function Chip({ label, icon, active, color, onPress }: { label: string; icon?: any; active: boolean; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.chip, { backgroundColor: active ? color : 'rgba(255,255,255,0.95)', borderColor: active ? color : 'transparent' }]}
    >
      {!!icon && <MaterialCommunityIcons name={icon} size={14} color={active ? '#fff' : color} />}
      <Text numberOfLines={1} style={[styles.chipTxt, { color: active ? '#fff' : colors.ink }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.forest },
  header: {
    backgroundColor: colors.forest,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    zIndex: 2,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: spacing.sm },
  filterBar: { height: 40, direction: 'rtl' },
  filters: { gap: spacing.sm, alignItems: 'center', flexDirection: 'row', paddingHorizontal: 2 },
  chip: { flexDirection: 'row-reverse', gap: 5, height: 34, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  chipTxt: { fontWeight: '800', fontSize: 13 },
  mapWrap: {
    flex: 1,
    marginTop: -spacing.md,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  legCard: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: spacing.md,
    borderTopWidth: 4,
    borderTopColor: colors.terracotta,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  legHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legBadge: { backgroundColor: colors.terracotta, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  legBadgeTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  legClose: { fontSize: 18, color: colors.muted },
  legRoute: { fontSize: 17, fontWeight: '800', color: colors.ink, textAlign: 'right', marginTop: spacing.sm, writingDirection: 'rtl' },
  legKm: { fontSize: 15, color: colors.forest, fontWeight: '700', textAlign: 'right', marginTop: 2, writingDirection: 'rtl' },
  legActions: { flexDirection: 'row', marginTop: spacing.sm },
  wazeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.sky, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' },
  wazeTxt: { color: colors.ink, fontWeight: '700' },
  // נקודת מעבר — diamond
  wpMarker: {
    width: 28, height: 28, borderRadius: 6, transform: [{ rotate: '45deg' }],
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  wpMarkerTxt: { transform: [{ rotate: '-45deg' }], color: '#fff', fontWeight: '800', fontSize: 12 },
  wpIcon: { transform: [{ rotate: '-45deg' }] },
  torchMarker: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, elevation: 5 },
  // התנדבות — round pin with tail
  stationMarker: { alignItems: 'center' },
  pulseWrap: { position: 'absolute', top: -19, alignItems: 'center', justifyContent: 'center', width: 70, height: 70 },
  stationPin: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  stationPinActive: { width: 42, height: 42, borderRadius: 21, borderWidth: 3, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 },
  stationTip: {
    width: 0, height: 0, marginTop: -2,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
  // Live person (Snapchat-style)
  personMarker: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.forest,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
  },
  sensorMarker: { backgroundColor: colors.sky },
  personTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  // Recenter-on-trail pill (top-center of map)
  recenterWrap: { position: 'absolute', top: spacing.md, alignSelf: 'center' },
  recenterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.forest, paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 5, elevation: 5,
  },
  recenterTxt: { color: '#fff', fontWeight: '800', fontSize: 14, writingDirection: 'rtl' },
  // Floating controls
  fabCol: { position: 'absolute', top: 64, right: spacing.md, gap: 10, zIndex: 10001, direction: 'ltr', alignItems: 'center' },
  zoomPill: {
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 22, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  zoomBtn: { width: 46, height: 44, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { height: 1, backgroundColor: colors.line, marginHorizontal: 8 },
  fab: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  fabActive: { backgroundColor: colors.terracotta },
  // Proximity carousel container (above SOS via high zIndex)
  carousel: { position: 'absolute', bottom: 24, left: 0, right: 0, zIndex: 10000, elevation: 12 },
});
