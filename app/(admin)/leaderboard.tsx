import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, onSnapshot } from '@react-native-firebase/firestore';
import { ref, onValue } from '@react-native-firebase/database';
import { db, rtdb } from '@/firebase';
import { colors, spacing, radius } from '@/theme';
import { AdminHeader } from '@/components/AdminHeader';

interface Row { id: string; displayName?: string; totalKm?: number }

const MEDALS = ['#FFCF56', '#C0C0C0', '#CD7F32']; // gold / silver / bronze

export default function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [communityKm, setCommunityKm] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('totalKm', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => setRows(snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as object) }) as Row)));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(rtdb, 'community/totalKm'), (s) => setCommunityKm(Number(s.val()) || 0));
    return () => unsub();
  }, []);

  return (
    <View style={styles.c}>
      <AdminHeader title="טבלת מובילים" subtitle="המאמץ הקהילתי בזמן אמת" icon="trophy" />
      <View style={styles.body}>
        {/* Community km bank — hero card */}
        <View style={styles.bank}>
          <MaterialCommunityIcons name="fire" size={28} color={colors.gold} />
          <Text style={styles.bankNum}>{communityKm.toFixed(1)}</Text>
          <Text style={styles.bankLabel}>בנק הקילומטרים הקהילתי (ק"מ)</Text>
        </View>

        <FlashList
          data={rows}
          keyExtractor={(r) => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item, index }) => {
            const medal = MEDALS[index];
            return (
              <View style={[styles.row, medal && { borderColor: medal, borderWidth: 1.5 }]}>
                <View style={[styles.rankCircle, { backgroundColor: medal ?? colors.bg }]}>
                  {medal
                    ? <MaterialCommunityIcons name="medal" size={18} color="#fff" />
                    : <Text style={styles.rankTxt}>{index + 1}</Text>}
                </View>
                <Text style={styles.name} numberOfLines={1}>{item.displayName ?? 'מטייל/ת'}</Text>
                <Text style={styles.km}>{(item.totalKm ?? 0).toFixed(1)} ק"מ</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="trophy-outline" size={44} color={colors.line} />
              <Text style={styles.empty}>אין נתונים עדיין</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  body: { flex: 1, padding: spacing.md },
  bank: { alignItems: 'center', backgroundColor: colors.deepGreen, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  bankNum: { fontSize: 44, fontWeight: '900', color: colors.gold, marginTop: 4 },
  bankLabel: { color: '#fff', marginTop: 2, writingDirection: 'rtl' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#fff', borderRadius: radius.md, padding: 12, marginBottom: 8 },
  rankCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rankTxt: { fontWeight: '900', color: colors.muted, fontSize: 15 },
  name: { flex: 1, textAlign: 'right', color: colors.ink, fontWeight: '700', writingDirection: 'rtl' },
  km: { color: colors.forest, fontWeight: '800' },
  emptyWrap: { alignItems: 'center', marginTop: 60, gap: spacing.sm },
  empty: { textAlign: 'center', color: colors.muted, writingDirection: 'rtl' },
});
