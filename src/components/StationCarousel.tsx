import React, { useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolation, runOnJS, type SharedValue } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, valueTheme } from '@/theme';
import type { Station } from '@/content/ContentProvider';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.72;
const GAP = spacing.sm;
const SNAP = CARD_W + GAP;
const SIDE = (SCREEN_W - CARD_W) / 2;

type S = Station & { _distM?: number };

/**
 * Snap-scrolling station carousel. As you swipe, the centered card scales up and the map
 * zooms to that station (onSnap). Tap a card to open its sheet.
 */
export function StationCarousel({ stations, onSnapTo, onPressCard }: {
  stations: S[];
  onSnapTo: (s: S) => void;
  onPressCard: (s: S) => void;
}) {
  const x = useSharedValue(0);
  const lastIndex = useRef(-1);

  const notify = (i: number) => {
    if (i !== lastIndex.current && stations[i]) {
      lastIndex.current = i;
      Haptics.selectionAsync().catch(() => {});
      onSnapTo(stations[i]);
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { x.value = e.contentOffset.x; },
    onMomentumEnd: (e) => {
      const i = Math.round(e.contentOffset.x / SNAP);
      runOnJS(notify)(i);
    },
  });

  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={SNAP}
      decelerationRate="fast"
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingHorizontal: SIDE, gap: GAP }}
    >
      {stations.map((s, i) => (
        <Card key={s.id} s={s} index={i} x={x} onPress={() => onPressCard(s)} />
      ))}
    </Animated.ScrollView>
  );
}

function Card({ s, index, x, onPress }: { s: S; index: number; x: SharedValue<number>; onPress: () => void }) {
  const v = valueTheme[s.value];
  const animStyle = useAnimatedStyle(() => {
    const pos = index * SNAP;
    const d = x.value - pos;
    const scale = interpolate(d, [-SNAP, 0, SNAP], [0.9, 1, 0.9], Extrapolation.CLAMP);
    const opacity = interpolate(d, [-SNAP, 0, SNAP], [0.6, 1, 0.6], Extrapolation.CLAMP);
    const translateY = interpolate(d, [-SNAP, 0, SNAP], [10, 0, 10], Extrapolation.CLAMP);
    return { transform: [{ scale }, { translateY }], opacity };
  });

  return (
    <Animated.View style={[{ width: CARD_W }, animStyle]}>
      <Pressable style={styles.card} onPress={onPress}>
        <View style={[styles.stripe, { backgroundColor: v.color }]} />
        <View style={styles.inner}>
          <View style={styles.top}>
            <View style={[styles.icon, { backgroundColor: v.color }]}>
              <MaterialCommunityIcons name={v.icon as never} size={18} color="#fff" />
            </View>
            <Text style={styles.name} numberOfLines={1}>{s.number}. {s.name}</Text>
          </View>
          {s._distM != null && (
            <View style={styles.distRow}>
              <MaterialCommunityIcons name="map-marker-distance" size={13} color={colors.terracotta} />
              <Text style={styles.dist}>{(s._distM / 1000).toFixed(1)} ק"מ ממך</Text>
            </View>
          )}
          <Text style={styles.value} numberOfLines={1}>{v.label}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: radius.lg, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6, direction: 'rtl' },
  stripe: { width: 6 },
  inner: { flex: 1, padding: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, direction: 'rtl' },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontWeight: '800', color: colors.ink, fontSize: 15, textAlign: 'right', writingDirection: 'rtl' },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, direction: 'rtl' },
  dist: { color: colors.terracotta, fontWeight: '800', fontSize: 13 },
  value: { color: colors.muted, fontSize: 12, textAlign: 'right', marginTop: 2, writingDirection: 'rtl' },
});
