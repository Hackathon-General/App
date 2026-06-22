import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContent } from '@/content/ContentProvider';
import { colors, spacing, radius } from '@/theme';

/** מי אנחנו — association story + steering team. Content from content/info (live) w/ JSON fallback. */
export default function About() {
  const insets = useSafeAreaInsets();
  const { info, events } = useContent();
  const about = (info as any)?.about ?? {};
  const team = (info as any)?.team ?? (events as any)?.association?.team ?? [];
  const activities: string[] = about.activities ?? (events as any)?.association?.activities ?? [];

  return (
    <View style={styles.c}>
      <LinearGradient colors={[colors.forest, colors.deepGreen]} style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.back}><MaterialCommunityIcons name="chevron-right" size={26} color="#fff" /></TouchableOpacity>
        <MaterialCommunityIcons name="heart" size={26} color="rgba(255,255,255,0.9)" />
        <Text style={styles.title}>{about.title ?? 'מי אנחנו'}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.body}>{about.body ?? ''}</Text>
        </View>

        {activities.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>פעילויות העמותה</Text>
            <View style={styles.card}>
              {activities.map((a, i) => (
                <View key={i} style={styles.bulletRow}>
                  <MaterialCommunityIcons name="circle-medium" size={20} color={colors.terracotta} />
                  <Text style={styles.bullet}>{a}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {team.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>ועדת ההיגוי</Text>
            {team.map((m: any, i: number) => (
              <View key={i} style={styles.member}>
                <View style={styles.avatar}><Text style={styles.avatarTxt}>{(m.name ?? '?').charAt(0)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.name}</Text>
                  <Text style={styles.memberRole}>{m.role}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, alignItems: 'flex-end' },
  back: { position: 'absolute', top: spacing.md, right: spacing.md, padding: 8 },
  title: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'right', writingDirection: 'rtl', marginTop: spacing.xs },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  body: { fontSize: 15, lineHeight: 24, color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: colors.forest, textAlign: 'right', writingDirection: 'rtl', marginBottom: spacing.sm },
  bulletRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 2, marginBottom: 4 },
  bullet: { fontSize: 14, color: colors.ink, textAlign: 'right', writingDirection: 'rtl', flex: 1 },
  member: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.md, backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 20, fontWeight: '900', color: colors.deepGreen },
  memberName: { fontSize: 16, fontWeight: '800', color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  memberRole: { fontSize: 13, color: colors.muted, textAlign: 'right', writingDirection: 'rtl', marginTop: 2 },
});
