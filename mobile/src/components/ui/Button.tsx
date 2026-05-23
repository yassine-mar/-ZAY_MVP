import { forwardRef, type ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { Spinner } from './Spinner';
import { colors, radii, spacing, typography } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: string;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<Variant, { bg: string; border: string; text: string }> = {
  primary:     { bg: colors.primary,     border: colors.primary,     text: colors.text.onPrimary },
  secondary:   { bg: colors.surface,     border: colors.borderStrong, text: colors.text.primary  },
  ghost:       { bg: 'transparent',      border: 'transparent',      text: colors.primary       },
  destructive: { bg: colors.feedback.error, border: colors.feedback.error, text: colors.text.onPrimary },
};

const SIZE_STYLES: Record<Size, { paddingV: number; paddingH: number; minHeight: number; fontSize: number }> = {
  sm: { paddingV: spacing.sm, paddingH: spacing.md, minHeight: 36, fontSize: 14 },
  md: { paddingV: 12,         paddingH: spacing.lg, minHeight: 48, fontSize: 16 },
  lg: { paddingV: spacing.md, paddingH: spacing.xl, minHeight: 56, fontSize: 17 },
};

export const Button = forwardRef<View, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    children,
    style,
    accessibilityLabel,
    ...rest
  },
  ref,
) {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];
  const isInteractive = !disabled && !loading;

  return (
    <Pressable
      ref={ref}
      disabled={!isInteractive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingVertical: s.paddingV,
          paddingHorizontal: s.paddingH,
          minHeight: s.minHeight,
          opacity: !isInteractive ? 0.5 : pressed ? 0.85 : 1,
          width: fullWidth ? '100%' : undefined,
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <Spinner color={v.text} />
      ) : (
        <>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          <Text
            style={[typography.button, { color: v.text, fontSize: s.fontSize }]}
            numberOfLines={1}
          >
            {children}
          </Text>
          {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
