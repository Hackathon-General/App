import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, radius } from '@/theme';
import { AdminHeader } from '@/components/AdminHeader';

const ITEMS: { route: string; title: string; sub: string; icon: any; color: string }[] = [
  { route: '/(admin)/inbox', title: 'תיבת פניות', sub: 'הרשמות, התנדבות, חיפוש צוות, יצירת קשר', icon: 'inbox-full', color: colors.terracotta },
  { route: '/(admin)/content', title: 'תחנות ותוכן', sub: 'הוספה ועריכה של תחנות השביל', icon: 'map-marker-multiple', color: colors.forest },
  { route: '/(admin)/event', title: 'בניית המרוץ', sub: 'קטגוריות, מקטעים, תחנות מים, לוח זמנים', icon: 'run', color: colors.deepGreen },
  { route: '/(admin)/info', title: 'מידע ותקנון', sub: 'מי אנחנו, מידע כללי, תקנון', icon: 'information', color: colors.sky },
  { route: '/(admin)/takehome', title: 'משימות המשך', sub: 'מסרי המשך לבית לפי תחנה/ערך', icon: 'home-heart', color: colors.mint },
  { route: '/(admin)/tests', title: 'בדיקות מערכת', sub: 'בדיקות קצה-לקצה לכל היכולות', icon: 'test-tube', color: colors.gold },
];

/** Admin "manage" hub — links to all content editors, keeping the tab bar uncluttered. */
export default function AdminManage() {
  return (
    <View style={styles.c}>
      <AdminHeader title="ניהול" subtitle="עריכת כל תוכן המערכת" icon="cog" />
      <ScrollView contentContainerStyle={{ padding: spacing.md }} showsVerticalScrollIndicator={false}>
        {ITEMS.map((it) => (
          <TouchableOpacity key={it.route} style={styles.card} activeOpacity={0.85} onPress={() => router.push(it.route as never)}>
            <View style={[styles.icon, { backgroundColor: it.color }]}>
              <MaterialCommunityIcons name={it.icon} size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{it.title}</Text>
              <Text style={styles.sub}>{it.sub}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.muted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  sub: { fontSize: 13, color: colors.muted, textAlign: 'right', writingDirection: 'rtl', marginTop: 2 },
});
