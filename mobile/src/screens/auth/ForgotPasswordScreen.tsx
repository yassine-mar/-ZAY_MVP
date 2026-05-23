import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useForm } from 'react-hook-form';
import { joiResolver } from '@hookform/resolvers/joi';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Mail, CheckCircle2 } from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { KeyboardAvoidingScreen } from '@/components/ui/KeyboardAvoidingScreen';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/forms/FormInput';
import { authApi } from '@/api/auth.api';
import { passwordResetRequestSchema } from '@/utils/validation';
import { parseApiError } from '@/utils/error';
import { SUPPORT_EMAIL } from '@/constants/config';
import { colors, radii, spacing } from '@/theme';
import type { PasswordResetRequestInput } from '@/types/domain.types';
import type { AuthScreenProps } from '@/types/navigation.types';

export function ForgotPasswordScreen({ navigation }: AuthScreenProps<'ForgotPassword'>) {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isValid },
    getValues,
  } = useForm<PasswordResetRequestInput>({
    resolver: joiResolver(passwordResetRequestSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { email: '' },
  });

  const requestMutation = useMutation({
    mutationFn: (input: PasswordResetRequestInput) => authApi.requestPasswordReset(input),
    onSuccess: () => {
      setSubmittedEmail(getValues('email'));
    },
    onError: (err) => {
      const parsed = parseApiError(err);
      // We do NOT leak whether the account exists. For NETWORK / SERVER
      // surface a real error so the user can retry; for everything else
      // pretend it succeeded.
      if (parsed.code === 'NETWORK' || parsed.code === 'SERVER' || parsed.code === 'RATE_LIMITED') {
        Toast.show({ type: 'error', text1: parsed.message });
        return;
      }
      setSubmittedEmail(getValues('email'));
    },
  });

  if (submittedEmail) {
    return (
      <SafeScreen>
        <BackHeader onBack={() => navigation.goBack()} />
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <CheckCircle2 size={48} color={colors.feedback.success} strokeWidth={2} />
          </View>
          <Text variant="h2" align="center">Check your inbox</Text>
          <Text
            variant="body"
            color="text.secondary"
            align="center"
            style={styles.successBody}
          >
            If an account exists for{' '}
            <Text variant="bodyBold" color="text.primary">{submittedEmail}</Text>,
            we've sent a link to reset your password. The link will expire in 30 minutes.
          </Text>

          <View style={styles.successActions}>
            <Button onPress={() => navigation.navigate('Login')} fullWidth size="lg">
              Back to login
            </Button>
            <Text
              variant="bodySmall"
              color="text.tertiary"
              align="center"
              style={styles.helpRow}
            >
              Didn't get an email? Check your spam folder, or contact{' '}
              <Text variant="bodySmallMedium" color="primary">
                {SUPPORT_EMAIL}
              </Text>
              .
            </Text>
          </View>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <BackHeader onBack={() => navigation.goBack()} />
      <KeyboardAvoidingScreen>
        <View style={styles.headerBlock}>
          <View style={styles.iconCircle}>
            <Mail size={26} color={colors.primary} strokeWidth={2} />
          </View>
          <Text variant="h1">Reset your password</Text>
          <Text variant="body" color="text.secondary">
            Enter the email tied to your account and we'll send a secure link to set a new password.
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
            returnKeyType="send"
            onSubmitEditing={handleSubmit((v) => requestMutation.mutate(v))}
          />
        </View>

        <View style={styles.actions}>
          <Button
            onPress={handleSubmit((v) => requestMutation.mutate(v))}
            loading={requestMutation.isPending}
            disabled={!isValid}
            fullWidth
            size="lg"
          >
            Send reset link
          </Button>

          <View style={styles.footerRow}>
            <Text variant="bodySmall" color="text.secondary">
              Remembered it?{' '}
            </Text>
            <Text
              variant="bodySmallMedium"
              color="primary"
              onPress={() => navigation.goBack()}
              accessibilityRole="link"
            >
              Back to login
            </Text>
          </View>
        </View>
      </KeyboardAvoidingScreen>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  form: {
    gap: spacing.md,
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
  successWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.md,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: spacing.sm,
  },
  successBody: {
    paddingHorizontal: spacing.md,
    marginTop: -spacing.xs,
  },
  successActions: {
    marginTop: 'auto',
    width: '100%',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  helpRow: {
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
});
