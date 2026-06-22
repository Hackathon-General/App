import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Modal, Text, TouchableOpacity, ScrollView } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const { torch } = useTorch();

  const visibleStations = useMemo(
    () => (filter === 'all' ? stations : stations.filter((s) => s.value === filter)),
    [filter]
  );

  const trailCoords = routes.waypoints.map((w) => ({ latitude: w.lat, longitude: w.lng }));

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Trail route polyline */}
        <Polyline coordinates={trailCoords} strokeColor={colors.terracotta} strokeWidth={4} />

        {/* Stations colored by value */}
        {visibleStations.map((s) => (
          <Marker
            key={s.id}
            coordinate={{ latitude: s.lat, longitude: s.lng }}
            pinColor={valueTheme[s.value].color}
            onPress={() => setSelected(s)}
            title={s.name}
            description={valueTheme[s.value].label}
          />
        ))}

        {/* Live torch */}
        {torch && (
          <Marker
            coordinate={{ latitude: torch.lat, longitude: torch.lng }}
            title={torch.status === 'held' ? content.ui.torch.heldByOther : content.ui.torch.waiting}
            pinColor={colors.gold}
          />
        )}
      </MapView>

      {/* Header: title + value filters */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>{content.siteTitle}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <Chip label="הכל" active={filter === 'all'} color={colors.forest} onPress={() => setFilter('all')} />
          {VALUE_KEYS.map((k) => (
            <Chip key={k} label={valueTheme[k].label} active={filter === k} color={valueTheme[k].color} onPress={() => setFilter(k)} />
          ))}
        </ScrollView>
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
      style={[styles.chip, { backgroundColor: active ? color : '#fff', borderColor: color }]}
    >
      <Text style={[styles.chipTxt, { color: active ? '#fff' : color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: spacing.md },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center', textShadowColor: '#fff', textShadowRadius: 6 },
  filters: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1.5 },
  chipTxt: { fontWeight: '700', fontSize: 13 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
});
