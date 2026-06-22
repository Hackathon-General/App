import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { colors, spacing, radius } from '@/theme';
import { AdminHeader } from '@/components/AdminHeader';
import { runAdminE2E, type StepResult } from '@/features/admin/e2e';
import { useAuth } from '@/auth/AuthProvider';

/** Admin-only in-app E2E test runner — exercises every admin capability via the real callables.
 *  Deep link: carmelkinneret://(admin)/tests?run=1  → auto-runs the suite on open. */
export default function AdminTests() {
  const { run: runParam } = useLocalSearchParams<{ run?: string }>();
  const { role } = useAuth();
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepResult[]>([]);
  const [summary, setSummary] = useState<{ passed: number; failed: number } | null>(null);
  const startedRef = useRef(false);

  const run = useCallback(async () => {
    if (running) return;
    if (role !== 'admin') { // defense-in-depth: never run for non-admins
      setSteps([{ name: 'הרשאה', ok: false, detail: 'נדרשת הרשאת מנהל' }]);
      return;
    }
    setRunning(true); setSteps([]); setSummary(null);
    try {
      const res = await runAdminE2E((r) => setSteps((s) => [...s, r]));
      setSummary(res);
    } finally {
      setRunning(false);
    }
  }, [running, role]);

  // Auto-run when opened via deep link with ?run=1 (once).
  useFocusEffect(
    useCallback(() => {
      if (runParam && !startedRef.current) {
        startedRef.current = true;
        run();
      }
    }, [runParam, run])
  );

  return (
    <View style={styles.c}>
      <AdminHeader title="בדיקות מערכת" subtitle="הרצת בדיקות קצה-לקצה לכל יכולות הניהול" icon="test-tube" />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={[styles.runBtn, running && styles.runBtnOff]} onPress={run} disabled={running}>
          {running ? <ActivityIndicator color="#fff" /> : <MaterialCommunityIcons name="play" size={20} color="#fff" />}
          <Text style={styles.runTxt}>{running ? 'מריץ בדיקות…' : 'הרץ בדיקות'}</Text>
        </TouchableOpacity>

        {summary && (
          <View style={[styles.summary, { backgroundColor: summary.failed ? '#FBE9E7' : '#E8F5E9' }]}>
            <MaterialCommunityIcons name={summary.failed ? 'alert-circle' : 'check-circle'} size={22} color={summary.failed ? colors.danger : colors.success} />
            <Text style={styles.summaryTxt}>{summary.passed} עברו · {summary.failed} נכשלו</Text>
          </View>
        )}

        {steps.map((s, i) => (
          <View key={i} style={styles.step}>
            <MaterialCommunityIcons name={s.ok ? 'check-circle' : 'close-circle'} size={20} color={s.ok ? colors.success : colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stepName}>{s.name}</Text>
              {!!s.detail && <Text style={[styles.stepDetail, !s.ok && { color: colors.danger }]}>{s.detail}</Text>}
            </View>
          </View>
        ))}

        {steps.length === 0 && !running && (
          <Text style={styles.hint}>הבדיקות יוצרות נתוני דמה ומנקות אותם אוטומטית. מאמת: טעינת תוכן, הוספת/מחיקת תחנה, עדכון תוכן, יצירת משימה, שיגור התראה, מפה חיה, לפיד.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.forest, paddingVertical: 16, borderRadius: radius.pill },
  runBtnOff: { opacity: 0.7 },
  runTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  summaryTxt: { fontWeight: '800', color: colors.ink, writingDirection: 'rtl' },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  stepName: { fontWeight: '700', color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  stepDetail: { fontSize: 12, color: colors.muted, textAlign: 'right', writingDirection: 'rtl', marginTop: 1 },
  hint: { color: colors.muted, textAlign: 'right', marginTop: spacing.lg, lineHeight: 20, writingDirection: 'rtl' },
});
