import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { collection, addDoc, doc, updateDoc } from '@react-native-firebase/firestore';
import { db } from '@/firebase';
import { useContent } from '@/content/ContentProvider';
import { useNfrs } from '@/features/missions/useNfrs';
import { PulseCircle } from '@/components/PulseCircle';
import { colors, spacing, radius } from '@/theme';
import { AdminHeader } from '@/components/AdminHeader';
import { MAP_PROVIDER, StationMarkers } from '@/map/markers';

const INITIAL = { latitude: 32.72, longitude: 35.27, latitudeDelta: 0.55, longitudeDelta: 0.55 };
const RADII = [100, 150, 300, 500];

/** Admin places an NFR mission on the map (write goes to Firestore; rules require admin claim). */
export default function NfrScreen() {
  const { stations } = useContent();
  const nfrs = useNfrs();
  const mapRef = useRef<MapView>(null);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [title, setTitle] = useState('');
  const [task, setTask] = useState('');
  const [radiusM, setRadiusM] = useState(150);

  // Auto-fit the map to all live missions (a 150m circle is invisible at trail-wide zoom).
  useEffect(() => {
    if (nfrs.length === 0) return;
    const coords = nfrs.map((n) => ({ latitude: n.lat, longitude: n.lng }));
    if (point) coords.push({ latitude: point.lat, longitude: point.lng });
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 70, right: 70, bottom: 70, left: 70 }, animated: true,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [nfrs.length, point]);

  const closeNfr = async (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    try { await updateDoc(doc(db, 'nfrs', id), { active: false }); } catch (e: any) { Alert.alert('שגיאה', e?.message ?? ''); }
  };

  const save = async () => {
    if (!point || !title.trim()) {
      Alert.alert('חסר מידע', 'בחר/י נקודה על המפה והזן/י כותרת.');
      return;
    }
    try {
      await addDoc(collection(db, 'nfrs'), {
        lat: point.lat, lng: point.lng, radius: radiusM, title: title.trim(), task: task.trim(), active: true, createdAt: Date.now(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('פורסם', 'המשימה פורסמה לשטח.');
      setTitle(''); setTask(''); setPoint(null);
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? '');
    }
  };

  return (
    <View style={styles.c}>
      <AdminHeader title="הצבת משימה" subtitle={`${nfrs.length} משימות פעילות בשטח · הקש/י על המפה`} icon="map-marker-plus" />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.mapCard}>
          <MapView ref={mapRef} style={StyleSheet.absoluteFill} provider={MAP_PROVIDER} initialRegion={INITIAL}
            onPress={(e) => { Haptics.selectionAsync().catch(() => {}); setPoint({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude }); }}>
            <StationMarkers stations={stations} />

            {/* Existing live missions — static radius + animated pulse ring + numbered pin */}
            {nfrs.map((n, i) => (
              <React.Fragment key={n.id}>
                <Circle center={{ latitude: n.lat, longitude: n.lng }} radius={n.radius ?? 150} strokeColor={colors.forest} fillColor="rgba(46,125,50,0.12)" strokeWidth={2} />
                <PulseCircle lat={n.lat} lng={n.lng} radius={n.radius ?? 150} color={colors.forest} />
                <Marker coordinate={{ latitude: n.lat, longitude: n.lng }} title={n.title} description={n.task} anchor={{ x: 0.5, y: 0.5 }}>
                  <View style={styles.nfrPin}><Text style={styles.nfrNum}>{i + 1}</Text></View>
                </Marker>
              </React.Fragment>
            ))}

            {point && (
              <>
                <Marker coordinate={{ latitude: point.lat, longitude: point.lng }} pinColor={colors.terracotta} />
                <Circle center={{ latitude: point.lat, longitude: point.lng }} radius={radiusM} strokeColor={colors.terracotta} fillColor="rgba(214,140,69,0.15)" />
              </>
            )}
          </MapView>
          {!point && (
            <View style={styles.mapHint} pointerEvents="none">
              <MaterialCommunityIcons name="gesture-tap" size={18} color="#fff" />
              <Text style={styles.mapHintTxt}>הקש/י על המפה</Text>
            </View>
          )}
        </View>

        <Label icon="format-title" text="כותרת המשימה" />
        <TextInput style={styles.in} placeholder="לדוגמה: צלמו את הנוף" placeholderTextColor={colors.muted} value={title} onChangeText={setTitle} textAlign="right" />

        <Label icon="text" text="תיאור המשימה" />
        <TextInput style={[styles.in, { height: 84 }]} placeholder="מה על המטייל/ת לעשות?" placeholderTextColor={colors.muted} value={task} onChangeText={setTask} multiline textAlign="right" />

        <Label icon="radius" text="רדיוס הפעלה" />
        <View style={styles.radiusRow}>
          {RADII.map((r) => (
            <TouchableOpacity key={r} onPress={() => setRadiusM(r)} style={[styles.radChip, radiusM === r && styles.radChipOn]}>
              <Text style={[styles.radTxt, radiusM === r && styles.radTxtOn]}>{r}מ׳</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.btn, (!point || !title.trim()) && styles.btnDisabled]} onPress={save} disabled={!point || !title.trim()}>
          <MaterialCommunityIcons name="send" size={18} color="#fff" />
          <Text style={styles.btnTxt}>פרסם משימה לשטח</Text>
        </TouchableOpacity>

        {/* Live missions list */}
        <View style={styles.listHead}>
          <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.forest} />
          <Text style={styles.listHeadTxt}>משימות פעילות ({nfrs.length})</Text>
        </View>
        {nfrs.length === 0 && <Text style={styles.listEmpty}>אין משימות פעילות. הקש/י על המפה כדי להוסיף.</Text>}
        {nfrs.map((n, i) => (
          <View key={n.id} style={styles.missionRow}>
            <View style={styles.missionNum}><Text style={styles.missionNumTxt}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.missionTitle} numberOfLines={1}>{n.title || 'משימה'}</Text>
              {!!n.task && <Text style={styles.missionTask} numberOfLines={1}>{n.task}</Text>}
              <Text style={styles.missionMeta}>רדיוס {n.radius ?? 150} מ׳ · {n.lat.toFixed(4)}, {n.lng.toFixed(4)}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => closeNfr(n.id)} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={22} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Label({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.label}>
      <MaterialCommunityIcons name={icon} size={15} color={colors.terracotta} />
      <Text style={styles.labelTxt}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  mapCard: { height: 240, borderRadius: radius.lg, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  mapHint: { position: 'absolute', top: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill },
  nfrPin: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.forest, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  nfrNum: { color: '#fff', fontWeight: '900', fontSize: 14 },
  listHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: spacing.lg, marginBottom: spacing.sm },
  listHeadTxt: { fontWeight: '900', color: colors.forest, fontSize: 15, writingDirection: 'rtl' },
  listEmpty: { color: colors.muted, textAlign: 'right', writingDirection: 'rtl' },
  missionRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  missionNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  missionNumTxt: { color: '#fff', fontWeight: '900' },
  missionTitle: { fontWeight: '800', color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  missionTask: { fontSize: 12, color: colors.muted, textAlign: 'right', writingDirection: 'rtl', marginTop: 1 },
  missionMeta: { fontSize: 11, color: colors.muted, textAlign: 'right', writingDirection: 'rtl', marginTop: 2 },
  closeBtn: { padding: 2 },
  mapHintTxt: { color: '#fff', fontWeight: '700' },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, marginBottom: 6 },
  labelTxt: { fontSize: 13, fontWeight: '800', color: colors.terracotta, writingDirection: 'rtl' },
  in: { backgroundColor: '#fff', borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.line, writingDirection: 'rtl' },
  radiusRow: { flexDirection: 'row', gap: spacing.sm },
  radChip: { flex: 1, paddingVertical: 10, borderRadius: radius.md, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line, alignItems: 'center' },
  radChipOn: { backgroundColor: colors.terracotta, borderColor: colors.terracotta },
  radTxt: { fontWeight: '800', color: colors.muted },
  radTxtOn: { color: '#fff' },
  btn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: colors.terracotta, paddingVertical: 16, borderRadius: radius.pill, marginTop: spacing.lg },
  btnDisabled: { opacity: 0.5 },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
