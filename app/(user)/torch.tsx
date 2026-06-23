import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { ref, onValue } from '@react-native-firebase/database';
import { rtdb } from '@/firebase';
import { useTorch } from '@/features/torch/useTorch';
import { canPickUp, distanceMeters } from '@/features/torch/distance';
import { useAuth } from '@/auth/AuthProvider';
import { colors, spacing, radius } from '@/theme';
import { content as copy } from '@/content';
import { MAP_PROVIDER } from '@/map/markers';
import { PulseCircle } from '@/components/PulseCircle';

export default function TorchScreen() {
  const { torch, takeTorch, dropTorch } = useTorch();
  const { user } = useAuth();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [communityKm, setCommunityKm] = useState(0);
  const [carriedKm, setCarriedKm] = useState(0);
  const [busy, setBusy] = useState(false);
  const startRef = useRef<{ lat: number; lng: number } | null>(null);

  // Watch my position (throttled).
  useEffect(() => {
    let sub: Location.LocationSubscription | undefined;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 10000 },
        (l) => {
          const p = { lat: l.coords.latitude, lng: l.coords.longitude };
          setPos(p);
          if (startRef.current) {
            setCarriedKm((k) => k + distanceMeters(startRef.current!, p) / 1000);
            startRef.current = p;
          }
        }
      );
    })();
    return () => sub?.remove();
  }, []);

  // Community km bank.
  useEffect(() => {
    const unsub = onValue(ref(rtdb, 'community/totalKm'), (s) => setCommunityKm(Number(s.val()) || 0));
    return () => unsub();
  }, []);

  const iHoldIt = torch?.status === 'held' && torch.holderId === user?.uid;
  const inRange = pos ? canPickUp(torch, pos) : false;

  const onTake = async () => {
    if (!pos) return;
    setBusy(true);
    try {
      await takeTorch({ lat: pos.lat, lng: pos.lng, name: user?.displayName ?? 'מטייל/ת', photo: user?.photoURL ?? undefined });
      startRef.current = pos;
      setCarriedKm(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      Alert.alert('לא ניתן לקחת את הלפיד', e?.message ?? '');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = async () => {
    if (!pos) return;
    setBusy(true);
    try {
      await dropTorch({ lat: pos.lat, lng: pos.lng, segmentKm: carriedKm });
      startRef.current = null;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('כל הכבוד!', `הוספת ${carriedKm.toFixed(2)} ק"מ למאמץ הקהילתי`);
      setCarriedKm(0);
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? '');
    } finally {
      setBusy(false);
    }
  };

  // Distance from me to the torch (m), for the "how far" readout.
  const distToTorch = torch && pos ? distanceMeters(pos, { lat: torch.lat, lng: torch.lng }) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient colors={[colors.gold, colors.terracotta]} style={styles.hero}>
        <View style={styles.flameCircle}><MaterialCommunityIcons name="torch" size={44} color="#fff" /></View>
        <Text style={styles.title}>מירוץ הלפיד הווירטואלי</Text>
        <View style={styles.bank}>
          <Text style={styles.bankNum}>{communityKm.toFixed(1)}</Text>
          <Text style={styles.bankLabel}>{copy.ui.torch.communityBank} (ק"מ)</Text>
        </View>
      </LinearGradient>

      {/* Live torch location map */}
      <View style={styles.mapCard}>
        {torch ? (
          <MapView style={StyleSheet.absoluteFill} provider={MAP_PROVIDER} showsUserLocation
            region={{ latitude: torch.lat, longitude: torch.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}>
            <PulseCircle lat={torch.lat} lng={torch.lng} radius={120} color={colors.gold} />
            <Marker coordinate={{ latitude: torch.lat, longitude: torch.lng }} anchor={{ x: 0.5, y: 0.5 }} title="הלפיד">
              <View style={styles.torchPin}><MaterialCommunityIcons name="torch" size={22} color="#fff" /></View>
            </Marker>
          </MapView>
        ) : (
          <View style={styles.noTorch}>
            <MaterialCommunityIcons name="torch" size={36} color={colors.line} />
            <Text style={styles.noTorchTxt}>הלפיד עוד לא הוצב על המסלול</Text>
          </View>
        )}
        {distToTorch != null && (
          <View style={styles.distPill}>
            <MaterialCommunityIcons name="map-marker-distance" size={14} color="#fff" />
            <Text style={styles.distTxt}>{distToTorch < 1000 ? `${Math.round(distToTorch)} מ׳ ממך` : `${(distToTorch / 1000).toFixed(1)} ק"מ ממך`}</Text>
          </View>
        )}
      </View>

      {/* Action / status */}
      <View style={styles.actionWrap}>
        {iHoldIt ? (
          <>
            <Text style={styles.counter}>{copy.ui.torch.counter.replace('{km}', carriedKm.toFixed(2))}</Text>
            <Action label={copy.ui.torch.drop} onPress={onDrop} busy={busy} icon="flag-checkered" />
          </>
        ) : torch?.status === 'held' ? (
          <Text style={styles.status}>🔥 {copy.ui.torch.heldByOther}{torch.holderName ? ` (${torch.holderName})` : ''}</Text>
        ) : inRange ? (
          <Action label={copy.ui.torch.take} onPress={onTake} busy={busy} icon="torch" />
        ) : torch ? (
          <Text style={styles.status}>התקרב/י ללפיד כדי לקחת אותו</Text>
        ) : (
          <Text style={styles.status}>{copy.ui.torch.waiting}</Text>
        )}
      </View>
    </ScrollView>
  );
}

function Action({ label, onPress, busy, icon }: { label: string; onPress: () => void; busy: boolean; icon: any }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} disabled={busy} activeOpacity={0.85}>
      {busy ? <ActivityIndicator color="#fff" /> : <><MaterialCommunityIcons name={icon} size={20} color="#fff" /><Text style={styles.actionTxt}>{label}</Text></>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: spacing.xl + 12, paddingBottom: spacing.lg, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  flameCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 21, fontWeight: '800', color: '#fff', marginTop: spacing.sm, writingDirection: 'rtl' },
  bank: { alignItems: 'center', marginTop: spacing.md },
  bankNum: { fontSize: 52, fontWeight: '900', color: '#fff' },
  bankLabel: { fontSize: 14, color: '#fff', opacity: 0.9, writingDirection: 'rtl' },
  mapCard: { height: 240, margin: spacing.md, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  noTorch: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  noTorchTxt: { color: colors.muted, fontWeight: '600', writingDirection: 'rtl' },
  distPill: { position: 'absolute', top: 12, alignSelf: 'center', flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: colors.gold, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill },
  distTxt: { color: '#fff', fontWeight: '800', fontSize: 13, writingDirection: 'rtl' },
  torchPin: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 4, elevation: 6 },
  actionWrap: { alignItems: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.md },
  counter: { fontSize: 18, color: colors.ink, fontWeight: '800', textAlign: 'center', marginBottom: spacing.md, writingDirection: 'rtl' },
  status: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: spacing.sm, writingDirection: 'rtl' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.terracotta, paddingVertical: 16, paddingHorizontal: 44, borderRadius: radius.pill, marginTop: spacing.md },
  actionTxt: { color: '#fff', fontWeight: '800', fontSize: 18 },
});
