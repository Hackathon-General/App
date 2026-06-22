import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Modal, Text, TouchableOpacity, ScrollView, Platform, Linking } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// iOS → Apple Maps (renders without a Google key); Android → Google Maps (key in manifest).
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

// Open Waze navigation to a point (mirrors the carmel-kinneret.org race-page Waze links).
function openWaze(lat: number, lng: number) {
  const waze = `waze://?ll=${lat},${lng}&navigate=yes`;
  const web = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  Linking.openURL(waze).catch(() => Linking.openURL(web));
}
import { colors, spacing, radius, valueTheme } from '@/theme';
import { stations, routes, content, type Station, type ValueKey } from '@/content';
import { StationSheet } from '@/components/StationSheet';
import { useTorch } from '@/features/torch/useTorch';

const VALUE_KEYS = Object.keys(valueTheme) as ValueKey[];

const INITIAL_REGION: Region = {
  latitude: 32.72,
  longitude: 35.27,
  latitudeDelta: 0.55,
  longitudeDelta: 0.55,
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [selected, setSelected] = useState<Station | null>(null);
  const [filter, setFilter] = useState<ValueKey | 'all'>('all');
  const [leg, setLeg] = useState<(typeof routes.relayLegs)[number] | null>(null);
  const { torch } = useTorch();

  const visibleStations = useMemo(
    () => (filter === 'all' ? stations : stations.filter((s) => s.value === filter)),
    [filter]
  );

  return (
    <View style={styles.container}>
      {/* Header bar: solid background, above the map */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>{content.siteTitle}</Text>
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            <Chip label="הכל" active={filter === 'all'} color={colors.forest} onPress={() => setFilter('all')} />
            {VALUE_KEYS.map((k) => (
              <Chip key={k} label={valueTheme[k].label} active={filter === k} color={valueTheme[k].color} onPress={() => setFilter(k)} />
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
                  <Text style={styles.wpMarkerTxt}>{isStart ? '🏁' : isFinish ? '🎉' : i}</Text>
                </View>
              </Marker>
            );
          })}

          {/* התנדבויות (value stations) — round value-colored badge with the value icon */}
          {visibleStations.map((s) => (
            <Marker
              key={s.id}
              coordinate={{ latitude: s.lat, longitude: s.lng }}
              onPress={() => setSelected(s)}
              title={s.name}
              description={valueTheme[s.value].label}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.stationMarker}>
                <View style={[styles.stationPin, { backgroundColor: valueTheme[s.value].color }]}>
                  <MaterialCommunityIcons name={valueTheme[s.value].icon as never} size={16} color="#fff" />
                </View>
                <View style={[styles.stationTip, { borderTopColor: valueTheme[s.value].color }]} />
              </View>
            </Marker>
          ))}
          {torch && (
            <Marker
              coordinate={{ latitude: torch.lat, longitude: torch.lng }}
              title={torch.status === 'held' ? content.ui.torch.heldByOther : content.ui.torch.waiting}
              pinColor={colors.gold}
            />
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
                <Text style={styles.wazeTxt}>נווט עם Waze ↗</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Station detail sheet */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          {selected && <StationSheet station={selected} onClose={() => setSelected(null)} onStartMission={() => setSelected(null)} />}
        </View>
      </Modal>
    </View>
  );
}

function Chip({ label, active, color, onPress }: { label: string; active: boolean; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? color : '#fff', borderColor: active ? '#fff' : color }]}
    >
      <Text numberOfLines={1} style={[styles.chipTxt, { color: active ? '#fff' : color }]}>{label}</Text>
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
  filterBar: { height: 40 },
  filters: { gap: spacing.sm, alignItems: 'center' },
  chip: { height: 32, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  chipTxt: { fontWeight: '700', fontSize: 13 },
  mapWrap: {
    flex: 1,
    marginTop: -spacing.md,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
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
  legRoute: { fontSize: 17, fontWeight: '800', color: colors.ink, textAlign: 'right', marginTop: spacing.sm },
  legKm: { fontSize: 15, color: colors.forest, fontWeight: '700', textAlign: 'right', marginTop: 2 },
  legActions: { flexDirection: 'row', marginTop: spacing.sm },
  wazeBtn: { backgroundColor: colors.sky, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8 },
  wazeTxt: { color: colors.ink, fontWeight: '700' },
  // נקודת מעבר — diamond
  wpMarker: {
    width: 28, height: 28, borderRadius: 6, transform: [{ rotate: '45deg' }],
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  wpMarkerTxt: { transform: [{ rotate: '-45deg' }], color: '#fff', fontWeight: '800', fontSize: 12 },
  // התנדבות — round pin with tail
  stationMarker: { alignItems: 'center' },
  stationPin: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  stationTip: {
    width: 0, height: 0, marginTop: -2,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },
});
