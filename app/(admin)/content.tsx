import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { httpsCallable } from '@react-native-firebase/functions';
import { functions } from '@/firebase';
import { useContent, type Station } from '@/content/ContentProvider';
import { colors, spacing, radius, valueTheme } from '@/theme';
import { AdminHeader } from '@/components/AdminHeader';

const upsertStationFn = httpsCallable(functions, 'upsertStation');
const deleteStationFn = httpsCallable(functions, 'deleteStation');
const seedContentFn = httpsCallable(functions, 'seedContent');

/** Admin content management — edit stations live; changes reflect in the app via Firestore. */
export default function AdminContent() {
  const insets = useSafeAreaInsets();
  const { stations } = useContent();
  const [edit, setEdit] = useState<Partial<Station> | null>(null);

  const save = async () => {
    if (!edit?.id || !edit?.name || edit.lat == null || edit.lng == null) {
      Alert.alert('חסר מידע', 'מזהה, שם, ומיקום (lat/lng) נדרשים.');
      return;
    }
    try {
      await upsertStationFn({ station: edit });
      Alert.alert('נשמר', 'התחנה עודכנה ותופיע באפליקציה.');
      setEdit(null);
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? '');
    }
  };

  const remove = (id: string) => {
    Alert.alert('מחיקת תחנה', `למחוק את ${id}?`, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: async () => {
        try { await deleteStationFn({ id }); } catch (e: any) { Alert.alert('שגיאה', e?.message ?? ''); }
      } },
    ]);
  };

  if (edit) {
    return (
      <ScrollView style={[styles.c, { paddingTop: insets.top + spacing.md }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.h}>{edit.id ? 'עריכת תחנה' : 'תחנה חדשה'}</Text>
        <Field label="מזהה (id)" value={edit.id ?? ''} onChange={(v) => setEdit({ ...edit, id: v })} />
        <Field label="שם" value={edit.name ?? ''} onChange={(v) => setEdit({ ...edit, name: v })} />
        <Field label="מספר" value={String(edit.number ?? '')} onChange={(v) => setEdit({ ...edit, number: Number(v) || 0 })} keyboard="numeric" />
        <Field label="קו רוחב (lat)" value={String(edit.lat ?? '')} onChange={(v) => setEdit({ ...edit, lat: Number(v) })} keyboard="numeric" />
        <Field label="קו אורך (lng)" value={String(edit.lng ?? '')} onChange={(v) => setEdit({ ...edit, lng: Number(v) })} keyboard="numeric" />
        <Field label="מה עושים בתכלס" value={edit.whatYouDo ?? ''} onChange={(v) => setEdit({ ...edit, whatYouDo: v })} multiline />
        <Field label="על המקום" value={edit.aboutPlace ?? ''} onChange={(v) => setEdit({ ...edit, aboutPlace: v })} multiline />
        <Field label="איש קשר" value={edit.contactName ?? ''} onChange={(v) => setEdit({ ...edit, contactName: v })} />
        <Field label="טלפון" value={edit.contactPhone ?? ''} onChange={(v) => setEdit({ ...edit, contactPhone: v })} keyboard="phone-pad" />

        <View style={styles.valuePicker}>
          {(Object.keys(valueTheme) as (keyof typeof valueTheme)[]).map((k) => (
            <TouchableOpacity key={k} onPress={() => setEdit({ ...edit, value: k as Station['value'] })}
              style={[styles.valChip, { borderColor: valueTheme[k].color, backgroundColor: edit.value === k ? valueTheme[k].color : '#fff' }]}>
              <Text style={{ color: edit.value === k ? '#fff' : valueTheme[k].color, fontWeight: '700', fontSize: 12 }}>{valueTheme[k].label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.save} onPress={save}><Text style={styles.saveTxt}>שמור</Text></TouchableOpacity>
        <TouchableOpacity style={styles.cancel} onPress={() => setEdit(null)}><Text style={styles.cancelTxt}>ביטול</Text></TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  return (
    <View style={styles.c}>
      <AdminHeader title="ניהול תוכן" subtitle={`${stations.length} תחנות · נשמר ב-Firestore`} icon="file-document-edit" />
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.addBtn} onPress={() => setEdit({ value: 'volunteering', region: 'east' })}>
          <MaterialCommunityIcons name="plus" size={18} color="#fff" />
          <Text style={styles.addTxt}>הוסף תחנה</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.seedBtn} onPress={async () => {
          try { const r: any = await seedContentFn({}); Alert.alert('נטען', `${r?.data?.stations ?? ''} תחנות נטענו ל-Firestore.`); }
          catch (e: any) { Alert.alert('שגיאה', e?.message ?? ''); }
        }}>
          <MaterialCommunityIcons name="database-refresh" size={18} color={colors.forest} />
          <Text style={styles.seedTxt}>רענן</Text>
        </TouchableOpacity>
      </View>
      <FlashList
        data={stations}
        keyExtractor={(s) => s.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.md }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.iconBadge, { backgroundColor: valueTheme[item.value]?.color ?? colors.muted }]}>
              <MaterialCommunityIcons name={(valueTheme[item.value]?.icon ?? 'map-marker') as never} size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName} numberOfLines={1}>{item.number}. {item.name}</Text>
              <Text style={styles.rowSub} numberOfLines={1}>{valueTheme[item.value]?.label} · {item.region === 'east' ? 'מזרחי' : 'מערבי'}</Text>
            </View>
            <TouchableOpacity onPress={() => setEdit(item)} hitSlop={8} style={styles.rowAction}><MaterialCommunityIcons name="pencil" size={19} color={colors.forest} /></TouchableOpacity>
            <TouchableOpacity onPress={() => remove(item.id)} hitSlop={8} style={styles.rowAction}><MaterialCommunityIcons name="trash-can-outline" size={19} color={colors.danger} /></TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

function Field({ label, value, onChange, multiline, keyboard }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; keyboard?: any }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, multiline && { height: 70 }]} value={value} onChangeText={onChange} multiline={multiline} keyboardType={keyboard} textAlign="right" />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  h: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center', marginBottom: spacing.sm, writingDirection: 'rtl' },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  seedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.forest, paddingVertical: 12, paddingHorizontal: 18, borderRadius: radius.pill },
  seedTxt: { color: colors.forest, fontWeight: '800' },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.terracotta, paddingVertical: 12, borderRadius: radius.pill },
  addTxt: { color: '#fff', fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  iconBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowName: { textAlign: 'right', fontWeight: '700', color: colors.ink, writingDirection: 'rtl' },
  rowSub: { textAlign: 'right', fontSize: 12, color: colors.muted, writingDirection: 'rtl', marginTop: 1 },
  rowAction: { padding: 4 },
  label: { fontSize: 13, fontWeight: '700', color: colors.terracotta, textAlign: 'right', writingDirection: 'rtl', marginBottom: 4, marginHorizontal: spacing.md },
  input: { backgroundColor: '#fff', borderRadius: radius.sm, padding: 12, borderWidth: 1, borderColor: colors.line, marginHorizontal: spacing.md, writingDirection: 'rtl' },
  valuePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginHorizontal: spacing.md, marginTop: spacing.sm, direction: 'rtl' },
  valChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1.5 },
  save: { backgroundColor: colors.forest, marginHorizontal: spacing.md, marginTop: spacing.lg, paddingVertical: 14, borderRadius: radius.pill, alignItems: 'center' },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancel: { marginHorizontal: spacing.md, marginTop: spacing.sm, paddingVertical: 12, alignItems: 'center' },
  cancelTxt: { color: colors.muted, fontWeight: '700' },
});
