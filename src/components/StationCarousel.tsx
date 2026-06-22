import React, { useRef, useImperativeHandle, forwardRef } from 'react';
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

export interface CarouselHandle { scrollToIndex: (i: number) => void }

/**
 * Snap-scrolling station carousel. The centered card scales up AND gets a persistent colored
 * highlight (border + glow + badge). Emits the active station live during the drag so the map
 * marker zoom and card highlight stay in sync. Exposes scrollToIndex so tapping a marker
 * recenters the carousel on that station.
 */
export const StationCarousel = forwardRef<CarouselHandle, {
  stations: S[];
  activeIndex: number;
  onActiveChange: (i: number) => void;
  onPressCard: (s: S) => void;
}>(function StationCarousel({ stations, activeIndex, onActiveChange, onPressCard }, ref) {
  const x = useSharedValue(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const lastIndex = useRef(activeIndex);

  useImperativeHandle(ref, () => ({
    scrollToIndex: (i: number) => {
      lastIndex.current = i;
      scrollRef.current?.scrollTo({ x: i * SNAP, animated: true });
    },
  }), []);

  const notify = (i: number) => {
    if (i !== lastIndex.current && stations[i]) {
      lastIndex.current = i;
      Haptics.selectionAsync().catch(() => {});
      onActiveChange(i);
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      x.value = e.contentOffset.x;
      // live highlight + map sync mid-drag (not only on momentum end)
      runOnJS(notify)(Math.round(e.contentOffset.x / SNAP));
    },
  });

  return (
    <Animated.ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={SNAP}
      decelerationRate="fast"
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingHorizontal: SIDE, gap: GAP }}
    >
      {stations.map((s, i) => (
        <Card key={s.id} s={s} index={i} x={x} active={i === activeIndex} onPress={() => onPressCard(s)} />
      ))}
    </Animated.ScrollView>
  );
});

function Card({ s, index, x, active, onPress }: { s: S; index: number; x: SharedValue<number>; active: boolean; onPress: () => void }) {
  const v = valueTheme[s.value];
  // Outer transform/opacity. A flat plateau around center keeps the selected card FULLY opaque
  // and biggest even when the resting offset is a few px off exact-center; neighbors shrink + dim.
  const animStyle = useAnimatedStyle(() => {
    const d = x.value - index * SNAP;
    const scale = interpolate(d, [-SNAP, -SNAP * 0.35, 0, SNAP * 0.35, SNAP], [0.82, 0.97, 1.04, 0.97, 0.82], Extrapolation.CLAMP);
    const opacity = interpolate(d, [-SNAP, -SNAP * 0.35, 0, SNAP * 0.35, SNAP], [0.5, 1, 1, 1, 0.5], Extrapolation.CLAMP);
    const translateY = interpolate(d, [-SNAP, 0, SNAP], [18, 0, 18], Extrapolation.CLAMP);
    return { transform: [{ scale }, { translateY }], opacity };
  });
  // Inner card: colored border + glow animate with scroll position so the CENTERED card is
  // always the highlighted one (no lag from controlled state).
  const cardStyle = useAnimatedStyle(() => {
    const center = interpolate(x.value - index * SNAP, [-SNAP * 0.5, 0, SNAP * 0.5], [0, 1, 0], Extrapolation.CLAMP);
    return { borderWidth: 1 + center * 2, shadowOpacity: 0.1 + center * 0.3, shadowRadius: 6 + center * 12 };
  });

  return (
    <Animated.View style={[{ width: CARD_W }, animStyle]}>
      <Animated.View style={[styles.card, { borderColor: v.color, shadowColor: v.color }, cardStyle]}>
        <Pressable style={styles.press} onPress={onPress}>
        <View style={[styles.stripe, { backgroundColor: v.color }]} />
        <View style={styles.inner}>
          <View style={styles.top}>
            <View style={[styles.icon, { backgroundColor: v.color }]}>
              <MaterialCommunityIcons name={v.icon as never} size={18} color="#fff" />
            </View>
            <Text style={styles.name} numberOfLines={1}>{s.number}. {s.name}</Text>
            {active && <View style={[styles.activeDot, { backgroundColor: v.color }]} />}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.lg, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  press: { flexDirection: 'row', borderRadius: radius.lg, overflow: 'hidden', direction: 'rtl' },
  stripe: { width: 6 },
  inner: { flex: 1, padding: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, direction: 'rtl' },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontWeight: '800', color: colors.ink, fontSize: 15, textAlign: 'right', writingDirection: 'rtl' },
  activeDot: { width: 9, height: 9, borderRadius: 5 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, direction: 'rtl' },
  dist: { color: colors.terracotta, fontWeight: '800', fontSize: 13 },
  value: { color: colors.muted, fontSize: 12, textAlign: 'right', marginTop: 2, writingDirection: 'rtl' },
});
