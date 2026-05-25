import { View, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { joiResolver } from '@hookform/resolvers/joi';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import Joi from 'joi';
import { Trash2 } from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { KeyboardAvoidingScreen } from '@/components/ui/KeyboardAvoidingScreen';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/forms/FormInput';
import { Skeleton } from '@/components/ui/SkeletonLoader';

import { menusApi } from '@/api/menus.api';
import { parseApiError } from '@/utils/error';
import { colors, radii, spacing } from '@/theme';
import type { SellerMenuScreenProps } from '@/types/navigation.types';
import type { CreateMenuInput } from '@/types/domain.types';

interface FormShape {
  name: string;
  description?: string;
}

const schema = Joi.object<FormShape>({
  name: Joi.string().min(2).max(80).required().messages({
    'string.empty': 'Menu name is required',
    'string.min': 'Menu name must be at least 2 characters',
  }),
  description: Joi.string().allow('').max(280).optional(),
});

export function AddEditMenuScreen({
  navigation,
  route,
}: SellerMenuScreenProps<'AddEditMenu'>) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const menuId = route.params?.menuId;
  const isEditing = !!menuId;

  const menuQ = useQuery({
    queryKey: ['seller', 'menu', menuId],
    queryFn: () => menusApi.get(menuId!),
    enabled: isEditing,
  });

  const {
    control,
    handleSubmit,
    formState: { isValid, isDirty },
    reset,
  } = useForm<FormShape>({
    resolver: joiResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { name: '', description: '' },
    values: menuQ.data?.menu
      ? {
          name: menuQ.data.menu.name,
          description: menuQ.data.menu.description ?? '',
        }
      : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: (form: FormShape) => {
      const input: CreateMenuInput = {
        name: form.name.trim(),
        ...(form.description?.trim() && { description: form.description.trim() }),
      };
      return isEditing ? menusApi.update(menuId, input) : menusApi.create(input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller', 'menus'] });
      Toast.show({
        type: 'success',
        text1: isEditing ? 'Menu updated' : 'Menu created',
      });
      navigation.goBack();
    },
    onError: (err) => Toast.show({ type: 'error', text1: parseApiError(err).message }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => menusApi.delete(menuId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller', 'menus'] });
      Toast.show({ type: 'success', text1: 'Menu deleted' });
      navigation.goBack();
    },
    onError: (err) => Toast.show({ type: 'error', text1: parseApiError(err).message }),
  });

  const confirmDelete = () => {
    Alert.alert(
      'Delete this menu?',
      'All items in this menu will be deleted too. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  };

  // Loading existing menu data — show skeleton form
  if (isEditing && menuQ.isLoading) {
    return (
      <SafeScreen>
        <ScreenHeader title="Edit menu" onBack={() => navigation.goBack()} />
        <View style={styles.skeletonWrap}>
          <Skeleton height={52} borderRadius={radii.lg} />
          <Skeleton height={100} borderRadius={radii.lg} />
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScreenHeader
        title={isEditing ? 'Edit menu' : 'New menu'}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingScreen>
        <View style={styles.form}>
          <FormInput
            control={control}
            name="name"
            label="Menu name"
            placeholder="e.g. Lunch, Family meals, Specials"
            autoCapitalize="words"
            autoFocus={!isEditing}
            returnKeyType="next"
          />
          <FormInput
            control={control}
            name="description"
            label="Description (optional)"
            placeholder="A short note about what's on this menu"
            autoCapitalize="sentences"
            multiline
            numberOfLines={3}
            helper="Up to 280 characters."
            returnKeyType="done"
          />
        </View>

        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Button
            onPress={handleSubmit((v) => saveMutation.mutate(v))}
            loading={saveMutation.isPending}
            disabled={!isValid || (isEditing && !isDirty)}
            fullWidth
            size="lg"
          >
            {isEditing ? 'Save changes' : 'Create menu'}
          </Button>

          {isEditing ? (
            <Button
              onPress={confirmDelete}
              variant="ghost"
              loading={deleteMutation.isPending}
              leftIcon={<Trash2 size={16} color={colors.feedback.error} />}
            >
              Delete menu
            </Button>
          ) : null}
        </View>
      </KeyboardAvoidingScreen>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  skeletonWrap: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
});
