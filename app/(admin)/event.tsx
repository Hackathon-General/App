import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { httpsCallable } from '@react-native-firebase/functions';
import { functions } from '@/firebase';
import { useContent } from '@/content/ContentProvider';
import { colors, spacing, radius } from '@/theme';
import { AdminHeader } from '@/components/AdminHeader';

const updateContent = httpsCallable(functions, 'updateContent');

interface ScheduleRow { time: string; event: string; from?: string }

/** Admin event editor — fully edits content/event live (date, notice, finish, links, schedule). */
export default function AdminEvent() {
  const { events } = useContent();
  const [eventDate, setEventDate] = useState('');
  const [notice, setNotice] = useState('');
  const [finishName, setFinishName] = useState('');
  const [donate, setDonate] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Seed the form from live Firestore content.
  useEffect(() => {
    setEventDate(events.eventDate ?? '');
    setNotice(events.notice ?? '');
    setFinishName(events.finishArea?.name ?? '');
    setDonate(events.links?.donate ?? '');
    setWhatsapp(events.links?.whatsapp ?? '');
    setSchedule(Array.isArray(events.schedule) ? events.schedule : []);
  }, [events]);

  const save = async () => {
    setSaving(true);
    try {
      await updateContent({
        doc: 'event',
        patch: {
          eventDate, notice,
          finishArea: { ...(events.finishArea ?? {}), name: finishName },
          links: { ...(events.links ?? {}), donate, whatsapp },
          schedule,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('נשמר', 'פרטי המרוץ עודכנו ויופיעו לכל המשתמשים.');
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? '');
    } finally {
      setSaving(false);
    }
  };

  const setRow = (i: number, patch: Partial<ScheduleRow>) =>
    setSchedule((s) => s.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setSchedule((s) => [...s, { time: '', event: '', from: '' }]);
  const delRow = (i: number) => setSchedule((s) => s.filter((_, idx) => idx !== i));

  return (
    <View style={styles.c}>
      <AdminHeader title="עריכת המרוץ" subtitle="כל השינויים נשמרים ל-Firestore ומופיעים באפליקציה" icon="run" />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Section icon="calendar" text="פרטי האירוע" />
        <View style={styles.card}>
          <Field label="תאריך (YYYY-MM-DD)" value={eventDate} onChange={setEventDate} />
          <Field label="קו הסיום" value={finishName} onChange={setFinishName} />
          <Field label="הודעת אזהרה" value={notice} onChange={setNotice} multiline />
        </View>

        <Section icon="link-variant" text="קישורים" />
        <View style={styles.card}>
          <Field label="קישור תרומה" value={donate} onChange={setDonate} keyboard="url" />
          <Field label="וואטסאפ (מספר)" value={whatsapp} onChange={setWhatsapp} keyboard="phone-pad" />
        </View>

        <Section icon="clock-outline" text="לוח זמנים" />
        <View style={styles.card}>
          {schedule.map((r, i) => (
            <View key={i} style={styles.schedRow}>
              <TextInput style={[styles.input, styles.timeInput]} value={r.time} onChangeText={(v) => setRow(i, { time: v })} placeholder="06:00" placeholderTextColor={colors.muted} textAlign="center" />
              <TextInput style={[styles.input, { flex: 1 }]} value={r.event} onChangeText={(v) => setRow(i, { event: v })} placeholder="אירוע" placeholderTextColor={colors.muted} textAlign="right" />
              <TouchableOpacity onPress={() => delRow(i)} hitSlop={8}><MaterialCommunityIcons name="close-circle" size={22} color={colors.danger} /></TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addRow} onPress={addRow}>
            <MaterialCommunityIcons name="plus" size={16} color={colors.forest} />
            <Text style={styles.addRowTxt}>הוסף שורה ללוח</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>הקטגוריות (הליכה/שליחים/אולטרה) והמקטעים נטענים מ-Firestore; ניתן לערוך אותם דרך ה-content/event במסד.</Text>
      </ScrollView>

      <View style={styles.saveBar}>
        <TouchableOpacity style={[styles.save, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          <MaterialCommunityIcons name="content-save" size={18} color="#fff" />
          <Text style={styles.saveTxt}>{saving ? 'שומר…' : 'שמור שינויים'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Field({ label, value, onChange, multiline, keyboard }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; keyboard?: any }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, multiline && { height: 64 }]} value={value} onChangeText={onChange} multiline={multiline} keyboardType={keyboard} textAlign="right" placeholderTextColor={colors.muted} />
    </View>
  );
}

function Section({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.section}>
      <MaterialCommunityIcons name={icon} size={15} color={colors.forest} />
      <Text style={styles.sectionTxt}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  section: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTxt: { fontSize: 14, fontWeight: '800', color: colors.forest, writingDirection: 'rtl' },
  card: { backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.md, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, elevation: 1 },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, textAlign: 'right', writingDirection: 'rtl', marginBottom: 4 },
  input: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 12, borderWidth: 1, borderColor: colors.line, writingDirection: 'rtl' },
  schedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  timeInput: { width: 70 },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  addRowTxt: { color: colors.forest, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 12, textAlign: 'right', writingDirection: 'rtl', marginTop: spacing.lg, lineHeight: 18 },
  saveBar: { padding: spacing.md, paddingBottom: spacing.lg, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line },
  save: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: colors.forest, paddingVertical: 15, borderRadius: radius.pill },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
