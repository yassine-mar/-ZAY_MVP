import { forwardRef, useState, type ReactNode } from 'react';
import {
  TextInput,
  type TextInputProps,
  View,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';

export interface InputProps extends TextInputProps {
  invalid?: boolean;
  leftAdornment?: ReactNode;
  rightAdornment?: ReactNode;
  containerStyle?: ViewStyle;
}

/**
 * Low-level styled TextInput. Knows nothing about RHF; FormInput wraps it.
 * Border color animates between idle / focus / error states.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    invalid = false,
    leftAdornment,
    rightAdornment,
    containerStyle,
    style,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = invalid
    ? colors.feedback.error
    : isFocused
    ? colors.borderFocus
    : colors.border;

  return (
    <View
      style={[
        styles.container,
        { borderColor },
        invalid && styles.invalid,
        containerStyle,
      ]}
    >
      {leftAdornment ? <View style={styles.adornment}>{leftAdornment}</View> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.text.tertiary}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        style={[styles.input, style]}
        onFocus={(e) => { setIsFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setIsFocused(false); onBlur?.(e); }}
        {...rest}
      />
      {rightAdornment ? <View style={styles.adornment}>{rightAdornment}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  invalid: {
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
    // Remove the default Android underline that occasionally renders on
    // older OEMs even with borderWidth on the parent.
    includeFontPadding: false,
  },
  adornment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
});
