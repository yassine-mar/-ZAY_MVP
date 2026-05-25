import { Pressable, View, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme';

interface Props {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 50,
  size = 'md',
}: Props) {
  const decDisabled = value <= min;
  const incDisabled = value >= max;
  const btn = size === 'sm' ? 32 : 36;
  const iconSize = size === 'sm' ? 14 : 16;

  return (
    <View style={styles.root}>
      <Pressable
        onPress={() => !decDisabled && onChange(value - 1)}
        disabled={decDisabled}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        hitSlop={6}
        style={({ pressed }) => [
          styles.btn,
          { width: btn, height: btn },
          decDisabled && styles.btnDisabled,
          pressed && !decDisabled && styles.btnPressed,
        ]}
      >
        <Minus size={iconSize} color={decDisabled ? colors.text.tertiary : colors.text.primary} />
      </Pressable>

      <Text variant="bodyBold" style={[styles.value, size === 'sm' && { minWidth: 20 }]} accessibilityLabel={`Quantity ${value}`}>
        {value}
      </Text>

      <Pressable
        onPress={() => !incDisabled && onChange(value + 1)}
        disabled={incDisabled}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        hitSlop={6}
        style={({ pressed }) => [
          styles.btn,
          { width: btn, height: btn },
          incDisabled && styles.btnDisabled,
          pressed && !incDisabled && styles.btnPressed,
        ]}
      >
        <Plus size={iconSize} color={incDisabled ? colors.text.tertiary : colors.text.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  btn: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
  },
  btnPressed: { opacity: 0.6 },
  value: {
    minWidth: 24,
    textAlign: 'center',
  },
});
