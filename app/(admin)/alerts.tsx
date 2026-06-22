import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { collection, addDoc } from '@react-native-firebase/firestore';
import { db } from '@/firebase';
import { useLive } from '@/features/live/useLive';
import { colors, spacing, radius } from '@/theme';
import { AdminHeader } from '@/components/AdminHeader';
import { MAP_PROVIDER, LivePinMarkers } from '@/map/markers';
import { distanceMeters } from '@/features/torch/distance';

const INITIAL = { latitude: 32.72, longitude: 35.27, latitudeDelta: 0.55, longitudeDelta: 0.55 };
const RADII = [200, 300, 500, 1000];

/** Admin fires a GPS/audio alert to a radius. The onAlertCreated function fans out FCM push. */
export default function AlertsScreen() {
  const pins = useLive();
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [radiusM, setRadiusM] = useState(300);

  // How many live people are inside the chosen radius (preview of who'll get it).
  const reach = point ? pins.filter((p) => distanceMeters(point, { lat: p.lat, lng: p.lng }) <= radiusM).length : 0;

  const fire = async () => {
    if (!point || !message.trim()) {
      Alert.alert('חסר מידע', 'בחר/י נקודה והזן/י הודעה.');
      return;
    }
    try {
      await addDoc(collection(db, 'alerts'), {
        lat: point.lat, lng: point.lng, radius: radiusM,
        title: title.trim() || 'התראה מההנהלה', message: message.trim(), createdAt: Date.now(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      Alert.alert('נשלח', 'ההתראה נשלחה למטיילים ברדיוס.');
      setMessage(''); setTitle(''); setPoint(null);
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? '');
    }
  };

  return (
    <View style={styles.c}>
      <AdminHeader title="שיגור התראה" subtitle="בחר/י מרכז ורדיוס — ההתראה נשלחת למטיילים בתחום" icon="bullhorn" />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.mapCard}>
          <MapView style={StyleSheet.absoluteFill} provider={MAP_PROVIDER} initialRegion={INITIAL}
            onPress={(e) => { Haptics.selectionAsync().catch(() => {}); setPoint({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude }); }}>
            <LivePinMarkers pins={pins} />
            {point && (
              <>
                <Marker coordinate={{ latitude: point.lat, longitude: point.lng }} pinColor={colors.danger} />
                <Circle center={{ latitude: point.lat, longitude: point.lng }} radius={radiusM} strokeColor={colors.danger} fillColor="rgba(223,49,49,0.15)" />
              </>
            )}
          </MapView>
          {point && (
            <View style={styles.reachPill}>
              <MaterialCommunityIcons name="account-multiple" size={15} color="#fff" />
              <Text style={styles.reachTxt}>{reach} מטיילים בתחום</Text>
            </View>
          )}
        </View>

        <Label icon="format-title" text="כותרת (אופציונלי)" />
        <TextInput style={styles.in} placeholder="התראה מההנהלה" placeholderTextColor={colors.muted} value={title} onChangeText={setTitle} textAlign="right" />

        <Label icon="message-text" text="הודעת ההתראה" />
        <TextInput style={[styles.in, { height: 84 }]} placeholder="מה תרצו לומר למטיילים?" placeholderTextColor={colors.muted} value={message} onChangeText={setMessage} multiline textAlign="right" />

        <Label icon="radius" text="רדיוס" />
        <View style={styles.radiusRow}>
          {RADII.map((r) => (
            <TouchableOpacity key={r} onPress={() => setRadiusM(r)} style={[styles.radChip, radiusM === r && styles.radChipOn]}>
              <Text style={[styles.radTxt, radiusM === r && styles.radTxtOn]}>{r >= 1000 ? `${r / 1000}ק״מ` : `${r}מ׳`}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.btn, (!point || !message.trim()) && styles.btnDisabled]} onPress={fire} disabled={!point || !message.trim()}>
          <MaterialCommunityIcons name="bullhorn" size={18} color="#fff" />
          <Text style={styles.btnTxt}>שגר התראה</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Label({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.label}>
      <MaterialCommunityIcons name={icon} size={15} color={colors.danger} />
      <Text style={styles.labelTxt}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  mapCard: { height: 240, borderRadius: radius.lg, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  reachPill: { position: 'absolute', top: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.danger, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill },
  reachTxt: { color: '#fff', fontWeight: '800' },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, marginBottom: 6 },
  labelTxt: { fontSize: 13, fontWeight: '800', color: colors.danger, writingDirection: 'rtl' },
  in: { backgroundColor: '#fff', borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.line, writingDirection: 'rtl' },
  radiusRow: { flexDirection: 'row', gap: spacing.sm },
  radChip: { flex: 1, paddingVertical: 10, borderRadius: radius.md, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line, alignItems: 'center' },
  radChipOn: { backgroundColor: colors.danger, borderColor: colors.danger },
  radTxt: { fontWeight: '800', color: colors.muted },
  radTxtOn: { color: '#fff' },
  btn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: colors.danger, paddingVertical: 16, borderRadius: radius.pill, marginTop: spacing.lg },
  btnDisabled: { opacity: 0.5 },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
