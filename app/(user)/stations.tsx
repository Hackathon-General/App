import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, valueTheme } from '@/theme';
import { stations, content, type Station, type ValueKey } from '@/content';
import { StationSheet } from '@/components/StationSheet';
import { BottomSheet } from '@/components/BottomSheet';

type RegionFilter = 'all' | 'east' | 'west';
type ValueFilter = ValueKey | 'all';
type SortKey = 'order' | 'value';

export default function StationsScreen() {
  const insets = useSafeAreaInsets();
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
  }, [region, value, sort]);

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
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).springify()}>
            <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.7}>
              <View style={[styles.dot, { backgroundColor: valueTheme[item.value].color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.number}. {item.name}</Text>
                <Text style={styles.cardSub} numberOfLines={1}>{item.whatYouDo}</Text>
              </View>
              <Text style={styles.valueTag}>{valueTheme[item.value].label}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
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

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, direction: 'rtl' },
  h: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center', marginBottom: spacing.sm },
  filterBar: { height: 44, marginBottom: spacing.xs },
  row: { gap: spacing.sm, paddingHorizontal: spacing.md, alignItems: 'center' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  sortLabel: { color: colors.muted, fontWeight: '700' },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  chipSmall: { height: 30, paddingHorizontal: 10 },
  chipTxt: { fontWeight: '700', fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#fff', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  dot: { width: 14, height: 14, borderRadius: 7 },
  cardTitle: { fontWeight: '700', color: colors.ink, textAlign: 'right' },
  cardSub: { color: colors.muted, fontSize: 13, textAlign: 'right' },
  valueTag: { fontSize: 11, color: colors.muted },
});
