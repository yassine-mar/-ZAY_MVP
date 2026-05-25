import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
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
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { FormInput } from '@/components/forms/FormInput';
import { ImagePicker } from '@/components/forms/ImagePicker';

import { itemsApi } from '@/api/items.api';
import { menusApi } from '@/api/menus.api';
import { browseApi } from '@/api/browse.api';
import { parseApiError } from '@/utils/error';
import { colors, radii, spacing } from '@/theme';
import type {
  CreateItemInput,
  PickedImage,
  UpdateItemInput,
} from '@/types/domain.types';
import type { SellerMenuScreenProps } from '@/types/navigation.types';

interface FormShape {
  name: string;
  description?: string;
  price: number;
  category_id?: string;
  is_available: boolean;
}

const schema = Joi.object<FormShape>({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Item name is required',
    'string.min': 'Item name must be at least 2 characters',
  }),
  description: Joi.string().allow('').max(500).optional(),
  price: Joi.number().integer().min(1).max(100_000).required().messages({
    'number.base': 'Price must be a number',
    'number.min': 'Price must be at least 1 MAD',
  }),
  category_id: Joi.string().allow('', null).optional(),
  is_available: Joi.boolean().required(),
});

export function AddEditItemScreen({
  navigation,
  route,
}: SellerMenuScreenProps<'AddEditItem'>) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { menuId, itemId } = route.params;
  const isEditing = !!itemId;

  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Existing menu (to grab the item being edited if any)
  const menuQ = useQuery({
    queryKey: ['seller', 'menu', menuId],
    queryFn: () => menusApi.get(menuId),
  });

  const editingItem = isEditing
    ? menuQ.data?.menu.items.find((i) => i.id === itemId)
    : undefined;

  const categoriesQ = useQuery({
    queryKey: ['categories'],
    queryFn: () => browseApi.categories(),
    staleTime: 5 * 60_000,
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isValid, isDirty },
  } = useForm<FormShape>({
    resolver: joiResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      category_id: undefined,
      is_available: true,
    },
  });

  // Sync form values from server when the item loads (edit mode).
  useEffect(() => {
    if (editingItem) {
      setValue('name', editingItem.name);
      setValue('description', editingItem.description ?? '');
      setValue('price', editingItem.price);
      setValue('category_id', editingItem.category_id ?? undefined);
      setValue('is_available', editingItem.is_available);
    }
  }, [editingItem, setValue]);

  const watchedCategoryId = watch('category_id');
  const watchedAvailable = watch('is_available');

  const saveMutation = useMutation({
    mutationFn: async (form: FormShape) => {
      // Step 1 — create or update the item itself.
      let id: string;
      if (isEditing && itemId) {
        const input: UpdateItemInput = {
          name: form.name.trim(),
          description: form.description?.trim() || undefined,
          price: Number(form.price),
          category_id: form.category_id ?? null,
          is_available: form.is_available,
        };
        const { item } = await itemsApi.update(itemId, input);
        id = item.id;
      } else {
        const input: CreateItemInput = {
          menu_id: menuId,
          name: form.name.trim(),
          description: form.description?.trim() || undefined,
          price: Number(form.price),
          category_id: form.category_id,
          is_available: form.is_available,
        };
        const { item } = await itemsApi.create(input);
        id = item.id;
      }

      // Step 2 — upload the image if the user picked a new one.
      if (picked) {
        setUploadProgress(0);
        await itemsApi.uploadImage(id, picked, (pct) => setUploadProgress(pct));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller', 'menus'] });
      qc.invalidateQueries({ queryKey: ['seller', 'menu', menuId] });
      Toast.show({
        type: 'success',
        text1: isEditing ? 'Item updated' : 'Item added',
      });
      navigation.goBack();
    },
    onError: (err) => {
      setUploadProgress(null);
      Toast.show({ type: 'error', text1: parseApiError(err).message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => itemsApi.delete(itemId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller', 'menus'] });
      qc.invalidateQueries({ queryKey: ['seller', 'menu', menuId] });
      Toast.show({ type: 'success', text1: 'Item deleted' });
      navigation.goBack();
    },
    onError: (err) => Toast.show({ type: 'error', text1: parseApiError(err).message }),
  });

  const confirmDelete = () => {
    Alert.alert(
      'Delete this item?',
      'Customers will no longer see this item. Past orders keep their references.',
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

  if (isEditing && menuQ.isLoading) {
    return (
      <SafeScreen>
        <ScreenHeader title="Edit item" onBack={() => navigation.goBack()} />
        <View style={styles.skeletonWrap}>
          <Skeleton height={200} borderRadius={radii.lg} />
          <Skeleton height={52} borderRadius={radii.lg} />
          <Skeleton height={100} borderRadius={radii.lg} />
        </View>
      </SafeScreen>
    );
  }

  const submitting = saveMutation.isPending || deleteMutation.isPending;

  return (
    <SafeScreen>
      <ScreenHeader
        title={isEditing ? 'Edit item' : 'New item'}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingScreen>
        <View style={styles.form}>
          <ImagePicker
            value={picked}
            remoteUri={editingItem?.image_url}
            onChange={setPicked}
            label="Photo"
          />

          <FormInput
            control={control}
            name="name"
            label="Name"
            placeholder="Tagine au poulet"
            autoCapitalize="words"
            returnKeyType="next"
          />

          <FormInput
            control={control}
            name="description"
            label="Description"
            placeholder="Slow-cooked chicken with preserved lemon and olives"
            autoCapitalize="sentences"
            multiline
            numberOfLines={3}
            helper="Help customers picture the dish."
          />

          <FormInput
            control={control}
            name="price"
            label="Price (MAD)"
            placeholder="80"
            keyboardType="number-pad"
            returnKeyType="done"
          />

          {/* Category picker */}
          <View>
            <Text variant="bodySmallMedium" style={{ marginBottom: spacing.xs }}>
              Category
            </Text>
            {categoriesQ.isLoading ? (
              <Skeleton height={40} borderRadius={radii.full} />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                <Chip
                  label="None"
                  selected={!watchedCategoryId}
                  onPress={() => setValue('category_id', undefined, { shouldDirty: true })}
                />
                {(categoriesQ.data?.categories ?? [])
                  .filter((c) => c.is_active)
                  .map((c) => (
                    <Chip
                      key={c.id}
                      label={`${c.icon ?? '🍽️'}  ${c.name}`}
                      selected={watchedCategoryId === c.id}
                      onPress={() =>
                        setValue('category_id', c.id, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                  ))}
              </ScrollView>
            )}
          </View>

          {/* Availability switch */}
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">Available now</Text>
              <Text variant="caption" color="text.secondary">
                Customers can order this item right away.
              </Text>
            </View>
            <Switch
              value={watchedAvailable}
              onValueChange={(v) => setValue('is_available', v, { shouldDirty: true })}
              trackColor={{ false: colors.borderStrong, true: colors.primary }}
              thumbColor={colors.surface}
              ios_backgroundColor={colors.borderStrong}
            />
          </View>

          {/* Upload progress */}
          {uploadProgress !== null ? (
            <View style={styles.progressBlock}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${uploadProgress}%` },
                  ]}
                />
              </View>
              <Text variant="caption" color="text.secondary" align="center">
                Uploading photo · {uploadProgress}%
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Button
            onPress={handleSubmit((v) => saveMutation.mutate(v))}
            loading={saveMutation.isPending}
            disabled={!isValid || (isEditing && !isDirty && !picked) || submitting}
            fullWidth
            size="lg"
          >
            {isEditing ? 'Save changes' : 'Add item'}
          </Button>

          {isEditing ? (
            <Button
              onPress={confirmDelete}
              variant="ghost"
              disabled={submitting}
              leftIcon={<Trash2 size={16} color={colors.feedback.error} />}
            >
              Delete item
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
    paddingTop: spacing.sm,
  },
  skeletonWrap: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  categoryRow: {
    gap: spacing.sm,
    paddingVertical: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  progressBlock: {
    gap: spacing.xs,
  },
  progressBar: {
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  actions: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
});
