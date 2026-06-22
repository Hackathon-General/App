import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, onSnapshot } from '@react-native-firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/auth/AuthProvider';
import { colors, spacing, radius } from '@/theme';
import { content, stations } from '@/content';
import { useTakeHome, type TakeHomeRule } from '@/features/takeHome/useTakeHome';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, role, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const { completeTrail } = useTakeHome();
  const [takeHome, setTakeHome] = useState<TakeHomeRule[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (s) => setProfile(s.data()));
    return () => unsub();
  }, [user?.uid]);

  const onCompleteTrail = async () => {
    const visited: string[] = profile?.stationsVisited?.length
      ? profile.stationsVisited
      : stations.map((s) => s.id); // fallback: all stations for demo
    try {
      const matched = await completeTrail(visited);
      setTakeHome(matched);
      if (matched.length === 0) Alert.alert('סיימת את הטיול! 🎉', 'תודה שצעדת בדרכן.');
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? '');
    }
  };

  const visitedCount = profile?.stationsVisited?.length ?? 0;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Gradient hero */}
        <View style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
          <LinearGradient colors={[colors.forest, colors.deepGreen]} style={StyleSheet.absoluteFill} />
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarTxt}>{(user?.displayName ?? 'מ')[0]}</Text>
            </View>
          )}
          <Text style={styles.name}>{user?.displayName ?? 'מטייל/ת אנונימי/ת'}</Text>
          {role === 'admin' && (
            <View style={styles.adminBadge}>
              <MaterialCommunityIcons name="shield-crown" size={14} color={colors.ink} />
              <Text style={styles.adminBadgeTxt}>מנהל/ת</Text>
            </View>
          )}
        </View>

        {/* Stat cards (overlap hero) */}
        <View style={styles.stats}>
          <StatCard icon="map-marker-distance" num={(profile?.totalKm ?? 0).toFixed(1)} label='ק"מ שצברתי' color={colors.terracotta} />
          <StatCard icon="flag-checkered" num={`${visitedCount}/${stations.length}`} label="תחנות שביקרתי" color={colors.forest} />
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.completeBtn} activeOpacity={0.85}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); onCompleteTrail(); }}>
            <MaterialCommunityIcons name="gift" size={18} color="#fff" />
            <Text style={styles.completeTxt}>סיימתי את הטיול — קבל משימת המשך</Text>
          </TouchableOpacity>

          {takeHome.map((t, i) => (
            <Animated.View key={t.id} entering={FadeInDown.delay(i * 60).springify()}>
              <TouchableOpacity style={styles.takeHomeCard} activeOpacity={0.8}
                onPress={() => t.link && Linking.openURL(t.link)}>
                <View style={styles.takeHomeIcon}><MaterialCommunityIcons name="hand-heart" size={18} color={colors.mint} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.takeHomeTitle}>{t.title ?? 'משימת המשך'}</Text>
                  {!!t.description && <Text style={styles.takeHomeDesc}>{t.description}</Text>}
                  {!!t.link && <Text style={styles.takeHomeLink}>פתח קישור ↗</Text>}
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}

          {role === 'admin' && (
            <TouchableOpacity style={styles.adminBtn} activeOpacity={0.85} onPress={() => router.push('/(admin)/map')}>
              <MaterialCommunityIcons name="map-marker-radius" size={18} color="#fff" />
              <Text style={styles.adminBtnTxt}>חמ"ל — God Mode</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.signOut} activeOpacity={0.85} onPress={signOut}>
            <MaterialCommunityIcons name="logout" size={18} color={colors.danger} />
            <Text style={styles.signOutTxt}>התנתק/י</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>{content.footer}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, num, label, color }: { icon: any; num: string | number; label: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon} size={20} color="#fff" />
      </View>
      <Text style={styles.statNum}>{num}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  hero: { alignItems: 'center', paddingBottom: spacing.xl + spacing.lg, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.line, borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.terracotta },
  avatarTxt: { color: '#fff', fontSize: 38, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: spacing.sm, writingDirection: 'rtl' },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: colors.gold, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill },
  adminBadgeTxt: { color: colors.ink, fontWeight: '800', fontSize: 12 },
  stats: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginTop: -spacing.xl, paddingHorizontal: spacing.lg },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statNum: { fontSize: 26, fontWeight: '900', color: colors.ink },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2, writingDirection: 'rtl' },
  section: { padding: spacing.lg },
  completeBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: colors.terracotta, paddingVertical: 15, borderRadius: radius.pill, marginTop: spacing.sm },
  completeTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  takeHomeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, borderStartWidth: 4, borderStartColor: colors.mint },
  takeHomeIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  takeHomeTitle: { fontWeight: '800', color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  takeHomeDesc: { color: colors.muted, marginTop: 2, textAlign: 'right', writingDirection: 'rtl' },
  takeHomeLink: { color: colors.forest, fontWeight: '700', marginTop: 6, textAlign: 'right' },
  adminBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: colors.deepGreen, paddingVertical: 15, borderRadius: radius.pill, marginTop: spacing.md },
  adminBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  signOut: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.danger, paddingVertical: 14, borderRadius: radius.pill, marginTop: spacing.md },
  signOutTxt: { color: colors.danger, fontWeight: '700' },
  footer: { textAlign: 'center', color: colors.muted, marginTop: spacing.xl, fontSize: 12 },
});
