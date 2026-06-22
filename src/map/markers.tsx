import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, valueTheme } from '@/theme';
import type { Station } from '@/content/ContentProvider';
import type { LivePin } from '@/features/live/useLive';

/** iOS → Apple Maps (renders without a Google key); Android → Google Maps. Single source of truth. */
export const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

interface LatLng { lat: number; lng: number }

/** The trail route polyline (shared by user + admin maps). */
export function TrailPolyline({ waypoints, strokeWidth = 4 }: { waypoints: LatLng[]; strokeWidth?: number }) {
  return (
    <Polyline
      coordinates={waypoints.map((w) => ({ latitude: w.lat, longitude: w.lng }))}
      strokeColor={colors.terracotta}
      strokeWidth={strokeWidth}
    />
  );
}

/** Value-colored station markers with the value icon. */
export function StationMarkers({ stations, onPress }: { stations: Station[]; onPress?: (s: Station) => void }) {
  return (
    <>
      {stations.map((s) => (
        <Marker
          key={s.id}
          coordinate={{ latitude: s.lat, longitude: s.lng }}
          onPress={onPress ? () => onPress(s) : undefined}
          title={s.name}
          description={valueTheme[s.value]?.label}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={[styles.stationBadge, { backgroundColor: valueTheme[s.value]?.color ?? colors.muted }]}>
            <MaterialCommunityIcons name={(valueTheme[s.value]?.icon ?? 'map-marker') as never} size={16} color="#fff" />
          </View>
        </Marker>
      ))}
    </>
  );
}

/** The shared torch marker. */
export function TorchMarker({ lat, lng, title }: { lat: number; lng: number; title?: string }) {
  return (
    <Marker coordinate={{ latitude: lat, longitude: lng }} title={title ?? 'לפיד'} anchor={{ x: 0.5, y: 0.5 }}>
      <View style={styles.torchMarker}>
        <MaterialCommunityIcons name="torch" size={20} color="#fff" />
      </View>
    </Marker>
  );
}

/** Live people/sensors (Snapchat-style). Shared by user + admin maps. */
export function LivePinMarkers({ pins, excludeId, onPress }: { pins: LivePin[]; excludeId?: string; onPress?: (p: LivePin) => void }) {
  return (
    <>
      {pins
        .filter((p) => p.id !== excludeId)
        .map((p) => (
          <Marker
            key={`live-${p.id}`}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.name ?? 'מטייל/ת'}
            description={p.source === 'sensor' ? 'חיישן' : 'משתף/ת מיקום'}
            onPress={onPress ? () => onPress(p) : undefined}
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
    </>
  );
}

/** Community moments shared to the map — photo-thumbnail pins (phones opted-in). */
export function FeedPinMarkers({ pins, onPress }: { pins: { id: string; lat?: number; lng?: number; imageUrl?: string; authorName?: string; text?: string }[]; onPress?: (id: string) => void }) {
  return (
    <>
      {pins.filter((p) => p.lat != null && p.lng != null).map((p) => (
        <Marker
          key={`feed-${p.id}`}
          coordinate={{ latitude: p.lat!, longitude: p.lng! }}
          title={p.authorName ?? 'מטייל/ת'}
          description={p.text || 'רגע מהמסע'}
          onPress={onPress ? () => onPress(p.id) : undefined}
          anchor={{ x: 0.5, y: 1 }}
        >
          <View style={styles.feedMarker}>
            {p.imageUrl
              ? <Image source={{ uri: p.imageUrl }} style={styles.feedThumb} contentFit="cover" />
              : <MaterialCommunityIcons name="image" size={18} color="#fff" />}
            <View style={styles.feedTip} />
          </View>
        </Marker>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  stationBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  feedMarker: { alignItems: 'center' },
  feedThumb: { width: 42, height: 42, borderRadius: 9, borderWidth: 2, borderColor: colors.terracotta, backgroundColor: colors.line },
  feedTip: { width: 0, height: 0, marginTop: -1, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.terracotta },
  torchMarker: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, elevation: 5 },
  personMarker: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 },
  sensorMarker: { backgroundColor: colors.sky },
  personTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
