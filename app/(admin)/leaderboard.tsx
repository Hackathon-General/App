import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { collection, query, orderBy, limit, onSnapshot } from '@react-native-firebase/firestore';
import { ref, onValue } from '@react-native-firebase/database';
import { db, rtdb } from '@/firebase';
import { useLive } from '@/features/live/useLive';
import { colors, spacing, radius } from '@/theme';
import { AdminHeader } from '@/components/AdminHeader';

interface Row { id: string; displayName?: string; totalKm?: number }
const MEDALS = ['#FFCF56', '#C0C0C0', '#CD7F32'];
const TRAIL_KM = 92; // full Carmel→Kinneret length

/** דופק האירוע — split view: live race (speeds) | community torch effort (km bank + top bearers). */
export default function Leaderboard() {
  const [tab, setTab] = useState<'race' | 'torch'>('race');
  const [rows, setRows] = useState<Row[]>([]);
  const [communityKm, setCommunityKm] = useState(0);
  const pins = useLive();

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('totalKm', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => setRows(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as object) }) as Row)));
    return () => unsub();
  }, []);
  useEffect(() => {
    const unsub = onValue(ref(rtdb, 'community/totalKm'), (s) => setCommunityKm(Number(s.val()) || 0));
    return () => unsub();
  }, []);

  // Live race: everyone currently broadcasting, sorted by current speed (km/h).
  const racers = useMemo(() => {
    const now = Date.now();
    return pins
      .filter((p) => now - (p.ts ?? 0) < 120000) // active in last 2 min
      .map((p) => ({ ...p, kmh: (p.speed ?? 0) * 3.6 }))
      .sort((a, b) => b.kmh - a.kmh);
  }, [pins]);

  const laps = Math.floor(communityKm / TRAIL_KM);

  return (
    <View style={styles.c}>
      <AdminHeader title="דופק האירוע" subtitle="המירוץ החי מול מאמץ הלפיד הקהילתי" icon="pulse" />
      <View style={styles.tabs}>
        <Tab label="מירוץ חי" icon="run-fast" active={tab === 'race'} onPress={() => { Haptics.selectionAsync().catch(() => {}); setTab('race'); }} />
        <Tab label="מירוץ הלפיד" icon="torch" active={tab === 'torch'} onPress={() => { Haptics.selectionAsync().catch(() => {}); setTab('torch'); }} />
      </View>

      {tab === 'race' ? (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.liveBanner}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTxt}>{racers.length} משתתפים פעילים על המסלול</Text>
          </View>
          {racers.length === 0 && <Empty icon="run" text="אין רצים פעילים כרגע" />}
          {racers.map((r, i) => (
            <View key={r.id} style={styles.raceRow}>
              <Text style={styles.racePos}>{i + 1}</Text>
              <View style={[styles.srcBadge, { backgroundColor: r.source === 'sensor' ? colors.sky : colors.forest }]}>
                <MaterialCommunityIcons name={r.source === 'sensor' ? 'cpu-64-bit' : 'cellphone'} size={13} color="#fff" />
              </View>
              <Text style={styles.raceName} numberOfLines={1}>{r.name ?? (r.source === 'sensor' ? 'חיישן' : 'מטייל/ת')}</Text>
              <Text style={styles.raceSpeed}>{r.kmh.toFixed(1)}</Text>
              <Text style={styles.raceUnit}>קמ"ש</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* The Big Number */}
          <View style={styles.bank}>
            <MaterialCommunityIcons name="fire" size={30} color={colors.gold} />
            <Text style={styles.bankNum}>{communityKm.toFixed(1)}</Text>
            <Text style={styles.bankLabel}>סך הקילומטרים שהקהילה צברה יחד</Text>
            {laps > 0 && (
              <View style={styles.lapPill}>
                <MaterialCommunityIcons name="check-decagram" size={15} color={colors.deepGreen} />
                <Text style={styles.lapTxt}>הקהילה השלימה את השביל {laps} פעמים!</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionH}>שיאני הלפיד</Text>
          {rows.length === 0 && <Empty icon="trophy-outline" text="אין נתונים עדיין" />}
          {rows.map((item, index) => {
            const medal = MEDALS[index];
            return (
              <View key={item.id} style={[styles.row, medal && { borderColor: medal, borderWidth: 1.5 }]}>
                <View style={[styles.rankCircle, { backgroundColor: medal ?? colors.bg }]}>
                  {medal ? <MaterialCommunityIcons name="medal" size={18} color="#fff" /> : <Text style={styles.rankTxt}>{index + 1}</Text>}
                </View>
                <Text style={styles.name} numberOfLines={1}>{item.displayName ?? 'מטייל/ת'}</Text>
                <Text style={styles.km}>{(item.totalKm ?? 0).toFixed(1)} ק"מ</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const Tab = ({ label, icon, active, onPress }: { label: string; icon: any; active: boolean; onPress: () => void }) => (
  <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={17} color={active ? '#fff' : colors.forest} />
    <Text style={[styles.tabTxt, active && { color: '#fff' }]}>{label}</Text>
  </TouchableOpacity>
);
const Empty = ({ icon, text }: { icon: any; text: string }) => (
  <View style={styles.emptyWrap}><MaterialCommunityIcons name={icon} size={44} color={colors.line} /><Text style={styles.empty}>{text}</Text></View>
);

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  tabs: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.forest, borderRadius: radius.pill, paddingVertical: 10 },
  tabActive: { backgroundColor: colors.forest },
  tabTxt: { fontWeight: '800', color: colors.forest, fontSize: 14 },
  body: { padding: spacing.md },
  liveBanner: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  liveTxt: { flex: 1, fontWeight: '700', color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  raceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, backgroundColor: '#fff', borderRadius: radius.md, padding: 12, marginBottom: 8 },
  racePos: { width: 24, textAlign: 'center', fontWeight: '900', color: colors.muted, fontSize: 15 },
  srcBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  raceName: { flex: 1, textAlign: 'right', color: colors.ink, fontWeight: '700', writingDirection: 'rtl' },
  raceSpeed: { fontWeight: '900', color: colors.forest, fontSize: 18 },
  raceUnit: { fontSize: 11, color: colors.muted },
  bank: { alignItems: 'center', backgroundColor: colors.deepGreen, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  bankNum: { fontSize: 48, fontWeight: '900', color: colors.gold, marginTop: 4 },
  bankLabel: { color: '#fff', marginTop: 2, writingDirection: 'rtl', textAlign: 'center' },
  lapPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6, marginTop: spacing.md },
  lapTxt: { color: colors.deepGreen, fontWeight: '800', fontSize: 13 },
  sectionH: { fontSize: 16, fontWeight: '900', color: colors.forest, textAlign: 'right', marginBottom: spacing.sm, writingDirection: 'rtl' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#fff', borderRadius: radius.md, padding: 12, marginBottom: 8 },
  rankCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rankTxt: { fontWeight: '900', color: colors.muted, fontSize: 15 },
  name: { flex: 1, textAlign: 'right', color: colors.ink, fontWeight: '700', writingDirection: 'rtl' },
  km: { color: colors.forest, fontWeight: '800' },
  emptyWrap: { alignItems: 'center', marginTop: 50, gap: spacing.sm },
  empty: { textAlign: 'center', color: colors.muted, writingDirection: 'rtl' },
});
