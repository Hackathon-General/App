import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, interpolate } from 'react-native-reanimated';

/**
 * Expanding radius ring(s) — a fluid (non-bouncy) pulse used to draw attention to a marker
 * (highlighted station, live SOS, active NFR task). Pure cubic easing, looped.
 */
export function PulseRing({ size = 64, color = '#2e7d32', rings = 2 }: { size?: number; color?: string; rings?: number }) {
  return (
    <>
      {Array.from({ length: rings }).map((_, i) => (
        <Ring key={i} size={size} color={color} delay={(i * 1100) / rings} />
      ))}
    </>
  );
}

function Ring({ size, color, delay }: { size: number; color: string; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }), -1, false);
  }, [p]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(p.value, [0, 1], [0.35, 1]) }],
    opacity: interpolate(p.value, [0, 0.15, 1], [0, 0.5, 0]),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: color }, style]}
    />
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 2, backgroundColor: 'transparent' },
});
