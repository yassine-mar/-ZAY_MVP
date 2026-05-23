import { useRef } from 'react';
import { View, StyleSheet, type TextInput } from 'react-native';
import { useForm, useWatch, type UseFormSetError } from 'react-hook-form';
import { joiResolver } from '@hookform/resolvers/joi';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { KeyboardAvoidingScreen } from '@/components/ui/KeyboardAvoidingScreen';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/forms/FormInput';
import { PhoneInput } from '@/components/forms/PhoneInput';
import { PasswordInput } from '@/components/forms/PasswordInput';
import { RoleToggle } from '@/components/forms/RoleToggle';
import { authService } from '@/services/auth.service';
import { registerSchema, type RegisterFormValues } from '@/utils/validation';
import { parseApiError } from '@/utils/error';
import { PASSWORD_MIN_LENGTH } from '@/constants/config';
import { spacing } from '@/theme';
import type {
  RegisterCustomerInput,
  RegisterSellerInput,
} from '@/types/domain.types';
import type { AuthScreenProps } from '@/types/navigation.types';

type Role = 'customer' | 'seller';

export function RegisterScreen({ navigation, route }: AuthScreenProps<'Register'>) {
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const businessRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const radiusRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    setError,
    setValue,
    trigger,
    formState: { isValid },
  } = useForm<RegisterFormValues>({
    resolver: joiResolver(registerSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      role: route.params?.initialRole ?? 'customer',
      name: '',
      email: '',
      phone: '',
      password: '',
      business_name: '',
      city: '',
      delivery_radius_km: 5 as unknown as number,
    },
  });

  // Watching `role` keeps the conditional fields and copy in sync without
  // owning a separate useState — single source of truth.
  const role = useWatch({ control, name: 'role' }) as Role;

  const switchRole = (next: Role) => {
    if (next === role) return;
    setValue('role', next, { shouldDirty: true, shouldTouch: true });
    // Re-run validation so the conditional rules (re)apply.
    trigger();
  };

  const registerMutation = useMutation({
    mutationFn: (input: RegisterFormValues) =>
      input.role === 'seller'
        ? authService.registerSeller({
            name: input.name,
            email: input.email,
            phone: input.phone,
            password: input.password,
            business_name: input.business_name,
            city: input.city,
            delivery_radius_km: Number(input.delivery_radius_km),
          } as RegisterSellerInput)
        : authService.registerCustomer({
            name: input.name,
            email: input.email,
            phone: input.phone,
            password: input.password,
          } as RegisterCustomerInput),
    onError: (err) => handleAuthError(err, setError),
  });

  return (
    <SafeScreen>
      <BackHeader onBack={() => navigation.goBack()} />
      <KeyboardAvoidingScreen>
        <View style={styles.headerBlock}>
          <Text variant="h1">Create your account</Text>
          <Text variant="body" color="text.secondary">
            {role === 'seller'
              ? "Tell us about your kitchen — we'll review and approve within 48 hours."
              : 'Sign up in a minute and start ordering from kitchens near you.'}
          </Text>
        </View>

        <View style={styles.toggleWrap}>
          <RoleToggle value={role} onChange={switchRole} />
        </View>

        <View style={styles.form}>
          <FormInput
            control={control}
            name="name"
            label="Full name"
            placeholder="Yassine Alami"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
          <FormInput
            ref={emailRef}
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
            onSubmitEditing={() => phoneRef.current?.focus()}
          />
          <PhoneInput ref={phoneRef} control={control} name="phone" />
          <PasswordInput
            ref={passwordRef}
            control={control}
            name="password"
            placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
            helper={role === 'customer' ? `Minimum ${PASSWORD_MIN_LENGTH} characters` : undefined}
            returnKeyType={role === 'seller' ? 'next' : 'done'}
            onSubmitEditing={
              role === 'seller'
                ? () => businessRef.current?.focus()
                : handleSubmit((v) => registerMutation.mutate(v))
            }
          />

          {role === 'seller' ? (
            <>
              <View style={styles.divider} />
              <Text variant="overline" color="text.secondary">
                Business
              </Text>

              <FormInput
                ref={businessRef}
                control={control}
                name="business_name"
                label="Business name"
                placeholder="Dar Atika"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => cityRef.current?.focus()}
              />
              <FormInput
                ref={cityRef}
                control={control}
                name="city"
                label="City"
                placeholder="Casablanca"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => radiusRef.current?.focus()}
              />
              <FormInput
                ref={radiusRef}
                control={control}
                name="delivery_radius_km"
                label="Delivery radius (km)"
                keyboardType="number-pad"
                placeholder="5"
                helper="How far from your kitchen will you deliver?"
                returnKeyType="done"
                onSubmitEditing={handleSubmit((v) => registerMutation.mutate(v))}
              />
            </>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            onPress={handleSubmit((v) => registerMutation.mutate(v))}
            loading={registerMutation.isPending}
            disabled={!isValid}
            fullWidth
            size="lg"
          >
            {role === 'seller' ? 'Submit application' : 'Create account'}
          </Button>

          <Text
            variant="caption"
            color="text.tertiary"
            align="center"
            style={styles.legal}
          >
            By continuing you agree to our Terms of Service and Privacy Policy.
          </Text>

          <View style={styles.footerRow}>
            <Text variant="bodySmall" color="text.secondary">
              Already have an account?{' '}
            </Text>
            <Text
              variant="bodySmallMedium"
              color="primary"
              onPress={() => navigation.replace('Login')}
              accessibilityRole="link"
            >
              Log in
            </Text>
          </View>
        </View>
      </KeyboardAvoidingScreen>
    </SafeScreen>
  );
}

function handleAuthError(err: unknown, setError: UseFormSetError<RegisterFormValues>) {
  const parsed = parseApiError(err);

  if (parsed.code === 'VALIDATION_ERROR' && parsed.details?.length) {
    parsed.details.forEach((d) => setError(d.field as never, { message: d.message }));
    return;
  }
  if (parsed.code === 'CONFLICT') {
    setError('email', { message: 'An account with this email already exists' });
    return;
  }
  Toast.show({ type: 'error', text1: parsed.message });
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  toggleWrap: {
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.md,
  },
  divider: {
    marginTop: spacing.sm,
    marginBottom: -spacing.xs,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  legal: {
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
