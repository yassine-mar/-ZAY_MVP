import { type ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '@/theme';

interface CardProps {
  children: ReactNode;
  variant?: 'flat' | 'elevated' | 'outlined';
  padding?: keyof typeof spacing;
  style?: ViewStyle;
}

export function Card({
  children,
  variant = 'flat',
  padding = 'md',
  style,
}: CardProps) {
  return (
    <View
      style={[
        styles.base,
        { padding: spacing[padding] },
        variant === 'elevated' && [styles.elevated, shadows.sm],
        variant === 'outlined' && styles.outlined,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
  },
  elevated: {},
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
  },
});
