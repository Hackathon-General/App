import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, onSnapshot } from '@react-native-firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/auth/AuthProvider';
import { colors, spacing, radius } from '@/theme';
import { content } from '@/content';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, role, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (s) => setProfile(s.data()));
    return () => unsub();
  }, [user?.uid]);

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.head}>
        {user?.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarTxt}>{(user?.displayName ?? 'מ')[0]}</Text>
          </View>
        )}
        <Text style={styles.name}>{user?.displayName ?? 'מטייל/ת אנונימי/ת'}</Text>
        {role === 'admin' && <Text style={styles.adminBadge}>מנהל/ת</Text>}
      </View>

      <View style={styles.stats}>
        <Stat num={(profile?.totalKm ?? 0).toFixed(1)} label='ק"מ שצברתי' />
        <Stat num={profile?.stationsVisited?.length ?? 0} label="תחנות שביקרתי" />
      </View>

      {role === 'admin' && (
        <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/(admin)/map')}>
          <Text style={styles.adminBtnTxt}>חמ"ל — God Mode</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutTxt}>התנתק/י</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>{content.footer}</Text>
    </ScrollView>
  );
}

function Stat({ num, label }: { num: string | number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statNum}>{num}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  head: { alignItems: 'center' },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.line },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest },
  avatarTxt: { color: '#fff', fontSize: 36, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: spacing.sm },
  adminBadge: { marginTop: 4, color: colors.terracotta, fontWeight: '700' },
  stats: { flexDirection: 'row-reverse', justifyContent: 'space-around', marginTop: spacing.xl },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 32, fontWeight: '900', color: colors.forest },
  statLabel: { fontSize: 13, color: colors.muted, marginTop: 2 },
  adminBtn: { backgroundColor: colors.deepGreen, paddingVertical: 14, borderRadius: radius.pill, alignItems: 'center', marginTop: spacing.xl },
  adminBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  signOut: { borderWidth: 1.5, borderColor: colors.danger, paddingVertical: 14, borderRadius: radius.pill, alignItems: 'center', marginTop: spacing.md },
  signOutTxt: { color: colors.danger, fontWeight: '700' },
  footer: { textAlign: 'center', color: colors.muted, marginTop: spacing.xl, fontSize: 12 },
});
