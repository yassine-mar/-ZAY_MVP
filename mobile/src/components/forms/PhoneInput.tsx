import { forwardRef, useState } from 'react';
import { View, StyleSheet, type TextInput } from 'react-native';
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';
import {
  PHONE_DIAL_CODE,
  PHONE_NATIONAL_LENGTH,
} from '@/constants/config';
import {
  nationalDigitsOnly,
  normalizePhoneForStorage,
} from '@/utils/format';

interface PhoneInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
}

/** Pretty 9-digit grouping: 6 12 34 56 78 */
function formatNationalForDisplay(d: string): string {
  const a = d.slice(0, 1);
  const b = d.slice(1, 3);
  const c = d.slice(3, 5);
  const e = d.slice(5, 7);
  const f = d.slice(7, 9);
  return [a, b, c, e, f].filter(Boolean).join(' ');
}

/**
 * Phone input pinned to Morocco (+212).
 *  - Stores `+212XXXXXXXXX` (raw) in the form state — validation-friendly
 *  - Displays grouped 9-digit national format for readability
 *  - Hard cap at 9 national digits so users can't overshoot
 *
 * Multi-country support is intentionally deferred (Critique #7).
 */
function _PhoneInput<T extends FieldValues>(
  { control, name, label = 'Phone' }: PhoneInputProps<T>,
  ref: React.Ref<TextInput>,
) {
  const [localDigits, setLocalDigits] = useState<string>('');

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => {
        // Sync localDigits when the form value changes externally
        // (e.g. defaultValues, server-set after edit).
        const expectedDigits = nationalDigitsOnly(value);
        if (expectedDigits !== localDigits && expectedDigits !== '' && localDigits === '') {
          setLocalDigits(expectedDigits);
        }

        const handleChange = (raw: string) => {
          const digits = raw.replace(/\D/g, '').slice(0, PHONE_NATIONAL_LENGTH);
          setLocalDigits(digits);
          onChange(digits.length === 0 ? '' : normalizePhoneForStorage(digits));
        };

        return (
          <View style={styles.root}>
            {label ? (
              <Text variant="bodySmallMedium" color="text.primary" style={styles.label}>
                {label}
              </Text>
            ) : null}
            <Input
              ref={ref}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              value={formatNationalForDisplay(localDigits)}
              onChangeText={handleChange}
              onBlur={onBlur}
              invalid={!!error}
              placeholder="6 12 34 56 78"
              leftAdornment={
                <View style={styles.prefix}>
                  <Text variant="body" color="text.secondary">{PHONE_DIAL_CODE}</Text>
                </View>
              }
              maxLength={14} // 9 digits + 4 spaces + buffer
              accessibilityLabel={label}
            />
            {error ? (
              <Text variant="caption" color="feedback.error" style={styles.message}>
                {error.message}
              </Text>
            ) : null}
          </View>
        );
      }}
    />
  );
}

export const PhoneInput = forwardRef(_PhoneInput) as <T extends FieldValues>(
  props: PhoneInputProps<T> & { ref?: React.Ref<TextInput> },
) => ReturnType<typeof _PhoneInput>;

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  label: { marginBottom: 2 },
  prefix: {
    paddingRight: spacing.sm,
    marginRight: spacing.xs,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    height: 28,
    justifyContent: 'center',
  },
  message: { marginTop: 2, marginLeft: spacing.xs },
});
