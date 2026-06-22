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
  onWaze: (s: S) => void;
}>(function StationCarousel({ stations, activeIndex, onActiveChange, onPressCard, onWaze }, ref) {
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
      const s = stations[i];
      const v = valueTheme[s.value];
      // Debug: which card is selected + the highlight styles it should get.
      console.log('[Carousel] active →', { index: i, id: s.id, name: s.name, value: s.value,
        highlight: { color: v.color, tint: v.tint, border: '3px', scale: 1.05, opacity: 1, stripeW: 10 } });
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
        <Card key={s.id} s={s} index={i} x={x} active={i === activeIndex} onPress={() => onPressCard(s)} onWaze={() => onWaze(s)} />
      ))}
    </Animated.ScrollView>
  );
});

function Card({ s, index, x, active, onPress, onWaze }: { s: S; index: number; x: SharedValue<number>; active: boolean; onPress: () => void; onWaze: () => void }) {
  const v = valueTheme[s.value];
  // Scale only off scroll position (smooth zoom). NO opacity — the highlight is the colored
  // border/tint/scale on the active card; opacity-dimming read as "faded/stuck", so it's gone.
  const animStyle = useAnimatedStyle(() => {
    const d = x.value - index * SNAP;
    const scale = interpolate(d, [-SNAP, 0, SNAP], [0.86, 1.04, 0.86], Extrapolation.CLAMP);
    const translateY = interpolate(d, [-SNAP, 0, SNAP], [14, 0, 14], Extrapolation.CLAMP);
    return { transform: [{ scale }, { translateY }] };
  });

  // Log what THIS card renders as when its active state flips (debug card-change styling).
  React.useEffect(() => {
    console.log('[Card render]', { index, name: s.name, active, borderWidth: active ? 2.5 : 1, bg: active ? v.tint : '#fff', stripeW: active ? 10 : 5 });
  }, [active, index, s.name, v.tint]);

  return (
    <Animated.View style={[{ width: CARD_W }, animStyle]}>
      <View style={[
        styles.card,
        { opacity: active ? 1 : 0.82 },
        active
          ? { borderColor: v.color, borderWidth: 2.5, backgroundColor: v.tint, shadowColor: v.color, shadowOpacity: 0.4, shadowRadius: 14, elevation: 12 }
          : { borderColor: colors.line, borderWidth: 1, backgroundColor: '#fff', shadowOpacity: 0.08, shadowRadius: 5, elevation: 3 },
      ]}>
        <Pressable style={styles.press} onPress={onPress}>
        <View style={[styles.stripe, { backgroundColor: v.color, width: active ? 10 : 5 }]} />
        <View style={styles.inner}>
          <View style={styles.top}>
            <View style={[styles.icon, { backgroundColor: v.color }, active && styles.iconActive]}>
              <MaterialCommunityIcons name={v.icon as never} size={active ? 20 : 18} color="#fff" />
            </View>
            <Text style={[styles.name, active && { color: v.color }]} numberOfLines={1}>{s.number}. {s.name}</Text>
            {active && <View style={[styles.activeBadge, { backgroundColor: v.color }]}><MaterialCommunityIcons name="check" size={12} color="#fff" /></View>}
          </View>
          {s._distM != null && (
            <View style={styles.distRow}>
              <MaterialCommunityIcons name="map-marker-distance" size={13} color={colors.terracotta} />
              <Text style={styles.dist}>{(s._distM / 1000).toFixed(1)} ק"מ ממך</Text>
            </View>
          )}
          <View style={styles.bottomRow}>
            <Text style={styles.value} numberOfLines={1}>{v.label}</Text>
            <Pressable style={[styles.wazeBtn, { backgroundColor: v.color }]} onPress={onWaze} hitSlop={6}>
              <MaterialCommunityIcons name="navigation-variant" size={13} color="#fff" />
              <Text style={styles.wazeTxt}>ניווט</Text>
            </Pressable>
          </View>
        </View>
        </Pressable>
      </View>
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
  iconActive: { width: 38, height: 38, borderRadius: 19 },
  name: { flex: 1, fontWeight: '800', color: colors.ink, fontSize: 15, textAlign: 'right', writingDirection: 'rtl' },
  activeBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, direction: 'rtl' },
  dist: { color: colors.terracotta, fontWeight: '800', fontSize: 13 },
  bottomRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  value: { color: colors.muted, fontSize: 12, textAlign: 'right', writingDirection: 'rtl', flex: 1 },
  wazeBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  wazeTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
