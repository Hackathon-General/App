import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { httpsCallable } from '@react-native-firebase/functions';
import { functions } from '@/firebase';
import { useContent } from '@/content/ContentProvider';
import { colors, spacing, radius } from '@/theme';
import { AdminHeader } from '@/components/AdminHeader';
import {
  type RaceEvent, type Category, type ScheduleRow,
  EMPTY_CATEGORY, EMPTY_LEG, EMPTY_TEAM, EMPTY_SUBRACE, EMPTY_ROUTE,
} from '@/features/admin/raceTypes';

const updateContent = httpsCallable(functions, 'updateContent');

/** Full מירוץ builder — every field & category editable e2e; writes content/event live. */
export default function AdminEvent() {
  const { events } = useContent();
  const [e, setE] = useState<RaceEvent>({});
  const [open, setOpen] = useState<string | null>(null); // expanded category id
  const [saving, setSaving] = useState(false);

  useEffect(() => { setE(JSON.parse(JSON.stringify(events ?? {}))); }, [events]);

  const set = (patch: Partial<RaceEvent>) => setE((s) => ({ ...s, ...patch }));
  const cats = e.categories ?? [];
  const setCat = (i: number, patch: Partial<Category>) =>
    setE((s) => ({ ...s, categories: (s.categories ?? []).map((c, idx) => idx === i ? { ...c, ...patch } : c) }));

  const save = async () => {
    setSaving(true);
    try {
      await updateContent({ doc: 'event', patch: e });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('נשמר', 'המרוץ עודכן ומופיע לכל המשתמשים.');
    } catch (err: any) { Alert.alert('שגיאה', err?.message ?? ''); }
    finally { setSaving(false); }
  };

  return (
    <View style={styles.c}>
      <AdminHeader title="בניית המרוץ" subtitle="כל פרטי האירוע, הקטגוריות והמקטעים — נשמר ל-Firestore" icon="run" />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <Section icon="information" text="פרטי האירוע" />
        <View style={styles.card}>
          <F label="שם המרוץ" v={e.name ?? ''} on={(t) => set({ name: t })} />
          <F label="כותרת משנה" v={e.subtitle ?? ''} on={(t) => set({ subtitle: t })} />
          <F label="כותרת ראשית" v={e.headline ?? ''} on={(t) => set({ headline: t })} multiline />
          <Row>
            <F flex label="תאריך (YYYY-MM-DD)" v={e.eventDate ?? ''} on={(t) => set({ eventDate: t })} />
            <F flex label="סטטוס הרשמה" v={e.registrationStatus ?? ''} on={(t) => set({ registrationStatus: t })} />
          </Row>
          <F label="הודעת אזהרה" v={e.notice ?? ''} on={(t) => set({ notice: t })} multiline />
          <Row>
            <F flex label="קו הסיום" v={e.finishArea?.name ?? ''} on={(t) => set({ finishArea: { ...(e.finishArea ?? {}), name: t } })} />
            <F flex label="טקס סיום" v={e.finishArea?.closingCeremony ?? ''} on={(t) => set({ finishArea: { ...(e.finishArea ?? {}), closingCeremony: t } })} />
          </Row>
        </View>

        <Section icon="format-list-bulleted-type" text={`קטגוריות (${cats.length})`} />
        {cats.map((c, i) => (
          <CategoryCard key={c.id + i} c={c} expanded={open === c.id} onToggle={() => setOpen(open === c.id ? null : c.id)}
            onChange={(patch) => setCat(i, patch)} onDelete={() => set({ categories: cats.filter((_, idx) => idx !== i) })} />
        ))}
        <View style={styles.addCatRow}>
          {(['walk', 'relay', 'ultra'] as const).map((id) => (
            <TouchableOpacity key={id} style={styles.addCat} onPress={() => set({ categories: [...cats, { ...EMPTY_CATEGORY(id), name: id === 'walk' ? 'הליכה' : id === 'relay' ? 'מרוץ שליחים' : 'אולטרה' }] })}>
              <MaterialCommunityIcons name="plus" size={15} color={colors.forest} />
              <Text style={styles.addCatTxt}>{id === 'walk' ? 'הליכה' : id === 'relay' ? 'שליחים' : 'אולטרה'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Section icon="clock-outline" text="לוח זמנים" />
        <View style={styles.card}>
          <ScheduleEditor rows={e.schedule ?? []} onChange={(schedule) => set({ schedule })} />
        </View>

        <Section icon="link-variant" text="קישורים" />
        <View style={styles.card}>
          <F label="תרומה" v={e.links?.donate ?? ''} on={(t) => set({ links: { ...(e.links ?? {}), donate: t } })} keyboard="url" />
          <F label="הרשמה" v={e.links?.register ?? ''} on={(t) => set({ links: { ...(e.links ?? {}), register: t } })} keyboard="url" />
          <F label="וואטסאפ" v={e.links?.whatsapp ?? ''} on={(t) => set({ links: { ...(e.links ?? {}), whatsapp: t } })} keyboard="phone-pad" />
        </View>
      </ScrollView>

      <View style={styles.saveBar}>
        <TouchableOpacity style={[styles.save, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          <MaterialCommunityIcons name="content-save" size={18} color="#fff" />
          <Text style={styles.saveTxt}>{saving ? 'שומר…' : 'שמור מרוץ'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ---------- Category card (collapsible, type-specific sub-editors) ---------- */
function CategoryCard({ c, expanded, onToggle, onChange, onDelete }: {
  c: Category; expanded: boolean; onToggle: () => void; onChange: (p: Partial<Category>) => void; onDelete: () => void;
}) {
  return (
    <View style={styles.catCard}>
      <TouchableOpacity style={styles.catHead} onPress={onToggle}>
        <MaterialCommunityIcons name={c.id === 'walk' ? 'walk' : c.id === 'relay' ? 'flag-checkered' : 'run-fast'} size={18} color={colors.terracotta} />
        <Text style={styles.catTitle}>{c.name || c.id}</Text>
        <TouchableOpacity onPress={onDelete} hitSlop={8}><MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} /></TouchableOpacity>
        <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.catBody}>
          <F label="שם" v={c.name ?? ''} on={(t) => onChange({ name: t })} />
          <F label="תיאור" v={c.description ?? ''} on={(t) => onChange({ description: t })} multiline />

          {c.id === 'walk' && (
            <ListEditor title="מסלולים" items={c.routes ?? []} add={() => onChange({ routes: [...(c.routes ?? []), EMPTY_ROUTE()] })}
              onChange={(routes) => onChange({ routes })}
              render={(r, upd) => (<>
                <Row><F flex label="שם" v={r.name} on={(t) => upd({ name: t })} /><F flex label='ק"מ' v={String(r.km)} on={(t) => upd({ km: +t || 0 })} keyboard="numeric" /></Row>
                <Row><F flex label="זינוק" v={r.start} on={(t) => upd({ start: t })} /><F flex label="סיום" v={r.finish} on={(t) => upd({ finish: t })} /></Row>
                <Row><F flex label="הסעה" v={r.busDeparture ?? ''} on={(t) => upd({ busDeparture: t })} /><F flex label="דרגת קושי" v={r.difficulty ?? ''} on={(t) => upd({ difficulty: t })} /></Row>
              </>)} />
          )}

          {c.id === 'relay' && (<>
            <Row><F flex label='סה"כ ק"מ' v={String(c.totalKm ?? '')} on={(t) => onChange({ totalKm: +t || 0 })} keyboard="numeric" /><F flex label="זינוק" v={c.start ?? ''} on={(t) => onChange({ start: t })} /></Row>
            <ListEditor title="צוותים" items={c.teams ?? []} add={() => onChange({ teams: [...(c.teams ?? []), EMPTY_TEAM()] })}
              onChange={(teams) => onChange({ teams })}
              render={(tm, upd) => (<Row>
                <F flex label="שם" v={tm.name} on={(t) => upd({ name: t })} />
                <F flex label="רצים" v={String(tm.runners)} on={(t) => upd({ runners: +t || 0 })} keyboard="numeric" />
                <F flex label="מחיר" v={String(tm.pricePerPerson)} on={(t) => upd({ pricePerPerson: +t || 0 })} keyboard="numeric" />
              </Row>)} />
            <ListEditor title="מקטעים" items={c.legs ?? []} add={() => onChange({ legs: [...(c.legs ?? []), EMPTY_LEG((c.legs?.length ?? 0) + 1)] })}
              onChange={(legs) => onChange({ legs })}
              render={(lg, upd) => (<>
                <Row><F flex label="מס׳" v={String(lg.n)} on={(t) => upd({ n: +t || 0 })} keyboard="numeric" /><F flex label='ק"מ' v={String(lg.km)} on={(t) => upd({ km: +t || 0 })} keyboard="numeric" /></Row>
                <Row><F flex label="מ-" v={lg.from} on={(t) => upd({ from: t })} /><F flex label="עד-" v={lg.to} on={(t) => upd({ to: t })} /></Row>
              </>)} />
          </>)}

          {c.id === 'ultra' && (<>
            <F label="דרישות" v={c.requirement ?? ''} on={(t) => onChange({ requirement: t })} />
            <ListEditor title="מקצים" items={c.subRaces ?? []} add={() => onChange({ subRaces: [...(c.subRaces ?? []), EMPTY_SUBRACE()] })}
              onChange={(subRaces) => onChange({ subRaces })}
              render={(sr, upd) => (<>
                <Row><F flex label="שם" v={sr.name} on={(t) => upd({ name: t })} /><F flex label='ק"מ' v={String(sr.km)} on={(t) => upd({ km: +t || 0 })} keyboard="numeric" /></Row>
                <Row><F flex label="זינוק" v={sr.startTime ?? ''} on={(t) => upd({ startTime: t })} /><F flex label="cutoff" v={sr.cutoff ?? ''} on={(t) => upd({ cutoff: t })} /></Row>
                <Row><F flex label="טיפוס+" v={String(sr.gain ?? '')} on={(t) => upd({ gain: +t || 0 })} keyboard="numeric" /><F flex label="מחיר" v={String(sr.price ?? '')} on={(t) => upd({ price: +t || 0 })} keyboard="numeric" /></Row>
              </>)} />
          </>)}
        </View>
      )}
    </View>
  );
}

/* ---------- Generic nested list editor ---------- */
function ListEditor<T>({ title, items, add, onChange, render }: {
  title: string; items: T[]; add: () => void; onChange: (items: T[]) => void; render: (item: T, upd: (p: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <View style={styles.listEditor}>
      <Text style={styles.listTitle}>{title} ({items.length})</Text>
      {items.map((it, i) => (
        <View key={i} style={styles.listItem}>
          {render(it, (p) => onChange(items.map((x, idx) => idx === i ? { ...x, ...p } : x)))}
          <TouchableOpacity style={styles.removeItem} onPress={() => onChange(items.filter((_, idx) => idx !== i))}>
            <MaterialCommunityIcons name="close" size={14} color={colors.danger} /><Text style={styles.removeTxt}>הסר</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.addItem} onPress={add}><MaterialCommunityIcons name="plus" size={15} color={colors.forest} /><Text style={styles.addItemTxt}>הוסף</Text></TouchableOpacity>
    </View>
  );
}

function ScheduleEditor({ rows, onChange }: { rows: ScheduleRow[]; onChange: (r: ScheduleRow[]) => void }) {
  return (
    <>
      {rows.map((r, i) => (
        <View key={i} style={styles.schedRow}>
          <TextInput style={[styles.input, { width: 64 }]} value={r.time} onChangeText={(v) => onChange(rows.map((x, idx) => idx === i ? { ...x, time: v } : x))} placeholder="06:00" placeholderTextColor={colors.muted} textAlign="center" />
          <TextInput style={[styles.input, { flex: 1 }]} value={r.event} onChangeText={(v) => onChange(rows.map((x, idx) => idx === i ? { ...x, event: v } : x))} placeholder="אירוע" placeholderTextColor={colors.muted} textAlign="right" />
          <TouchableOpacity onPress={() => onChange(rows.filter((_, idx) => idx !== i))} hitSlop={8}><MaterialCommunityIcons name="close-circle" size={20} color={colors.danger} /></TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.addItem} onPress={() => onChange([...rows, { time: '', event: '' }])}><MaterialCommunityIcons name="plus" size={15} color={colors.forest} /><Text style={styles.addItemTxt}>הוסף שורה</Text></TouchableOpacity>
    </>
  );
}

/* ---------- primitives ---------- */
function F({ label, v, on, multiline, keyboard, flex }: { label: string; v: string; on: (t: string) => void; multiline?: boolean; keyboard?: any; flex?: boolean }) {
  return (
    <View style={[{ marginBottom: spacing.sm }, flex && { flex: 1 }]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, multiline && { height: 60 }]} value={v} onChangeText={on} multiline={multiline} keyboardType={keyboard} textAlign="right" placeholderTextColor={colors.muted} />
    </View>
  );
}
const Row = ({ children }: { children: React.ReactNode }) => <View style={styles.row}>{children}</View>;
function Section({ icon, text }: { icon: any; text: string }) {
  return <View style={styles.section}><MaterialCommunityIcons name={icon} size={15} color={colors.forest} /><Text style={styles.sectionTxt}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  section: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTxt: { fontSize: 14, fontWeight: '800', color: colors.forest, writingDirection: 'rtl' },
  card: { backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.md, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, elevation: 1 },
  row: { flexDirection: 'row', gap: spacing.sm },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, textAlign: 'right', writingDirection: 'rtl', marginBottom: 4 },
  input: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 11, borderWidth: 1, borderColor: colors.line, writingDirection: 'rtl' },
  catCard: { backgroundColor: '#fff', borderRadius: radius.md, marginBottom: spacing.sm, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, elevation: 1 },
  catHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  catTitle: { flex: 1, fontWeight: '800', color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  catBody: { padding: spacing.md, paddingTop: 0, borderTopWidth: 1, borderTopColor: colors.line },
  addCatRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  addCat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.forest, borderRadius: radius.pill, paddingVertical: 10 },
  addCatTxt: { color: colors.forest, fontWeight: '700', fontSize: 13 },
  listEditor: { marginTop: spacing.sm, backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm },
  listTitle: { fontWeight: '800', color: colors.ink, marginBottom: spacing.xs, textAlign: 'right', writingDirection: 'rtl' },
  listItem: { backgroundColor: '#fff', borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm },
  removeItem: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start' },
  removeTxt: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  addItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  addItemTxt: { color: colors.forest, fontWeight: '700' },
  schedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  saveBar: { padding: spacing.md, paddingBottom: spacing.lg, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line },
  save: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: colors.forest, paddingVertical: 15, borderRadius: radius.pill },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
