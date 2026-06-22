import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Circle, type Region } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '@/theme';
import { useContent } from '@/content/ContentProvider';
import { useLive, type LivePin } from '@/features/live/useLive';
import { useFeedPins } from '@/features/feed/feed';
import { useNfrs } from '@/features/missions/useNfrs';
import { PulseCircle } from '@/components/PulseCircle';
import { useTorch } from '@/features/torch/useTorch';
import { BottomSheet } from '@/components/BottomSheet';
import { MAP_PROVIDER, TrailPolyline, StationMarkers, TorchMarker, LivePinMarkers, FeedPinMarkers } from '@/map/markers';

const INITIAL: Region = { latitude: 32.72, longitude: 35.27, latitudeDelta: 0.55, longitudeDelta: 0.55 };

export default function AdminMap() {
  const insets = useSafeAreaInsets();
  const { stations, routes } = useContent();
  const pins = useLive();
  const feedPins = useFeedPins();
  const nfrs = useNfrs();
  const { torch } = useTorch();
  const [sel, setSel] = useState<LivePin | null>(null);

  const phones = pins.filter((p) => p.source === 'phone').length;
  const sensors = pins.filter((p) => p.source === 'sensor').length;

  return (
    <View style={styles.container}>
      <MapView style={StyleSheet.absoluteFill} provider={MAP_PROVIDER} initialRegion={INITIAL}>
        <TrailPolyline waypoints={routes.waypoints} strokeWidth={3} />
        <StationMarkers stations={stations} />
        {nfrs.map((n, i) => (
          <React.Fragment key={n.id}>
            <Circle center={{ latitude: n.lat, longitude: n.lng }} radius={n.radius ?? 150} strokeColor={colors.forest} fillColor="rgba(46,125,50,0.10)" strokeWidth={2} />
            <PulseCircle lat={n.lat} lng={n.lng} radius={n.radius ?? 150} color={colors.forest} />
            <Marker coordinate={{ latitude: n.lat, longitude: n.lng }} title={n.title} description={n.task} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.nfrPin}><Text style={styles.nfrNum}>{i + 1}</Text></View>
            </Marker>
          </React.Fragment>
        ))}
        <LivePinMarkers pins={pins} onPress={setSel} />
        <FeedPinMarkers pins={feedPins} />
        {torch && <TorchMarker lat={torch.lat} lng={torch.lng} />}
      </MapView>

      <View style={[styles.hud, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.hudTitle}>חמ"ל — God Mode</Text>
        <View style={styles.hudStatRow}>
          <MaterialCommunityIcons name="cellphone" size={15} color={colors.ink} />
          <Text style={styles.hudStat}>{phones} מטיילים</Text>
          <MaterialCommunityIcons name="access-point" size={15} color={colors.ink} />
          <Text style={styles.hudStat}>{sensors} חיישנים</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.backBtn, { top: insets.top + spacing.sm }]} onPress={() => router.replace('/(user)')} hitSlop={8}>
        <MaterialCommunityIcons name="exit-to-app" size={18} color={colors.ink} />
      </TouchableOpacity>

      <BottomSheet visible={!!sel} onClose={() => setSel(null)}>
        {sel && (
          <View style={styles.pinCard}>
            <Text style={styles.pinName}>{sel.name ?? sel.id}</Text>
            <Text style={styles.pinKind}>{sel.source === 'sensor' ? 'חיישן IoT' : 'מטייל/ת'}</Text>
            {sel.speed != null && <Text style={styles.pinSpeed}>מהירות: {sel.speed.toFixed(1)} מ׳/ש</Text>}
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, direction: 'rtl' },
  hud: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  hudTitle: { fontSize: 18, fontWeight: '900', color: colors.ink, textShadowColor: '#fff', textShadowRadius: 6, writingDirection: 'rtl' },
  hudStatRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  hudStat: { fontSize: 13, color: colors.ink, fontWeight: '700' },
  backBtn: { position: 'absolute', right: spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, elevation: 4 },
  nfrPin: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.forest, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  nfrNum: { color: '#fff', fontWeight: '900', fontSize: 13 },
  pinCard: { padding: spacing.lg, alignItems: 'center', direction: 'rtl' },
  pinName: { fontSize: 18, fontWeight: '800', color: colors.ink, writingDirection: 'rtl' },
  pinKind: { color: colors.terracotta, fontWeight: '700', marginTop: 4, writingDirection: 'rtl' },
  pinSpeed: { color: colors.muted, marginTop: 4 },
});
