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
    const valid = !!edit.id && !!edit.name && edit.lat != null && edit.lng != null;
    return (
      <View style={styles.c}>
        <AdminHeader
          title={edit.id ? 'עריכת תחנה' : 'תחנה חדשה'}
          subtitle={edit.name || 'מלא/י את פרטי התחנה'}
          icon="map-marker-edit"
          showBackToApp={false}
          right={
            <TouchableOpacity onPress={() => setEdit(null)} hitSlop={8} style={styles.headerClose}>
              <MaterialCommunityIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          }
        />
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Value picker first — sets the card's identity/color */}
          <SectionTitle icon="palette" text="ערך השביל" />
          <View style={styles.valuePicker}>
            {(Object.keys(valueTheme) as (keyof typeof valueTheme)[]).map((k) => {
              const on = edit.value === k;
              return (
                <TouchableOpacity key={k} onPress={() => setEdit({ ...edit, value: k as Station['value'] })}
                  style={[styles.valChip, { borderColor: valueTheme[k].color, backgroundColor: on ? valueTheme[k].color : '#fff' }]}>
                  <MaterialCommunityIcons name={valueTheme[k].icon as never} size={13} color={on ? '#fff' : valueTheme[k].color} />
                  <Text style={{ color: on ? '#fff' : valueTheme[k].color, fontWeight: '800', fontSize: 12 }}>{valueTheme[k].label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <SectionTitle icon="card-text" text="זהות" />
          <View style={styles.card}>
            <Field label="שם התחנה" value={edit.name ?? ''} onChange={(v) => setEdit({ ...edit, name: v })} />
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}><Field label="מספר" value={String(edit.number ?? '')} onChange={(v) => setEdit({ ...edit, number: Number(v) || 0 })} keyboard="numeric" /></View>
              <View style={{ flex: 2 }}><Field label="מזהה (id)" value={edit.id ?? ''} onChange={(v) => setEdit({ ...edit, id: v })} /></View>
            </View>
            <View style={styles.regionRow}>
              {(['east', 'west'] as const).map((r) => (
                <TouchableOpacity key={r} onPress={() => setEdit({ ...edit, region: r })}
                  style={[styles.regionChip, edit.region === r && styles.regionChipOn]}>
                  <Text style={[styles.regionTxt, edit.region === r && styles.regionTxtOn]}>{r === 'east' ? 'איזור מזרחי' : 'איזור מערבי'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <SectionTitle icon="map-marker" text="מיקום" />
          <View style={styles.card}>
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}><Field label="קו רוחב" value={String(edit.lat ?? '')} onChange={(v) => setEdit({ ...edit, lat: Number(v) })} keyboard="numeric" /></View>
              <View style={{ flex: 1 }}><Field label="קו אורך" value={String(edit.lng ?? '')} onChange={(v) => setEdit({ ...edit, lng: Number(v) })} keyboard="numeric" /></View>
            </View>
          </View>

          <SectionTitle icon="text-box" text="תוכן" />
          <View style={styles.card}>
            <Field label="מה עושים בתכלס" value={edit.whatYouDo ?? ''} onChange={(v) => setEdit({ ...edit, whatYouDo: v })} multiline />
            <Field label="על המקום" value={edit.aboutPlace ?? ''} onChange={(v) => setEdit({ ...edit, aboutPlace: v })} multiline />
          </View>

          <SectionTitle icon="phone" text="איש קשר" />
          <View style={styles.card}>
            <Field label="שם" value={edit.contactName ?? ''} onChange={(v) => setEdit({ ...edit, contactName: v })} />
            <Field label="טלפון" value={edit.contactPhone ?? ''} onChange={(v) => setEdit({ ...edit, contactPhone: v })} keyboard="phone-pad" />
          </View>
        </ScrollView>

        {/* Sticky save bar */}
        <View style={styles.saveBar}>
          <TouchableOpacity style={styles.cancel} onPress={() => setEdit(null)}><Text style={styles.cancelTxt}>ביטול</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.save, !valid && styles.saveDisabled]} onPress={save} disabled={!valid}>
            <MaterialCommunityIcons name="content-save" size={18} color="#fff" />
            <Text style={styles.saveTxt}>שמור</Text>
          </TouchableOpacity>
        </View>
      </View>
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
      <TextInput style={[styles.input, multiline && { height: 70 }]} value={value} onChangeText={onChange} multiline={multiline} keyboardType={keyboard} textAlign="right" placeholderTextColor={colors.muted} />
    </View>
  );
}

function SectionTitle({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.sectionTitle}>
      <MaterialCommunityIcons name={icon} size={15} color={colors.forest} />
      <Text style={styles.sectionTitleTxt}>{text}</Text>
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
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, textAlign: 'right', writingDirection: 'rtl', marginBottom: 4 },
  input: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 12, borderWidth: 1, borderColor: colors.line, writingDirection: 'rtl' },
  // form sections
  headerClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitleTxt: { fontSize: 14, fontWeight: '800', color: colors.forest, writingDirection: 'rtl' },
  card: { backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.md, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, elevation: 1 },
  fieldRow: { flexDirection: 'row', gap: spacing.sm },
  regionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  regionChip: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center' },
  regionChipOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  regionTxt: { fontWeight: '700', color: colors.muted, fontSize: 13 },
  regionTxtOn: { color: '#fff' },
  valuePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, direction: 'rtl' },
  valChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1.5 },
  saveBar: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.lg, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line },
  save: { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: colors.forest, paddingVertical: 15, borderRadius: radius.pill },
  saveDisabled: { opacity: 0.5 },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancel: { flex: 1, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line },
  cancelTxt: { color: colors.muted, fontWeight: '700' },
});
