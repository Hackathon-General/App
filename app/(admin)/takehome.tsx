import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from '@react-native-firebase/firestore';
import { db } from '@/firebase';
import { useContent, type ValueKey } from '@/content/ContentProvider';
import { colors, spacing, radius, valueTheme } from '@/theme';
import { AdminHeader } from '@/components/AdminHeader';

interface Rule {
  id: string;
  title?: string;
  description?: string;
  link?: string;
  stationId?: string; // matched station (optional)
  value?: ValueKey;   // or matched value
}

/** Admin take-home actions (מסרי המשך לבית) — matched to a station or value; shown on trail completion. */
export default function AdminTakeHome() {
  const { stations } = useContent();
  const [rules, setRules] = useState<Rule[]>([]);
  const [edit, setEdit] = useState<Rule | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'takeHomeRules'), (snap: any) => {
      setRules(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as Rule));
    });
    return () => unsub();
  }, []);

  const save = async () => {
    if (!edit?.title?.trim()) { Alert.alert('חסר מידע', 'כותרת נדרשת.'); return; }
    const id = edit.id || `th-${Date.now()}`;
    try {
      await setDoc(doc(db, 'takeHomeRules', id), {
        title: edit.title.trim(), description: edit.description?.trim() ?? '', link: edit.link?.trim() ?? '',
        stationId: edit.stationId ?? null, value: edit.value ?? null, updatedAt: Date.now(),
      }, { merge: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setEdit(null);
    } catch (e: any) { Alert.alert('שגיאה', e?.message ?? ''); }
  };

  const remove = (id: string) =>
    Alert.alert('מחיקה', 'למחוק את המשימה?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: () => deleteDoc(doc(db, 'takeHomeRules', id)).catch(() => {}) },
    ]);

  if (edit) {
    const matchedStation = stations.find((s) => s.id === edit.stationId);
    return (
      <View style={styles.c}>
        <AdminHeader title={edit.id ? 'עריכת משימת המשך' : 'משימת המשך חדשה'} icon="home-heart" showBackToApp={false}
          right={<TouchableOpacity onPress={() => setEdit(null)} hitSlop={8} style={styles.close}><MaterialCommunityIcons name="close" size={20} color="#fff" /></TouchableOpacity>} />
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Field label="כותרת" value={edit.title ?? ''} onChange={(v) => setEdit({ ...edit, title: v })} />
          <Field label="תיאור" value={edit.description ?? ''} onChange={(v) => setEdit({ ...edit, description: v })} multiline />
          <Field label="קישור (למשל להתנדבות)" value={edit.link ?? ''} onChange={(v) => setEdit({ ...edit, link: v })} keyboard="url" />

          <Text style={styles.section}>התאמה לפי ערך (אופציונלי)</Text>
          <View style={styles.chips}>
            {(Object.keys(valueTheme) as ValueKey[]).map((k) => {
              const on = edit.value === k;
              return (
                <TouchableOpacity key={k} onPress={() => setEdit({ ...edit, value: on ? undefined : k })}
                  style={[styles.chip, { borderColor: valueTheme[k].color, backgroundColor: on ? valueTheme[k].color : '#fff' }]}>
                  <Text style={{ color: on ? '#fff' : valueTheme[k].color, fontWeight: '700', fontSize: 12 }}>{valueTheme[k].label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.section}>או התאמה לתחנה ספציפית</Text>
          <View style={styles.chips}>
            {stations.map((s) => {
              const on = edit.stationId === s.id;
              return (
                <TouchableOpacity key={s.id} onPress={() => setEdit({ ...edit, stationId: on ? undefined : s.id })}
                  style={[styles.chip, on && { backgroundColor: colors.forest, borderColor: colors.forest }]}>
                  <Text style={[{ color: on ? '#fff' : colors.ink, fontWeight: '600', fontSize: 12 }]}>{s.number}. {s.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {matchedStation && <Text style={styles.matchNote}>מותאם ל: {matchedStation.name}</Text>}
        </ScrollView>
        <View style={styles.saveBar}>
          <TouchableOpacity style={styles.save} onPress={save}><MaterialCommunityIcons name="content-save" size={18} color="#fff" /><Text style={styles.saveTxt}>שמור</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.c}>
      <AdminHeader title="משימות המשך לבית" subtitle={`${rules.length} משימות · מותאמות לפי תחנה/ערך`} icon="home-heart" />
      <TouchableOpacity style={styles.add} onPress={() => setEdit({ id: '' })}>
        <MaterialCommunityIcons name="plus" size={18} color="#fff" /><Text style={styles.addTxt}>הוסף משימת המשך</Text>
      </TouchableOpacity>
      <FlashList
        data={rules}
        keyExtractor={(r) => r.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.md }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.rowSub} numberOfLines={1}>
                {item.value ? valueTheme[item.value]?.label : item.stationId ? stations.find((s) => s.id === item.stationId)?.name : 'כללי'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setEdit(item)} hitSlop={8}><MaterialCommunityIcons name="pencil" size={19} color={colors.forest} /></TouchableOpacity>
            <TouchableOpacity onPress={() => remove(item.id)} hitSlop={8}><MaterialCommunityIcons name="trash-can-outline" size={19} color={colors.danger} /></TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>אין משימות המשך עדיין</Text>}
      />
    </View>
  );
}

function Field({ label, value, onChange, multiline, keyboard }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; keyboard?: any }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, multiline && { height: 70 }]} value={value} onChangeText={onChange} multiline={multiline} keyboardType={keyboard} textAlign="right" placeholderTextColor={colors.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.terracotta, margin: spacing.md, paddingVertical: 12, borderRadius: radius.pill },
  addTxt: { color: '#fff', fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  rowTitle: { fontWeight: '800', color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  rowSub: { fontSize: 12, color: colors.muted, textAlign: 'right', writingDirection: 'rtl', marginTop: 1 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, writingDirection: 'rtl' },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, textAlign: 'right', writingDirection: 'rtl', marginBottom: 4 },
  input: { backgroundColor: '#fff', borderRadius: radius.sm, padding: 12, borderWidth: 1, borderColor: colors.line, writingDirection: 'rtl' },
  section: { fontSize: 13, fontWeight: '800', color: colors.forest, marginTop: spacing.md, marginBottom: 6, textAlign: 'right', writingDirection: 'rtl' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, direction: 'rtl' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line },
  matchNote: { color: colors.forest, fontWeight: '700', marginTop: spacing.sm, textAlign: 'right', writingDirection: 'rtl' },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  saveBar: { padding: spacing.md, paddingBottom: spacing.lg, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line },
  save: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: colors.forest, paddingVertical: 15, borderRadius: radius.pill },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
