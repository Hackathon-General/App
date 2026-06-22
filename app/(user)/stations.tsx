import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, valueTheme } from '@/theme';
import { content } from '@/content';
import { useContent, type Station, type ValueKey } from '@/content/ContentProvider';
import { StationSheet } from '@/components/StationSheet';
import { BottomSheet } from '@/components/BottomSheet';

type RegionFilter = 'all' | 'east' | 'west';
type ValueFilter = ValueKey | 'all';
type SortKey = 'order' | 'value';

export default function StationsScreen() {
  const insets = useSafeAreaInsets();
  const { stations } = useContent();
  const [region, setRegion] = useState<RegionFilter>('all');
  const [value, setValue] = useState<ValueFilter>('all');
  const [sort, setSort] = useState<SortKey>('order');
  const [selected, setSelected] = useState<Station | null>(null);

  const list = useMemo(() => {
    let xs = stations.slice();
    if (region !== 'all') xs = xs.filter((s) => s.region === region);
    if (value !== 'all') xs = xs.filter((s) => s.value === value);
    xs.sort((a, b) => (sort === 'order' ? a.number - b.number : a.value.localeCompare(b.value)));
    return xs;
  }, [stations, region, value, sort]);

  return (
    <View style={[styles.c, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.h}>{content.nav.allActivities}</Text>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          <Chip label="הכל" active={region === 'all'} onPress={() => setRegion('all')} color={colors.forest} />
          <Chip label={content.nav.eastRegion} active={region === 'east'} onPress={() => setRegion('east')} color={colors.forest} />
          <Chip label={content.nav.westRegion} active={region === 'west'} onPress={() => setRegion('west')} color={colors.forest} />
        </ScrollView>
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          <Chip label="כל הערכים" active={value === 'all'} onPress={() => setValue('all')} color={colors.terracotta} />
          {(Object.keys(valueTheme) as ValueKey[]).map((k) => (
            <Chip key={k} label={valueTheme[k].label} active={value === k} onPress={() => setValue(k)} color={valueTheme[k].color} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>מיון:</Text>
        <Chip label="לפי מסלול" active={sort === 'order'} onPress={() => setSort('order')} color={colors.deepGreen} small />
        <Chip label="לפי ערך" active={sort === 'value'} onPress={() => setSort('value')} color={colors.deepGreen} small />
      </View>

      <FlashList
        data={list}
        keyExtractor={(s) => s.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.md }}
        renderItem={({ item, index }) => {
          const v = valueTheme[item.value];
          const paid = item.paid === 'yes' ? 'בתשלום' : item.paid === 'symbolic' ? 'תשלום סמלי' : 'חינם';
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(350)}>
              <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.75}>
                {/* value color stripe */}
                <View style={[styles.stripe, { backgroundColor: v.color }]} />
                <View style={styles.cardInner}>
                  <View style={styles.cardTop}>
                    <View style={[styles.iconBadge, { backgroundColor: v.color }]}>
                      <MaterialCommunityIcons name={v.icon as never} size={18} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.number}. {item.name}</Text>
                      <Text style={styles.cardSub} numberOfLines={1}>{item.whatYouDo}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-left" size={22} color={colors.muted} />
                  </View>
                  <View style={styles.tagRow}>
                    <Tag label={v.label} color={v.color} solid />
                    <Tag label={item.region === 'east' ? 'מזרחי' : 'מערבי'} color={colors.deepGreen} />
                    <Tag label={paid} color={item.paid === 'no' ? colors.success : colors.terracotta} />
                    {item.needsBooking && <Tag label="בתיאום מראש" color={colors.muted} />}
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
      />

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)}>
        {selected && <StationSheet station={selected} onClose={() => setSelected(null)} />}
      </BottomSheet>
    </View>
  );
}

function Chip({ label, active, color, onPress, small }: { label: string; active: boolean; color: string; onPress: () => void; small?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, small && styles.chipSmall, { backgroundColor: active ? color : '#fff', borderColor: color }]}>
      <Text numberOfLines={1} style={[styles.chipTxt, { color: active ? '#fff' : color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Tag({ label, color, solid }: { label: string; color: string; solid?: boolean }) {
  return (
    <View style={[styles.tag, solid ? { backgroundColor: color } : { borderWidth: 1, borderColor: color }]}>
      <Text style={[styles.tagTxt, { color: solid ? '#fff' : color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  h: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center', marginBottom: spacing.sm, writingDirection: 'rtl' },
  filterBar: { height: 44, marginBottom: spacing.xs },
  row: { gap: spacing.sm, paddingHorizontal: spacing.md, alignItems: 'center' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  sortLabel: { color: colors.muted, fontWeight: '700' },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  chipSmall: { height: 30, paddingHorizontal: 10 },
  chipTxt: { fontWeight: '700', fontSize: 13 },
  // redesigned card
  card: { backgroundColor: '#fff', borderRadius: radius.md, marginBottom: spacing.sm, overflow: 'hidden', flexDirection: 'row', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  stripe: { width: 6 },
  cardInner: { flex: 1, padding: spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBadge: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontWeight: '800', color: colors.ink, textAlign: 'right', writingDirection: 'rtl', fontSize: 15 },
  cardSub: { color: colors.muted, fontSize: 13, textAlign: 'right', writingDirection: 'rtl', marginTop: 1 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  tagTxt: { fontSize: 11, fontWeight: '700' },
});
