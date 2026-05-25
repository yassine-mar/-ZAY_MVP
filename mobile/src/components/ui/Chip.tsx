import { Pressable, View, StyleSheet, type ViewStyle } from 'react-native';
import { type ReactNode } from 'react';
import { Text } from './Text';
import { colors, radii, spacing } from '@/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leftIcon?: ReactNode;
  style?: ViewStyle;
}

/**
 * Selectable pill — used for category filters on Search, status filters
 * on Orders, etc.
 */
export function Chip({ label, selected = false, onPress, leftIcon, style }: ChipProps) {
  const interactive = !!onPress;

  return (
    <Pressable
      onPress={onPress}
      disabled={!interactive}
      accessibilityRole={interactive ? 'button' : undefined}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.root,
        selected ? styles.selected : styles.idle,
        pressed && interactive ? { opacity: 0.7 } : null,
        style,
      ]}
    >
      {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
      <Text
        variant="bodySmallMedium"
        color={selected ? 'text.onPrimary' : 'text.primary'}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  idle: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
