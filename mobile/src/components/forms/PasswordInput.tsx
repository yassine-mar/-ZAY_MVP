import { forwardRef, useState, type ComponentProps } from 'react';
import { Pressable, type TextInput } from 'react-native';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react-native';
import { FormInput } from './FormInput';
import { colors, spacing } from '@/theme';

interface PasswordInputProps<T extends FieldValues>
  extends Omit<ComponentProps<typeof FormInput>, 'rightAdornment' | 'secureTextEntry' | 'control' | 'name'> {
  control: Control<T>;
  name: Path<T>;
}

/**
 * FormInput + eye toggle. Disables autocorrect / contextual menu so iOS
 * password suggestion popups don't cover the submit button.
 */
function _PasswordInput<T extends FieldValues>(
  { label = 'Password', ...rest }: PasswordInputProps<T>,
  ref: React.Ref<TextInput>,
) {
  const [visible, setVisible] = useState(false);

  return (
    <FormInput
      ref={ref}
      label={label}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="password"
      textContentType="password"
      spellCheck={false}
      rightAdornment={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? (
            <EyeOff size={20} color={colors.text.secondary} />
          ) : (
            <Eye size={20} color={colors.text.secondary} />
          )}
        </Pressable>
      }
      {...rest}
    />
  );
}

export const PasswordInput = forwardRef(_PasswordInput) as <T extends FieldValues>(
  props: PasswordInputProps<T> & { ref?: React.Ref<TextInput> },
) => ReturnType<typeof _PasswordInput>;
