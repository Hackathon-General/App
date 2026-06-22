import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';

// Fluid, non-bouncy easing for the sheet.
const OPEN = { duration: 320, easing: Easing.out(Easing.cubic) };
const CLOSE = { duration: 240, easing: Easing.in(Easing.cubic) };
import { colors, radius } from '@/theme';

const { height: SCREEN_H } = Dimensions.get('window');

/**
 * Animated, drag-to-dismiss bottom sheet.
 * - Springs up on mount, fades the backdrop in.
 * - Drag down past a threshold (or fling) to close; otherwise snaps back.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const translateY = useSharedValue(SCREEN_H);

  useEffect(() => {
    translateY.value = visible ? withTiming(0, OPEN) : withTiming(SCREEN_H, CLOSE);
  }, [visible]);

  const pan = Gesture.Pan()
    .onChange((e) => {
      translateY.value = Math.max(0, translateY.value + e.changeY);
    })
    .onEnd((e) => {
      if (translateY.value > 140 || e.velocityY > 800) {
        translateY.value = withTiming(SCREEN_H, CLOSE, () => runOnJS(onClose)());
      } else {
        translateY.value = withTiming(0, OPEN);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, SCREEN_H], [1, 0], Extrapolation.CLAMP),
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <Animated.View style={styles.handle} />
          {children}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: 8,
    maxHeight: '82%',
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line, marginBottom: 8 },
});
