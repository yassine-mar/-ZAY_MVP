import { useRef } from 'react';
import { View, StyleSheet, type TextInput } from 'react-native';
import { useForm, type UseFormSetError } from 'react-hook-form';
import { joiResolver } from '@hookform/resolvers/joi';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { KeyboardAvoidingScreen } from '@/components/ui/KeyboardAvoidingScreen';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/forms/FormInput';
import { PasswordInput } from '@/components/forms/PasswordInput';
import { authService } from '@/services/auth.service';
import { loginSchema } from '@/utils/validation';
import { parseApiError } from '@/utils/error';
import { spacing } from '@/theme';
import type { LoginInput } from '@/types/domain.types';
import type { AuthScreenProps } from '@/types/navigation.types';

export function LoginScreen({ navigation, route }: AuthScreenProps<'Login'>) {
  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    setError,
    formState: { isValid },
  } = useForm<LoginInput>({
    resolver: joiResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      email: route.params?.prefilledEmail ?? '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: () => {
      // RootNavigator picks up the auth store change and swaps the tree —
      // no navigation call needed here.
    },
    onError: (err) => handleAuthError(err, setError),
  });

  return (
    <SafeScreen>
      <BackHeader onBack={() => navigation.goBack()} />
      <KeyboardAvoidingScreen>
        <View style={styles.headerBlock}>
          <Text variant="h1">Welcome back</Text>
          <Text variant="body" color="text.secondary">
            Sign in to continue browsing kitchens near you.
          </Text>
        </View>

        <View style={styles.form}>
          <FormInput
            control={control}
            name="email"
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <PasswordInput
            ref={passwordRef}
            control={control}
            name="password"
            placeholder="At least 8 characters"
            returnKeyType="done"
            onSubmitEditing={handleSubmit((v) => loginMutation.mutate(v))}
          />

          <View style={styles.forgotRow}>
            <Text
              variant="bodySmallMedium"
              color="primary"
              onPress={() => navigation.navigate('ForgotPassword')}
              accessibilityRole="link"
            >
              Forgot password?
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            onPress={handleSubmit((v) => loginMutation.mutate(v))}
            loading={loginMutation.isPending}
            disabled={!isValid}
            fullWidth
            size="lg"
          >
            Log in
          </Button>

          <View style={styles.footerRow}>
            <Text variant="bodySmall" color="text.secondary">
              New to @ZAY?{' '}
            </Text>
            <Text
              variant="bodySmallMedium"
              color="primary"
              onPress={() => navigation.replace('Register')}
              accessibilityRole="link"
            >
              Create an account
            </Text>
          </View>
        </View>
      </KeyboardAvoidingScreen>
    </SafeScreen>
  );
}

/**
 * Standard auth-error funnel:
 *   - VALIDATION_ERROR with details → inline field errors
 *   - UNAUTHORIZED (wrong credentials) → field-level error on password
 *   - everything else → toast
 *
 * Lives in this file because the screens use it slightly differently —
 * if a third auth screen reuses this pattern, lift to utils/.
 */
function handleAuthError(err: unknown, setError: UseFormSetError<any>) {
  const parsed = parseApiError(err);

  if (parsed.code === 'VALIDATION_ERROR' && parsed.details?.length) {
    parsed.details.forEach((d) => setError(d.field as never, { message: d.message }));
    return;
  }

  if (parsed.code === 'UNAUTHORIZED') {
    setError('password' as never, { message: 'Incorrect email or password' });
    return;
  }

  Toast.show({ type: 'error', text1: parsed.message });
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: spacing.xs,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.md,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -spacing.xs,
  },
  actions: {
    marginTop: 'auto',
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
