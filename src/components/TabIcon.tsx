import React, { useEffect } from 'react';
import type { ColorValue } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

const AIcon = Animated.createAnimatedComponent(MaterialCommunityIcons);

/** Tab-bar icon that grows + bolds when its tab is focused (fluid cubic, no bounce). */
export function TabIcon({ name, color, focused }: { name: any; color: ColorValue; focused: boolean }) {
  const p = useSharedValue(focused ? 1 : 0);
  useEffect(() => { p.value = withTiming(focused ? 1 : 0, { duration: 200, easing: Easing.out(Easing.cubic) }); }, [focused, p]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + p.value * 0.28 }, { translateY: -p.value * 2 }],
  }));

  return <AIcon name={name} color={color as string} size={24} style={style} />;
}
