import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import MapView, { Marker, Circle, type Region } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
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
const KINDS = [
  { key: 'info', label: 'מידע', icon: 'information', color: colors.sky },
  { key: 'view', label: 'תצפית נוף', icon: 'binoculars', color: colors.forest },
  { key: 'hazard', label: 'מפגע', icon: 'alert', color: colors.danger },
] as const;

export default function AlertsScreen() {
  const pins = useLive();
  const mapRef = useRef<MapView>(null);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [radiusM, setRadiusM] = useState(300);
  const [kind, setKind] = useState<(typeof KINDS)[number]['key']>('info');

  // How many live people are inside the chosen radius (preview of who'll get it).
  const reach = point ? pins.filter((p) => distanceMeters(point, { lat: p.lat, lng: p.lng }) <= radiusM).length : 0;

  // In-field flow: drop the alert at the admin's own current location.
  const useMyLocation = async () => {
    Haptics.selectionAsync().catch(() => {});
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) { Alert.alert('אין גישה למיקום', 'אפשרו גישה למיקום כדי לסמן את מיקומכם.'); return; }
    const loc = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({}));
    if (!loc) return;
    const p = { lat: loc.coords.latitude, lng: loc.coords.longitude };
    setPoint(p);
    mapRef.current?.animateToRegion({ latitude: p.lat, longitude: p.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500);
  };

  const fire = async () => {
    if (!point || !message.trim()) {
      Alert.alert('חסר מידע', 'בחר/י נקודה והזן/י הודעה.');
      return;
    }
    try {
      await addDoc(collection(db, 'alerts'), {
        lat: point.lat, lng: point.lng, radius: radiusM, kind,
        title: title.trim() || KINDS.find((k) => k.key === kind)!.label, message: message.trim(), createdAt: Date.now(),
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
          <MapView ref={mapRef} style={StyleSheet.absoluteFill} provider={MAP_PROVIDER} initialRegion={INITIAL}
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

        <TouchableOpacity style={styles.myLoc} onPress={useMyLocation}>
          <MaterialCommunityIcons name="crosshairs-gps" size={17} color={colors.danger} />
          <Text style={styles.myLocTxt}>סמן את מיקומי הנוכחי</Text>
        </TouchableOpacity>

        <Label icon="shape" text="סוג ההתראה" />
        <View style={styles.kindRow}>
          {KINDS.map((k) => (
            <TouchableOpacity key={k.key} onPress={() => { Haptics.selectionAsync().catch(() => {}); setKind(k.key); }}
              style={[styles.kindChip, kind === k.key && { backgroundColor: k.color, borderColor: k.color }]}>
              <MaterialCommunityIcons name={k.icon as any} size={16} color={kind === k.key ? '#fff' : k.color} />
              <Text style={[styles.kindTxt, { color: kind === k.key ? '#fff' : k.color }]}>{k.label}</Text>
            </TouchableOpacity>
          ))}
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
  myLoc: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.danger, borderRadius: radius.pill, paddingVertical: 11, marginTop: spacing.md },
  myLocTxt: { color: colors.danger, fontWeight: '800', fontSize: 14 },
  kindRow: { flexDirection: 'row', gap: spacing.sm },
  kindChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: radius.md, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line },
  kindTxt: { fontWeight: '800', fontSize: 13 },
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
