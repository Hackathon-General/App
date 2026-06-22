import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, orderBy, limit, onSnapshot } from '@react-native-firebase/firestore';
import { ref, onValue } from '@react-native-firebase/database';
import { db, rtdb } from '@/firebase';
import { colors, spacing, radius } from '@/theme';

interface Row { id: string; displayName?: string; totalKm?: number }

export default function Leaderboard() {
  const insets = useSafeAreaInsets();
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
    <View style={[styles.c, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.h}>טבלת מובילים</Text>
      <View style={styles.bank}>
        <Text style={styles.bankNum}>{communityKm.toFixed(1)}</Text>
        <Text style={styles.bankLabel}>בנק הקילומטרים הקהילתי</Text>
      </View>
      <FlashList
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>{index + 1}</Text>
            <Text style={styles.name}>{item.displayName ?? 'מטייל/ת'}</Text>
            <Text style={styles.km}>{(item.totalKm ?? 0).toFixed(1)} ק"מ</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>אין נתונים עדיין</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  h: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  bank: { alignItems: 'center', backgroundColor: colors.deepGreen, borderRadius: radius.md, padding: spacing.lg, marginVertical: spacing.md },
  bankNum: { fontSize: 40, fontWeight: '900', color: colors.gold },
  bankLabel: { color: '#fff', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.sm, padding: 14, marginBottom: 8 },
  rank: { width: 28, fontWeight: '900', color: colors.terracotta, fontSize: 16 },
  name: { flex: 1, textAlign: 'right', color: colors.ink, fontWeight: '600' },
  km: { color: colors.forest, fontWeight: '800' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40 },
});
