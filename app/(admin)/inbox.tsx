import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { collection, onSnapshot, doc, setDoc, query, orderBy } from '@react-native-firebase/firestore';
import { db } from '@/firebase';
import { colors, spacing, radius } from '@/theme';
import { AdminHeader } from '@/components/AdminHeader';
import { FORM_META, type FormType, type FormSubmission } from '@/features/forms/forms';

type Filter = 'all' | FormType;
type StatusFilter = 'new' | 'handled' | 'archived' | 'all';

const STATUS_LABEL: Record<string, string> = { new: 'חדש', handled: 'טופל', archived: 'בארכיון' };
const STATUS_COLOR: Record<string, string> = { new: colors.terracotta, handled: colors.success, archived: colors.muted };

/** Admin inbox — live view of all form submissions (registration/volunteer/team-finder/contact). */
export default function AdminInbox() {
  const [items, setItems] = useState<FormSubmission[]>([]);
  const [type, setType] = useState<Filter>('all');
  const [status, setStatus] = useState<StatusFilter>('new');

  useEffect(() => {
    const q = query(collection(db, 'forms'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q,
      (snap: any) => setItems(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as FormSubmission)),
      (err: any) => console.warn('[inbox] listener error', err?.message ?? err),
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(
    () => items.filter((i) => (type === 'all' || i.type === type) && (status === 'all' || i.status === status)),
    [items, type, status],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((i) => { if (i.status === 'new') c[i.type] = (c[i.type] ?? 0) + 1; });
    return c;
  }, [items]);
  const newTotal = items.filter((i) => i.status === 'new').length;

  const setStatusOf = async (id: string, s: string) => {
    Haptics.selectionAsync().catch(() => {});
    await setDoc(doc(db, 'forms', id), { status: s, updatedAt: Date.now() }, { merge: true });
  };

  return (
    <View style={styles.c}>
      <AdminHeader title="תיבת פניות" subtitle={`${newTotal} פניות חדשות ממתינות`} icon="inbox-full" />

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.md, flexDirection: 'row-reverse' }}>
          <Chip label="הכל" active={type === 'all'} onPress={() => setType('all')} />
          {(Object.keys(FORM_META) as FormType[]).map((t) => (
            <Chip key={t} label={FORM_META[t].title} icon={FORM_META[t].icon} badge={counts[t]} active={type === t} onPress={() => setType(t)} />
          ))}
        </ScrollView>
      </View>
      <View style={styles.statusRow}>
        {(['new', 'handled', 'archived', 'all'] as StatusFilter[]).map((s) => (
          <TouchableOpacity key={s} style={[styles.statusBtn, status === s && styles.statusBtnActive]} onPress={() => setStatus(s)}>
            <Text style={[styles.statusTxt, status === s && { color: '#fff' }]}>{s === 'all' ? 'הכל' : STATUS_LABEL[s]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={styles.empty}><MaterialCommunityIcons name="inbox" size={48} color={colors.line} /><Text style={styles.emptyTxt}>אין פניות בקטגוריה זו</Text></View>
        )}
        {filtered.map((it) => <SubmissionCard key={it.id} it={it} onStatus={setStatusOf} />)}
      </ScrollView>
    </View>
  );
}

function SubmissionCard({ it, onStatus }: { it: FormSubmission; onStatus: (id: string, s: string) => void }) {
  const meta = FORM_META[it.type] ?? { title: it.type, icon: 'file' };
  const d = it.data ?? {};
  const phone = d.phone?.replace(/\D/g, '');
  const when = it.createdAt ? new Date(it.createdAt).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[it.status] ?? colors.muted }]} />
        <MaterialCommunityIcons name={meta.icon as any} size={18} color={colors.forest} />
        <Text style={styles.cardType}>{meta.title}</Text>
        <Text style={styles.cardWhen}>{when}</Text>
      </View>
      {Object.entries(d).map(([k, v]) => v ? (
        <View key={k} style={styles.field}><Text style={styles.fieldKey}>{k}</Text><Text style={styles.fieldVal}>{String(v)}</Text></View>
      ) : null)}

      <View style={styles.actions}>
        {!!phone && <Action icon="phone" label="חיוג" onPress={() => Linking.openURL(`tel:${phone}`)} />}
        {!!phone && <Action icon="whatsapp" label="וואטסאפ" onPress={() => Linking.openURL(`https://wa.me/972${phone.replace(/^0/, '')}`)} />}
        {!!d.email && <Action icon="email" label="מייל" onPress={() => Linking.openURL(`mailto:${d.email}`)} />}
        <View style={{ flex: 1 }} />
        {it.status !== 'handled' && <Action icon="check" label="טופל" color={colors.success} onPress={() => onStatus(it.id, 'handled')} />}
        {it.status !== 'archived' && <Action icon="archive" label="ארכיון" color={colors.muted} onPress={() => onStatus(it.id, 'archived')} />}
      </View>
    </View>
  );
}

const Chip = ({ label, icon, badge, active, onPress }: { label: string; icon?: string; badge?: number; active: boolean; onPress: () => void }) => (
  <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
    {!!icon && <MaterialCommunityIcons name={icon as any} size={14} color={active ? '#fff' : colors.forest} />}
    <Text style={[styles.chipTxt, active && { color: '#fff' }]}>{label}</Text>
    {!!badge && <View style={styles.badge}><Text style={styles.badgeTxt}>{badge}</Text></View>}
  </TouchableOpacity>
);
const Action = ({ icon, label, color, onPress }: { icon: string; label: string; color?: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.action} onPress={onPress}>
    <MaterialCommunityIcons name={icon as any} size={16} color={color ?? colors.forest} />
    <Text style={[styles.actionTxt, { color: color ?? colors.forest }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  filters: { paddingVertical: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.forest, borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 13 },
  chipActive: { backgroundColor: colors.forest },
  chipTxt: { color: colors.forest, fontWeight: '700', fontSize: 13 },
  badge: { backgroundColor: colors.terracotta, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  statusRow: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  statusBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line },
  statusBtnActive: { backgroundColor: colors.terracotta, borderColor: colors.terracotta },
  statusTxt: { fontSize: 12, fontWeight: '700', color: colors.muted },
  card: { backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, elevation: 1 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: spacing.sm },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  cardType: { fontWeight: '800', color: colors.ink, flex: 1, textAlign: 'right', writingDirection: 'rtl' },
  cardWhen: { fontSize: 11, color: colors.muted },
  field: { flexDirection: 'row-reverse', gap: 6, marginBottom: 3 },
  fieldKey: { fontSize: 12, color: colors.muted, fontWeight: '700', minWidth: 64, textAlign: 'right' },
  fieldVal: { fontSize: 13, color: colors.ink, flex: 1, textAlign: 'right', writingDirection: 'rtl' },
  actions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  actionTxt: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyTxt: { color: colors.muted },
});
