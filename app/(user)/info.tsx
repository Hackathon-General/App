import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContent } from '@/content/ContentProvider';
import { colors, spacing, radius } from '@/theme';

interface Item { title: string; body: string }

/** מידע ותקנון — general info + regulations as collapsible cards. Live from content/info. */
export default function Info() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { info } = useContent();
  const [tab, setTab] = useState<'general' | 'rules'>(params.tab === 'rules' ? 'rules' : 'general');
  const [open, setOpen] = useState<number | null>(0);

  const general: Item[] = (info as any)?.generalInfo ?? [];
  const rules: Item[] = (info as any)?.regulations ?? [];
  const list = tab === 'general' ? general : rules;

  const switchTab = (t: 'general' | 'rules') => { Haptics.selectionAsync().catch(() => {}); setTab(t); setOpen(0); };

  return (
    <View style={styles.c}>
      <LinearGradient colors={[colors.forest, colors.deepGreen]} style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.back}><MaterialCommunityIcons name="chevron-right" size={26} color="#fff" /></TouchableOpacity>
        <Text style={styles.title}>מידע ותקנון</Text>
        <View style={styles.tabs}>
          <Tab label="מידע כללי" icon="information" active={tab === 'general'} onPress={() => switchTab('general')} />
          <Tab label="תקנון" icon="file-document" active={tab === 'rules'} onPress={() => switchTab('rules')} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {list.length === 0 && <Text style={styles.empty}>אין מידע זמין כרגע</Text>}
        {list.map((it, i) => (
          <TouchableOpacity key={i} activeOpacity={0.9} style={styles.card} onPress={() => { Haptics.selectionAsync().catch(() => {}); setOpen(open === i ? null : i); }}>
            <View style={styles.cardHead}>
              <MaterialCommunityIcons name={tab === 'rules' ? 'gavel' : 'lightbulb-on'} size={18} color={colors.terracotta} />
              <Text style={styles.cardTitle}>{it.title}</Text>
              <MaterialCommunityIcons name={open === i ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />
            </View>
            {open === i && <Text style={styles.cardBody}>{it.body}</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const Tab = ({ label, icon, active, onPress }: { label: string; icon: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
    <MaterialCommunityIcons name={icon as any} size={17} color={active ? colors.forest : 'rgba(255,255,255,0.9)'} />
    <Text style={[styles.tabTxt, active && { color: colors.forest }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { position: 'absolute', top: spacing.md, right: spacing.md, padding: 8, zIndex: 2 },
  title: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'right', writingDirection: 'rtl', marginBottom: spacing.md },
  tabs: { flexDirection: 'row-reverse', gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 10, borderRadius: radius.pill },
  tabActive: { backgroundColor: '#fff' },
  tabTxt: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.ink, textAlign: 'right', writingDirection: 'rtl' },
  cardBody: { fontSize: 14, lineHeight: 22, color: colors.muted, textAlign: 'right', writingDirection: 'rtl', marginTop: spacing.sm },
});
