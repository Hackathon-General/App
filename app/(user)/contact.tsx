import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '@/theme';
import { submitForm, type FormType } from '@/features/forms/forms';

interface FieldDef { key: string; label: string; multiline?: boolean; keyboard?: any; required?: boolean }

/** The three community forms, one config each. */
const TABS: { type: FormType; label: string; icon: string; subtitle: string; intro?: string; fields: FieldDef[] }[] = [
  {
    type: 'contact', label: 'יצירת קשר', icon: 'email', subtitle: 'יש לכם שאלה? נשמח לעזור',
    fields: [
      { key: 'name', label: 'שם מלא', required: true },
      { key: 'phone', label: 'טלפון', keyboard: 'phone-pad' },
      { key: 'email', label: 'אימייל', keyboard: 'email-address' },
      { key: 'message', label: 'הודעה', multiline: true, required: true },
    ],
  },
  {
    type: 'volunteer', label: 'התנדבות', icon: 'hand-heart', subtitle: 'הצטרפו לצוות שמפיק את האירוע',
    intro: 'מחפשים מתנדבים/ות לתחנות מים, סדרנות, לוגיסטיקה ועוד. מלאו פרטים ונחזור אליכם.',
    fields: [
      { key: 'name', label: 'שם מלא', required: true },
      { key: 'phone', label: 'טלפון', keyboard: 'phone-pad', required: true },
      { key: 'area', label: 'תחום מועדף (תחנת מים / סדרנות / לוגיסטיקה)' },
      { key: 'notes', label: 'הערות', multiline: true },
    ],
  },
  {
    type: 'teamFinder', label: 'חיפוש צוות', icon: 'account-search', subtitle: 'חסרים לכם חברי צוות?',
    intro: 'רוצים להשתתף במרוץ השליחים אבל חסרים לכם רצים? מלאו את הטופס ונעשה את השידוכים המתאימים.',
    fields: [
      { key: 'name', label: 'שם מלא', required: true },
      { key: 'phone', label: 'טלפון', keyboard: 'phone-pad', required: true },
      { key: 'category', label: 'מקצה מבוקש (זוגות / רביעיות / שמיניות)' },
      { key: 'pace', label: 'קצב ריצה משוער' },
      { key: 'notes', label: 'הערות', multiline: true },
    ],
  },
];

/** Combined community-forms page — icon tabs switch between contact / volunteer / team-finder. */
export default function Contact() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const startIdx = Math.max(0, TABS.findIndex((t) => t.type === params.tab));
  const [active, setActive] = useState(startIdx === -1 ? 0 : startIdx);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const tab = TABS[active];

  const switchTab = (i: number) => { Haptics.selectionAsync().catch(() => {}); setActive(i); setValues({}); setDone(false); };

  const submit = async () => {
    const missing = tab.fields.find((f) => f.required && !values[f.key]?.trim());
    if (missing) { Alert.alert('חסר מידע', `נא למלא: ${missing.label}`); return; }
    setBusy(true);
    try {
      await submitForm(tab.type, values);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setDone(true);
    } catch (e: any) { Alert.alert('שגיאה', e?.message ?? ''); }
    finally { setBusy(false); }
  };

  return (
    <View style={styles.c}>
      <LinearGradient colors={[colors.forest, colors.deepGreen]} style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.back}><MaterialCommunityIcons name="chevron-right" size={26} color="#fff" /></TouchableOpacity>
        <Text style={styles.title}>{tab.label}</Text>
        <Text style={styles.subtitle}>{tab.subtitle}</Text>
        {/* icon tab switcher */}
        <View style={styles.tabs}>
          {TABS.map((t, i) => (
            <TouchableOpacity key={t.type} style={[styles.tab, i === active && styles.tabActive]} onPress={() => switchTab(i)}>
              <MaterialCommunityIcons name={t.icon as any} size={18} color={i === active ? colors.forest : 'rgba(255,255,255,0.9)'} />
              <Text style={[styles.tabTxt, i === active && { color: colors.forest }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {done ? (
        <View style={styles.doneWrap}>
          <View style={styles.doneCircle}><MaterialCommunityIcons name="check" size={44} color="#fff" /></View>
          <Text style={styles.doneTitle}>נשלח בהצלחה</Text>
          <Text style={styles.doneSub}>תודה! ניצור איתך קשר בהקדם.</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => setDone(false)}><Text style={styles.doneBtnTxt}>שליחת פנייה נוספת</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {!!tab.intro && <Text style={styles.intro}>{tab.intro}</Text>}
          {tab.fields.map((f) => (
            <View key={f.key} style={{ marginBottom: spacing.md }}>
              <Text style={styles.label}>{f.label}{f.required ? ' *' : ''}</Text>
              <TextInput
                style={[styles.input, f.multiline && { height: 90 }]}
                value={values[f.key] ?? ''}
                onChangeText={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                multiline={f.multiline} keyboardType={f.keyboard} textAlign="right" placeholderTextColor={colors.muted}
              />
            </View>
          ))}
          <TouchableOpacity style={[styles.submit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <><MaterialCommunityIcons name="send" size={18} color="#fff" /><Text style={styles.submitTxt}>שליחה</Text></>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { position: 'absolute', top: spacing.md, right: spacing.md, padding: 8, zIndex: 2 },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'right', writingDirection: 'rtl' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'right', writingDirection: 'rtl', marginTop: 2, marginBottom: spacing.md },
  tabs: { flexDirection: 'row-reverse', gap: 6 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 9, borderRadius: radius.pill },
  tabActive: { backgroundColor: '#fff' },
  tabTxt: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'right', writingDirection: 'rtl', marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: '700', color: colors.ink, textAlign: 'right', writingDirection: 'rtl', marginBottom: 5 },
  input: { backgroundColor: '#fff', borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.line, writingDirection: 'rtl', textAlign: 'right' },
  submit: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: colors.forest, paddingVertical: 16, borderRadius: radius.pill, marginTop: spacing.md },
  submitTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  doneCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 24, fontWeight: '900', color: colors.ink, marginTop: spacing.lg },
  doneSub: { color: colors.muted, marginTop: spacing.sm, textAlign: 'center', writingDirection: 'rtl' },
  doneBtn: { marginTop: spacing.xl, backgroundColor: colors.forest, paddingHorizontal: 36, paddingVertical: 14, borderRadius: radius.pill },
  doneBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
