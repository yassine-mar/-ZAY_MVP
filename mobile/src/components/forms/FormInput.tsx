import { type ComponentProps, type ReactNode, forwardRef } from 'react';
import { View, StyleSheet, type TextInput } from 'react-native';
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme';

interface FormInputProps<T extends FieldValues>
  extends Omit<ComponentProps<typeof Input>, 'value' | 'onChangeText' | 'onBlur'> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  helper?: string;
  rightAdornment?: ReactNode;
}

/**
 * RHF Controller + label + error wrapper.
 * Every form field in the app goes through this — error display logic
 * lives in exactly one place.
 *
 * Generic so `name` is constrained to the form's actual field paths.
 */
function _FormInput<T extends FieldValues>(
  {
    control,
    name,
    label,
    helper,
    rightAdornment,
    ...inputProps
  }: FormInputProps<T>,
  ref: React.Ref<TextInput>,
) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <View style={styles.root}>
          {label ? (
            <Text variant="bodySmallMedium" color="text.primary" style={styles.label}>
              {label}
            </Text>
          ) : null}
          <Input
            ref={ref}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            invalid={!!error}
            rightAdornment={rightAdornment}
            accessibilityLabel={label}
            {...inputProps}
          />
          {error ? (
            <Text variant="caption" color="feedback.error" style={styles.message}>
              {error.message}
            </Text>
          ) : helper ? (
            <Text variant="caption" color="text.secondary" style={styles.message}>
              {helper}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}

// forwardRef preserves the TextInput ref through the generic boundary.
export const FormInput = forwardRef(_FormInput) as <T extends FieldValues>(
  props: FormInputProps<T> & { ref?: React.Ref<TextInput> },
) => ReturnType<typeof _FormInput>;

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  label: { marginBottom: 2 },
  message: { marginTop: 2, marginLeft: spacing.xs },
});
