import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { collection, onSnapshot, doc, setDoc, query, orderBy } from '@react-native-firebase/firestore';
import { db } from '@/firebase';
import { colors, spacing, radius } from '@/theme';
import { AdminHeader } from '@/components/AdminHeader';

interface SosEvent {
  id: string;
  authorId: string;
  authorName?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  status?: 'open' | 'resolved';
  createdAt?: number;
}

/** חמ"ל SOS log — live list of distress calls; admins can navigate to the location & resolve. */
export default function AdminSos() {
  const [events, setEvents] = useState<SosEvent[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'sosEvents'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q,
      (snap: any) => setEvents(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as SosEvent)),
      (err: any) => console.warn('[sos] listener error', err?.message ?? err),
    );
    return () => unsub();
  }, []);

  const open = events.filter((e) => e.status !== 'resolved');
  const resolve = async (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await setDoc(doc(db, 'sosEvents', id), { status: 'resolved', resolvedAt: Date.now() }, { merge: true });
  };

  return (
    <View style={styles.c}>
      <AdminHeader title='חמ"ל מצוקה' subtitle={`${open.length} קריאות פתוחות`} icon="alarm-light" />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {events.length === 0 && (
          <View style={styles.empty}><MaterialCommunityIcons name="shield-check" size={48} color={colors.line} /><Text style={styles.emptyTxt}>אין קריאות מצוקה</Text></View>
        )}
        {events.map((e) => {
          const resolved = e.status === 'resolved';
          const when = e.createdAt ? new Date(e.createdAt).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
          return (
            <View key={e.id} style={[styles.card, resolved && { opacity: 0.6 }]}>
              <View style={styles.head}>
                <View style={[styles.dot, { backgroundColor: resolved ? colors.success : colors.danger }]} />
                <MaterialCommunityIcons name="alarm-light" size={18} color={colors.danger} />
                <Text style={styles.name}>{e.authorName ?? 'מטייל/ת'}</Text>
                <Text style={styles.when}>{when}</Text>
              </View>
              <Text style={styles.loc}>{e.lat != null ? `מיקום: ${e.lat.toFixed(5)}, ${e.lng!.toFixed(5)}` : 'מיקום לא ידוע'}</Text>
              <View style={styles.actions}>
                {!!e.phone && <Action icon="phone" label="חיוג" onPress={() => Linking.openURL(`tel:${e.phone}`)} />}
                {e.lat != null && <Action icon="navigation-variant" label="ניווט" onPress={() => Linking.openURL(`https://waze.com/ul?ll=${e.lat},${e.lng}&navigate=yes`)} />}
                <View style={{ flex: 1 }} />
                {!resolved && <Action icon="check-circle" label="טופל" color={colors.success} onPress={() => resolve(e.id)} />}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const Action = ({ icon, label, color, onPress }: { icon: string; label: string; color?: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.action} onPress={onPress}>
    <MaterialCommunityIcons name={icon as any} size={16} color={color ?? colors.forest} />
    <Text style={[styles.actionTxt, { color: color ?? colors.forest }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  card: { backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderRightWidth: 4, borderRightColor: colors.danger, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, elevation: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  name: { flex: 1, fontWeight: '800', color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  when: { fontSize: 11, color: colors.muted },
  loc: { fontSize: 13, color: colors.muted, textAlign: 'right', writingDirection: 'rtl' },
  actions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  actionTxt: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyTxt: { color: colors.muted },
});
