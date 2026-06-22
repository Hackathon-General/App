import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Platform } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Region } from 'react-native-maps';

const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, addDoc } from '@react-native-firebase/firestore';
import { db } from '@/firebase';
import { colors, spacing, radius } from '@/theme';

const INITIAL: Region = { latitude: 32.72, longitude: 35.27, latitudeDelta: 0.55, longitudeDelta: 0.55 };

/** Admin fires a GPS/audio alert to a radius. The onAlertCreated function fans out FCM push. */
export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [radiusM, setRadiusM] = useState('300');

  const fire = async () => {
    if (!point || !message) {
      Alert.alert('חסר מידע', 'בחר/י נקודה והזן/י הודעה.');
      return;
    }
    try {
      await addDoc(collection(db, 'alerts'), {
        lat: point.lat, lng: point.lng, radius: Number(radiusM) || 300,
        title: title || 'התראה מההנהלה', message, createdAt: Date.now(),
      });
      Alert.alert('נשלח', 'ההתראה נשלחה למטיילים ברדיוס.');
      setMessage(''); setTitle(''); setPoint(null);
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? '');
    }
  };

  return (
    <ScrollView style={[styles.c, { paddingTop: insets.top }]} keyboardShouldPersistTaps="handled">
      <Text style={styles.h}>שגר התראת GPS</Text>
      <View style={styles.mapWrap}>
        <MapView style={StyleSheet.absoluteFill} provider={PROVIDER_GOOGLE} initialRegion={INITIAL}
          onPress={(e) => setPoint({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}>
          {point && (
            <>
              <Marker coordinate={{ latitude: point.lat, longitude: point.lng }} pinColor={colors.danger} />
              <Circle center={{ latitude: point.lat, longitude: point.lng }} radius={Number(radiusM) || 300}
                strokeColor={colors.danger} fillColor="rgba(223,49,49,0.15)" />
            </>
          )}
        </MapView>
      </View>
      <Text style={styles.hint}>הקש/י על המפה לקביעת מרכז הרדיוס</Text>
      <TextInput style={styles.in} placeholder="כותרת (אופציונלי)" value={title} onChangeText={setTitle} textAlign="right" />
      <TextInput style={[styles.in, { height: 80 }]} placeholder="הודעת ההתראה" value={message} onChangeText={setMessage} multiline textAlign="right" />
      <TextInput style={styles.in} placeholder="רדיוס (מטרים)" value={radiusM} onChangeText={setRadiusM} keyboardType="numeric" textAlign="right" />
      <TouchableOpacity style={styles.btn} onPress={fire}><Text style={styles.btnTxt}>שגר התראה</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  h: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center', marginBottom: spacing.sm },
  mapWrap: { height: 260, borderRadius: radius.md, overflow: 'hidden' },
  hint: { color: colors.muted, textAlign: 'center', marginVertical: spacing.sm },
  in: { backgroundColor: '#fff', borderRadius: radius.sm, padding: 12, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.line },
  btn: { backgroundColor: colors.danger, paddingVertical: 16, borderRadius: radius.pill, alignItems: 'center', marginTop: spacing.sm },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
