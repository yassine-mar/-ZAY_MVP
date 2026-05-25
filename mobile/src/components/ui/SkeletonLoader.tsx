import { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, radii } from '@/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Pulsing placeholder block. Used as the loading state on every list and
 * detail screen so the UI never collapses to a spinner — the user sees
 * the shape of what's coming.
 *
 * Uses Reanimated's UI-thread animation so it stays smooth even when the
 * JS thread is busy parsing the eventual response.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radii.sm,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.base,
        animated,
        { width, height, borderRadius },
        style,
      ]}
    />
  );
}

interface SkeletonRowsProps {
  count: number;
  height?: number;
  gap?: number;
  style?: ViewStyle;
}

export function SkeletonList({
  count,
  height = 80,
  gap = 12,
  style,
}: SkeletonRowsProps) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} borderRadius={radii.lg} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceMuted,
  },
});
