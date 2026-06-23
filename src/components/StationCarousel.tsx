import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, interpolateColor, Extrapolation, runOnJS, type SharedValue } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, valueTheme } from '@/theme';
import type { Station } from '@/content/ContentProvider';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.72;
const GAP = spacing.sm;
const SNAP = CARD_W + GAP;            // each card slot = card + its left/right half-gaps
const SIDE = (SCREEN_W - CARD_W) / 2 - GAP / 2; // pad so card 0 is screen-centered at offset 0

type S = Station & { _distM?: number };

export interface CarouselHandle { scrollToId: (id: string) => void }

/**
 * Snap-scrolling station carousel. The centered card scales up AND gets a persistent colored
 * highlight (border + glow + badge). Emits the active station live during the drag so the map
 * marker zoom and card highlight stay in sync. Exposes scrollToIndex so tapping a marker
 * recenters the carousel on that station.
 */
export const StationCarousel = forwardRef<CarouselHandle, {
  stations: S[];
  activeId: string | null;
  onActiveChange: (id: string, settled: boolean) => void;
  onPressCard: (s: S) => void;
  onWaze: (s: S) => void;
}>(function StationCarousel({ stations, activeId, onActiveChange, onPressCard, onWaze }, ref) {
  const x = useSharedValue(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const lastId = useRef<string | null>(activeId);
  // Always read the CURRENT order inside callbacks (the list re-sorts by proximity as you move).
  const stationsRef = useRef(stations);
  stationsRef.current = stations;

  useImperativeHandle(ref, () => ({
    scrollToId: (id: string) => {
      const i = stationsRef.current.findIndex((s) => s.id === id);
      if (i < 0) return;
      lastId.current = id;
      scrollRef.current?.scrollTo({ x: i * SNAP, animated: true });
    },
  }), []);

  // Resolve the centered SLOT → station id in the CURRENT order; report by id.
  // `settled` = scroll has stopped (map may pan); live frames only update the highlight.
  const report = (offset: number, settled: boolean) => {
    const idx = Math.max(0, Math.min(stationsRef.current.length - 1, Math.round(offset / SNAP)));
    const s = stationsRef.current[idx];
    if (!s) return;
    if (s.id !== lastId.current) {
      lastId.current = s.id;
      Haptics.selectionAsync().catch(() => {});
      onActiveChange(s.id, settled);
    } else if (settled) {
      onActiveChange(s.id, true); // same card but now settled → let the map pan
    }
  };

  const dragging = useRef(false);
  const scrollHandler = useAnimatedScrollHandler({
    // Live: update highlight every frame (map marker tracks the card). Settle: allow map pan.
    onScroll: (e) => { x.value = e.contentOffset.x; runOnJS(report)(e.contentOffset.x, false); },
    onBeginDrag: () => { runOnJS(setDragging)(true); },
    onMomentumEnd: (e) => { runOnJS(setDragging)(false); runOnJS(report)(e.contentOffset.x, true); },
    onEndDrag: (e) => { runOnJS(report)(e.contentOffset.x, true); },
  });
  function setDragging(v: boolean) { dragging.current = v; }

  // Keep the active card centered on screen — when its slot changes (marker tap, or the
  // proximity re-sort moves it) and the user isn't mid-drag, scroll it back to center.
  const activeSlot = activeId ? stations.findIndex((s) => s.id === activeId) : -1;
  useEffect(() => {
    if (activeSlot < 0 || dragging.current) return;
    const t = setTimeout(() => scrollRef.current?.scrollTo({ x: activeSlot * SNAP, animated: true }), 50);
    return () => clearTimeout(t);
  }, [activeSlot]);

  return (
    <Animated.ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={SNAP}
      decelerationRate="fast"
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      contentContainerStyle={{ paddingHorizontal: SIDE }}
    >
      {stations.map((s, i) => (
        <Card key={s.id} s={s} index={i} x={x} active={s.id === activeId} onPress={() => onPressCard(s)} onWaze={() => onWaze(s)} />
      ))}
    </Animated.ScrollView>
  );
});

function Card({ s, index, x, active, onPress, onWaze }: { s: S; index: number; x: SharedValue<number>; active: boolean; onPress: () => void; onWaze: () => void }) {
  const v = valueTheme[s.value];
  // EVERYTHING is driven by scroll position so the visually-centered card is ALWAYS the
  // highlighted one — no state-sync lag, no mismatch between zoom and highlight.
  const animStyle = useAnimatedStyle(() => {
    const d = x.value - index * SNAP;
    const scale = interpolate(d, [-SNAP, 0, SNAP], [0.8, 1.12, 0.8], Extrapolation.CLAMP);
    const translateY = interpolate(d, [-SNAP, 0, SNAP], [22, 0, 22], Extrapolation.CLAMP);
    const opacity = interpolate(Math.abs(d), [0, SNAP * 0.5, SNAP], [1, 0.85, 0.55], Extrapolation.CLAMP);
    return { transform: [{ scale }, { translateY }], opacity };
  });
  const cardStyle = useAnimatedStyle(() => {
    const c = interpolate(Math.abs(x.value - index * SNAP), [0, SNAP * 0.45], [1, 0], Extrapolation.CLAMP); // 1 = centered
    return {
      borderColor: interpolateColor(c, [0, 1], [colors.line, v.color]),
      backgroundColor: interpolateColor(c, [0, 1], ['#ffffff', v.tint]),
      borderWidth: 1 + c * 2,
      shadowColor: v.color,
      shadowOpacity: 0.06 + c * 0.44,
      shadowRadius: 4 + c * 14,
    };
  });

  return (
    <Animated.View style={[{ width: CARD_W, marginHorizontal: GAP / 2 }, animStyle]}>
      <Animated.View style={[styles.card, cardStyle]}>
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
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.lg, borderColor: 'transparent', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, elevation: 6 },
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
