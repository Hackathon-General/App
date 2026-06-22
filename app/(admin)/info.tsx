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

interface Item { title: string; body: string }
interface Member { name: string; role: string }
interface InfoDoc {
  about?: { title?: string; body?: string; activities?: string[] };
  team?: Member[];
  generalInfo?: Item[];
  regulations?: Item[];
  contactPrompt?: string;
}

/** Admin editor for content/info — מי אנחנו, ועדת היגוי, מידע כללי, תקנון. */
export default function AdminInfo() {
  const { info } = useContent();
  const [d, setD] = useState<InfoDoc>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { setD(JSON.parse(JSON.stringify(info ?? {}))); }, [info]);
  const set = (patch: Partial<InfoDoc>) => setD((s) => ({ ...s, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      await updateContent({ doc: 'info', patch: d });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('נשמר', 'המידע עודכן ומופיע לכל המשתמשים.');
    } catch (err: any) { Alert.alert('שגיאה', err?.message ?? ''); }
    finally { setSaving(false); }
  };

  return (
    <View style={styles.c}>
      <AdminHeader title="מידע ותקנון" subtitle="מי אנחנו, מידע כללי ותקנון — נשמר ל-Firestore" icon="information" />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <Section icon="heart" text="מי אנחנו" />
        <View style={styles.card}>
          <F label="כותרת" v={d.about?.title ?? ''} on={(t) => set({ about: { ...(d.about ?? {}), title: t } })} />
          <F label="תיאור" v={d.about?.body ?? ''} on={(t) => set({ about: { ...(d.about ?? {}), body: t } })} multiline tall />
          <StrList title="פעילויות" items={d.about?.activities ?? []} onChange={(activities) => set({ about: { ...(d.about ?? {}), activities } })} />
        </View>

        <Section icon="account-group" text="ועדת היגוי" />
        <View style={styles.card}>
          <ListEditor items={d.team ?? []} empty={{ name: '', role: '' }} add={(team) => set({ team })}
            render={(m, upd) => (<>
              <F label="שם" v={m.name} on={(t) => upd({ name: t })} />
              <F label="תפקיד" v={m.role} on={(t) => upd({ role: t })} multiline />
            </>)} />
        </View>

        <Section icon="lightbulb-on" text="מידע כללי" />
        <View style={styles.card}>
          <ListEditor items={d.generalInfo ?? []} empty={{ title: '', body: '' }} add={(generalInfo) => set({ generalInfo })}
            render={(it, upd) => (<>
              <F label="כותרת" v={it.title} on={(t) => upd({ title: t })} />
              <F label="תוכן" v={it.body} on={(t) => upd({ body: t })} multiline tall />
            </>)} />
        </View>

        <Section icon="gavel" text="תקנון" />
        <View style={styles.card}>
          <ListEditor items={d.regulations ?? []} empty={{ title: '', body: '' }} add={(regulations) => set({ regulations })}
            render={(it, upd) => (<>
              <F label="כותרת" v={it.title} on={(t) => upd({ title: t })} />
              <F label="תוכן" v={it.body} on={(t) => upd({ body: t })} multiline tall />
            </>)} />
        </View>
      </ScrollView>

      <View style={styles.saveBar}>
        <TouchableOpacity style={[styles.save, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          <MaterialCommunityIcons name="content-save" size={18} color="#fff" />
          <Text style={styles.saveTxt}>{saving ? 'שומר…' : 'שמור מידע'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* generic list editor (title/body or name/role) */
function ListEditor<T>({ items, empty, add, render }: {
  items: T[]; empty: T; add: (items: T[]) => void; render: (item: T, upd: (p: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <>
      {items.map((it, i) => (
        <View key={i} style={styles.item}>
          {render(it, (p) => add(items.map((x, idx) => idx === i ? { ...x, ...p } : x)))}
          <TouchableOpacity style={styles.remove} onPress={() => add(items.filter((_, idx) => idx !== i))}>
            <MaterialCommunityIcons name="close" size={14} color={colors.danger} /><Text style={styles.removeTxt}>הסר</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.addItem} onPress={() => add([...items, JSON.parse(JSON.stringify(empty))])}>
        <MaterialCommunityIcons name="plus" size={15} color={colors.forest} /><Text style={styles.addTxt}>הוסף</Text>
      </TouchableOpacity>
    </>
  );
}

function StrList({ title, items, onChange }: { title: string; items: string[]; onChange: (s: string[]) => void }) {
  return (
    <View style={{ marginTop: spacing.sm }}>
      <Text style={styles.label}>{title}</Text>
      {items.map((s, i) => (
        <View key={i} style={styles.strRow}>
          <TextInput style={[styles.input, { flex: 1 }]} value={s} onChangeText={(v) => onChange(items.map((x, idx) => idx === i ? v : x))} textAlign="right" />
          <TouchableOpacity onPress={() => onChange(items.filter((_, idx) => idx !== i))} hitSlop={8}><MaterialCommunityIcons name="close-circle" size={20} color={colors.danger} /></TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.addItem} onPress={() => onChange([...items, ''])}><MaterialCommunityIcons name="plus" size={15} color={colors.forest} /><Text style={styles.addTxt}>הוסף</Text></TouchableOpacity>
    </View>
  );
}

function F({ label, v, on, multiline, tall }: { label: string; v: string; on: (t: string) => void; multiline?: boolean; tall?: boolean }) {
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, multiline && { height: tall ? 90 : 60 }]} value={v} onChangeText={on} multiline={multiline} textAlign="right" placeholderTextColor={colors.muted} />
    </View>
  );
}
function Section({ icon, text }: { icon: any; text: string }) {
  return <View style={styles.section}><MaterialCommunityIcons name={icon} size={15} color={colors.forest} /><Text style={styles.sectionTxt}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  section: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTxt: { fontSize: 14, fontWeight: '800', color: colors.forest, writingDirection: 'rtl' },
  card: { backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.md, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, elevation: 1 },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, textAlign: 'right', writingDirection: 'rtl', marginBottom: 4 },
  input: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 11, borderWidth: 1, borderColor: colors.line, writingDirection: 'rtl', textAlign: 'right' },
  item: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm },
  remove: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start' },
  removeTxt: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  addItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  addTxt: { color: colors.forest, fontWeight: '700' },
  strRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  saveBar: { padding: spacing.md, paddingBottom: spacing.lg, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line },
  save: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: colors.forest, paddingVertical: 15, borderRadius: radius.pill },
  saveTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
