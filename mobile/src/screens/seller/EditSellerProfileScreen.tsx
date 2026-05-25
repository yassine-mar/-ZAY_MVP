import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller, useForm, type Control } from 'react-hook-form';
import { joiResolver } from '@hookform/resolvers/joi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import Joi from 'joi';
import { ChevronDown } from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { KeyboardAvoidingScreen } from '@/components/ui/KeyboardAvoidingScreen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/forms/FormInput';
import { ImagePicker } from '@/components/forms/ImagePicker';

import { sellerApi } from '@/api/seller.api';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { parseApiError } from '@/utils/error';
import { MOROCCAN_CITIES } from '@/constants/cities';
import { colors, radii, spacing } from '@/theme';
import type { PickedImage } from '@/types/domain.types';
import type { SellerProfileScreenProps } from '@/types/navigation.types';

interface FormShape {
  business_name: string;
  description?: string;
  city: string;
  delivery_radius_km: number;
}

const schema = Joi.object<FormShape>({
  business_name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Business name is required',
  }),
  description: Joi.string().allow('').max(500).optional(),
  city: Joi.string().min(2).max(80).required(),
  delivery_radius_km: Joi.number().integer().min(1).max(30).required().messages({
    'number.min': 'Delivery radius must be at least 1 km',
    'number.max': 'Delivery radius can\'t exceed 30 km',
  }),
});

export function EditSellerProfileScreen({
  navigation,
}: SellerProfileScreenProps<'EditSellerProfile'>) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { user } = useAuth();
  const profile = user?.seller_profile ?? null;

  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isValid, isDirty },
  } = useForm<FormShape>({
    resolver: joiResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      business_name: profile?.business_name ?? '',
      description: profile?.description ?? '',
      city: profile?.city ?? '',
      delivery_radius_km: profile?.delivery_radius_km ?? 5,
    },
  });

  // Re-sync defaults if the profile loads asynchronously after mount.
  useEffect(() => {
    if (profile) {
      setValue('business_name', profile.business_name);
      setValue('description', profile.description ?? '');
      setValue('city', profile.city);
      setValue('delivery_radius_km', profile.delivery_radius_km);
    }
  }, [profile, setValue]);

  const saveMutation = useMutation({
    mutationFn: async (form: FormShape) => {
      const { profile: updated } = await sellerApi.updateProfile({
        business_name: form.business_name.trim(),
        description: form.description?.trim() || undefined,
        city: form.city.trim(),
        delivery_radius_km: Number(form.delivery_radius_km),
      });

      if (picked) {
        await sellerApi.uploadAvatar({
          uri: picked.uri,
          mimeType: picked.mimeType,
          fileName: picked.fileName,
        });
      }

      return updated;
    },
    onSuccess: (updated) => {
      const cur = useAuthStore.getState().user;
      if (cur) {
        useAuthStore.getState().setUser({ ...cur, seller_profile: updated });
      }
      qc.invalidateQueries({ queryKey: ['users', 'me'] });
      Toast.show({ type: 'success', text1: 'Profile updated' });
      navigation.goBack();
    },
    onError: (err) => Toast.show({ type: 'error', text1: parseApiError(err).message }),
  });

  return (
    <SafeScreen>
      <ScreenHeader title="Edit profile" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingScreen>
        <View style={styles.form}>
          <ImagePicker
            value={picked}
            remoteUri={user?.avatar_url}
            onChange={setPicked}
            label="Profile photo"
            aspect={[1, 1]}
          />

          <FormInput
            control={control}
            name="business_name"
            label="Business name"
            placeholder="Dar Atika"
            autoCapitalize="words"
            returnKeyType="next"
          />

          <FormInput
            control={control}
            name="description"
            label="Description"
            placeholder="Tell customers about your kitchen and what makes it special"
            autoCapitalize="sentences"
            multiline
            numberOfLines={3}
            helper="Up to 500 characters."
          />

          {/* City picker */}
          <Pressable
            onPress={() => setShowCityPicker(true)}
            accessibilityRole="button"
            accessibilityLabel="Pick a city"
            style={({ pressed }) => [styles.cityField, pressed && { opacity: 0.7 }]}
          >
            <View style={{ flex: 1 }}>
              <Text variant="bodySmallMedium" style={styles.label}>City</Text>
              <CityDisplay control={control} />
            </View>
            <ChevronDown size={20} color={colors.text.secondary} />
          </Pressable>

          <FormInput
            control={control}
            name="delivery_radius_km"
            label="Delivery radius (km)"
            placeholder="5"
            keyboardType="number-pad"
            helper="How far from your kitchen will you deliver?"
            returnKeyType="done"
          />
        </View>

        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Button
            onPress={handleSubmit((v) => saveMutation.mutate(v))}
            loading={saveMutation.isPending}
            disabled={!isValid || (!isDirty && !picked)}
            fullWidth
            size="lg"
          >
            Save changes
          </Button>
        </View>
      </KeyboardAvoidingScreen>

      <CityPickerModal
        visible={showCityPicker}
        onClose={() => setShowCityPicker(false)}
        onPick={(c) => {
          setValue('city', c, { shouldDirty: true, shouldValidate: true });
          setShowCityPicker(false);
        }}
      />
    </SafeScreen>
  );
}

function CityDisplay({ control }: { control: Control<FormShape> }) {
  return (
    <Controller
      control={control}
      name="city"
      render={({ field: { value }, fieldState: { error } }) => (
        <>
          <Text
            variant="body"
            color={value ? 'text.primary' : 'text.tertiary'}
            numberOfLines={1}
          >
            {value || 'Pick a city'}
          </Text>
          {error ? (
            <Text variant="caption" color="feedback.error" style={{ marginTop: 2 }}>
              {error.message}
            </Text>
          ) : null}
        </>
      )}
    />
  );
}

function CityPickerModal({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (city: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalCard}>
          <Text variant="h3" align="center" style={{ marginBottom: spacing.md }}>
            Pick a city
          </Text>
          <FlatList
            data={MOROCCAN_CITIES}
            keyExtractor={(c) => c}
            ItemSeparatorComponent={() => <View style={styles.cityDivider} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onPick(item)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${item}`}
                style={({ pressed }) => [
                  styles.cityRow,
                  pressed && { backgroundColor: colors.surfaceMuted },
                ]}
              >
                <Text variant="body">{item}</Text>
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  label: {
    marginBottom: 4,
  },
  cityField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 60,
    backgroundColor: colors.surface,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: spacing.lg,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  cityRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  cityDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
