import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
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

  return (
    <LinearGradient colors={[colors.gold, colors.terracotta]} style={styles.container}>
      <View style={styles.flameCircle}>
        <MaterialCommunityIcons name="torch" size={48} color="#fff" />
      </View>
      <Text style={styles.title}>מירוץ הלפיד הווירטואלי</Text>

      <View style={styles.bank}>
        <Text style={styles.bankNum}>{communityKm.toFixed(1)}</Text>
        <Text style={styles.bankLabel}>{copy.ui.torch.communityBank} (ק"מ)</Text>
      </View>

      {iHoldIt ? (
        <>
          <Text style={styles.counter}>{copy.ui.torch.counter.replace('{km}', carriedKm.toFixed(2))}</Text>
          <Action label={copy.ui.torch.drop} onPress={onDrop} busy={busy} />
        </>
      ) : torch?.status === 'held' ? (
        <Text style={styles.status}>{copy.ui.torch.heldByOther}{torch.holderName ? ` (${torch.holderName})` : ''}</Text>
      ) : inRange ? (
        <Action label={copy.ui.torch.take} onPress={onTake} busy={busy} />
      ) : (
        <Text style={styles.status}>{copy.ui.torch.waiting} — התקרב/י ללפיד כדי לקחת אותו</Text>
      )}
    </LinearGradient>
  );
}

function Action({ label, onPress, busy }: { label: string; onPress: () => void; busy: boolean }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} disabled={busy}>
      {busy ? <ActivityIndicator color={colors.terracotta} /> : <Text style={styles.actionTxt}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  flameCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: spacing.sm },
  bank: { alignItems: 'center', marginVertical: spacing.xl },
  bankNum: { fontSize: 56, fontWeight: '900', color: '#fff' },
  bankLabel: { fontSize: 15, color: '#fff', opacity: 0.9 },
  counter: { fontSize: 18, color: '#fff', fontWeight: '700', textAlign: 'center', marginBottom: spacing.lg },
  status: { fontSize: 16, color: '#fff', textAlign: 'center', marginTop: spacing.md },
  action: { backgroundColor: '#fff', paddingVertical: 18, paddingHorizontal: 48, borderRadius: radius.pill, marginTop: spacing.md },
  actionTxt: { color: colors.terracotta, fontWeight: '800', fontSize: 18 },
});
