import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, addDoc } from '@react-native-firebase/firestore';
import { db } from '@/firebase';
import { colors, spacing, radius } from '@/theme';

const INITIAL: Region = { latitude: 32.72, longitude: 35.27, latitudeDelta: 0.55, longitudeDelta: 0.55 };

/** Admin places an NFR mission on the map (write goes to Firestore; rules require admin claim). */
export default function NfrScreen() {
  const insets = useSafeAreaInsets();
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [title, setTitle] = useState('');
  const [task, setTask] = useState('');
  const [radiusM, setRadiusM] = useState('150');

  const save = async () => {
    if (!point || !title) {
      Alert.alert('חסר מידע', 'בחר/י נקודה על המפה והזן/י כותרת.');
      return;
    }
    try {
      await addDoc(collection(db, 'nfrs'), {
        lat: point.lat, lng: point.lng, radius: Number(radiusM) || 150,
        title, task, active: true, createdAt: Date.now(),
      });
      Alert.alert('נשמר', 'המשימה פורסמה לשטח.');
      setTitle(''); setTask(''); setPoint(null);
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? '');
    }
  };

  return (
    <ScrollView style={[styles.c, { paddingTop: insets.top }]} keyboardShouldPersistTaps="handled">
      <Text style={styles.h}>הצב משימה (NFR)</Text>
      <View style={styles.mapWrap}>
        <MapView style={StyleSheet.absoluteFill} provider={PROVIDER_GOOGLE} initialRegion={INITIAL}
          onPress={(e) => setPoint({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}>
          {point && <Marker coordinate={{ latitude: point.lat, longitude: point.lng }} pinColor={colors.terracotta} />}
        </MapView>
      </View>
      <Text style={styles.hint}>הקש/י על המפה כדי לקבע מיקום</Text>
      <TextInput style={styles.in} placeholder="כותרת המשימה" value={title} onChangeText={setTitle} textAlign="right" />
      <TextInput style={[styles.in, { height: 80 }]} placeholder="תיאור המשימה" value={task} onChangeText={setTask} multiline textAlign="right" />
      <TextInput style={styles.in} placeholder="רדיוס (מטרים)" value={radiusM} onChangeText={setRadiusM} keyboardType="numeric" textAlign="right" />
      <TouchableOpacity style={styles.btn} onPress={save}><Text style={styles.btnTxt}>פרסם משימה</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  h: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center', marginBottom: spacing.sm },
  mapWrap: { height: 260, borderRadius: radius.md, overflow: 'hidden' },
  hint: { color: colors.muted, textAlign: 'center', marginVertical: spacing.sm },
  in: { backgroundColor: '#fff', borderRadius: radius.sm, padding: 12, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.line },
  btn: { backgroundColor: colors.terracotta, paddingVertical: 16, borderRadius: radius.pill, alignItems: 'center', marginTop: spacing.sm },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
