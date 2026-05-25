import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme';

interface Props {
  isOpen: boolean;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
}

/**
 * Large, finger-friendly open/closed toggle for the seller dashboard.
 * Wider than a native Switch — sellers tap it while their hands are wet
 * from cooking.
 */
export function AvailabilityToggle({ isOpen, onToggle, disabled }: Props) {
  const x = useSharedValue(isOpen ? 1 : 0);

  useEffect(() => { x.value = withTiming(isOpen ? 1 : 0, { duration: 220 }); }, [isOpen, x]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value * 56 }],
  }));

  return (
    <Pressable
      onPress={() => !disabled && onToggle(!isOpen)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: isOpen, disabled }}
      accessibilityLabel={isOpen ? 'Kitchen is open. Tap to close.' : 'Kitchen is closed. Tap to open.'}
      style={[
        styles.root,
        { backgroundColor: isOpen ? colors.feedback.success : colors.surfaceMuted },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Animated.View style={[styles.knob, knobStyle]} />
      <View style={styles.labelRow}>
        <Text
          variant="bodySmallMedium"
          style={{ color: isOpen ? colors.text.onPrimary : colors.text.secondary }}
        >
          Open
        </Text>
        <Text
          variant="bodySmallMedium"
          style={{ color: isOpen ? 'rgba(255,255,255,0.5)' : colors.text.primary }}
        >
          Closed
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    width: 112,
    height: 36,
    borderRadius: radii.full,
    padding: 3,
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 50,
    height: 30,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xs,
  },
});
