import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { Circle } from 'react-native-maps';

/**
 * A map-level expanding radius ring (works reliably on the native map layer, unlike an
 * animated view nested inside a <Marker>). Drives a real <Circle> radius from `radius`→`radius*max`.
 * Uses the core RN Animated API (JS-driven) since radius isn't a transform.
 */
export function PulseCircle({ lat, lng, radius, color = '#2e7d32', max = 2.2 }: {
  lat: number; lng: number; radius: number; color?: string; max?: number;
}) {
  const p = useRef(new Animated.Value(0)).current;
  const [val, setVal] = React.useState(0);

  useEffect(() => {
    const id = p.addListener(({ value }) => setVal(value));
    const loop = Animated.loop(
      Animated.timing(p, { toValue: 1, duration: 1900, easing: Easing.out(Easing.cubic), useNativeDriver: false })
    );
    loop.start();
    return () => { loop.stop(); p.removeListener(id); };
  }, [p]);

  const r = radius * (1 + val * (max - 1));
  // fade opacity 0.45 → 0 as it expands
  const a = Math.max(0, 0.4 * (1 - val));
  const hex = (o: number) => Math.round(o * 255).toString(16).padStart(2, '0');

  return (
    <Circle
      center={{ latitude: lat, longitude: lng }}
      radius={r}
      strokeColor={`${color}${hex(a + 0.15)}`}
      fillColor={`${color}${hex(a * 0.4)}`}
      strokeWidth={2}
    />
  );
}
