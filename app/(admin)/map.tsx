import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, valueTheme } from '@/theme';
import { stations, routes } from '@/content';
import { useLive, type LivePin } from '@/features/live/useLive';
import { useTorch } from '@/features/torch/useTorch';

const INITIAL: Region = { latitude: 32.72, longitude: 35.27, latitudeDelta: 0.55, longitudeDelta: 0.55 };

export default function AdminMap() {
  const insets = useSafeAreaInsets();
  const pins = useLive();
  const { torch } = useTorch();
  const [sel, setSel] = useState<LivePin | null>(null);

  const phones = pins.filter((p) => p.source === 'phone').length;
  const sensors = pins.filter((p) => p.source === 'sensor').length;

  return (
    <View style={styles.container}>
      <MapView style={StyleSheet.absoluteFill} provider={PROVIDER_GOOGLE} initialRegion={INITIAL}>
        <Polyline coordinates={routes.waypoints.map((w) => ({ latitude: w.lat, longitude: w.lng }))} strokeColor={colors.terracotta} strokeWidth={3} />

        {stations.map((s) => (
          <Marker key={s.id} coordinate={{ latitude: s.lat, longitude: s.lng }} pinColor={valueTheme[s.value].color} title={s.name} />
        ))}

        {pins.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            pinColor={p.source === 'sensor' ? colors.sky : colors.forest}
            onPress={() => setSel(p)}
            title={p.name ?? p.id}
            description={p.source === 'sensor' ? 'חיישן' : 'מטייל/ת'}
          />
        ))}

        {torch && <Marker coordinate={{ latitude: torch.lat, longitude: torch.lng }} pinColor={colors.gold} title="🔥 לפיד" />}
      </MapView>

      <View style={[styles.hud, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.hudTitle}>חמ"ל — God Mode</Text>
        <Text style={styles.hudStat}>📱 {phones} מטיילים · 📡 {sensors} חיישנים</Text>
      </View>

      <Modal visible={!!sel} transparent animationType="fade" onRequestClose={() => setSel(null)}>
        <View style={styles.backdrop}>
          {sel && (
            <View style={styles.pinCard}>
              <Text style={styles.pinName}>{sel.name ?? sel.id}</Text>
              <Text style={styles.pinKind}>{sel.source === 'sensor' ? 'חיישן IoT' : 'מטייל/ת'}</Text>
              {sel.speed != null && <Text style={styles.pinSpeed}>מהירות: {sel.speed.toFixed(1)} מ׳/ש</Text>}
              <Text style={styles.close} onPress={() => setSel(null)}>סגור</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hud: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  hudTitle: { fontSize: 18, fontWeight: '900', color: colors.ink, textShadowColor: '#fff', textShadowRadius: 6 },
  hudStat: { fontSize: 14, color: colors.ink, fontWeight: '700', textShadowColor: '#fff', textShadowRadius: 6 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  pinCard: { backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.lg, width: 260, alignItems: 'center' },
  pinName: { fontSize: 18, fontWeight: '800', color: colors.ink },
  pinKind: { color: colors.terracotta, fontWeight: '700', marginTop: 4 },
  pinSpeed: { color: colors.muted, marginTop: 4 },
  close: { color: colors.forest, fontWeight: '800', marginTop: spacing.md },
});
