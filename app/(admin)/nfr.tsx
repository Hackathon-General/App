import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { collection, addDoc } from '@react-native-firebase/firestore';
import { db } from '@/firebase';
import { useContent } from '@/content/ContentProvider';
import { colors, spacing, radius } from '@/theme';
import { AdminHeader } from '@/components/AdminHeader';
import { MAP_PROVIDER, StationMarkers } from '@/map/markers';

const INITIAL = { latitude: 32.72, longitude: 35.27, latitudeDelta: 0.55, longitudeDelta: 0.55 };
const RADII = [100, 150, 300, 500];

/** Admin places an NFR mission on the map (write goes to Firestore; rules require admin claim). */
export default function NfrScreen() {
  const { stations } = useContent();
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [title, setTitle] = useState('');
  const [task, setTask] = useState('');
  const [radiusM, setRadiusM] = useState(150);

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
      <AdminHeader title="הצבת משימה" subtitle="הקש/י על המפה לקביעת מיקום המשימה" icon="map-marker-plus" />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.mapCard}>
          <MapView style={StyleSheet.absoluteFill} provider={MAP_PROVIDER} initialRegion={INITIAL}
            onPress={(e) => { Haptics.selectionAsync().catch(() => {}); setPoint({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude }); }}>
            <StationMarkers stations={stations} />
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
