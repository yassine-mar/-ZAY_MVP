import { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller, useForm, type Control } from 'react-hook-form';
import { joiResolver } from '@hookform/resolvers/joi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Joi from 'joi';
import Toast from 'react-native-toast-message';
import { ChevronDown, AlertTriangle } from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { KeyboardAvoidingScreen } from '@/components/ui/KeyboardAvoidingScreen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { FormInput } from '@/components/forms/FormInput';
import { CartSummary } from '@/components/domain/CartSummary';

import { ordersApi } from '@/api/orders.api';
import { useCart } from '@/hooks/useCart';
import { parseApiError } from '@/utils/error';
import { uuidV4 } from '@/utils/uuid';
import { MOROCCAN_CITIES } from '@/constants/cities';
import { colors, radii, spacing } from '@/theme';
import type { CustomerRootScreenProps } from '@/types/navigation.types';
import type { DeliveryAddress } from '@/types/domain.types';

interface FormShape {
  street: string;
  district?: string;
  city: string;
  landmark?: string;
  notes?: string;
}

const schema = Joi.object<FormShape>({
  street: Joi.string().min(3).max(160).required().messages({
    'string.empty': 'Street address is required',
    'string.min': 'Please enter a complete street address',
  }),
  district: Joi.string().allow('').max(120).optional(),
  city: Joi.string().min(2).max(80).required().messages({
    'string.empty': 'Please pick a city',
  }),
  landmark: Joi.string().allow('').max(160).optional(),
  notes: Joi.string().allow('').max(280).optional(),
});

export function CheckoutScreen({ navigation }: CustomerRootScreenProps<'Checkout'>) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { items, sellerId, sellerName, subtotal, removeItem, clear } = useCart();
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<{
    unavailable: { menu_item_id: string; reason: string }[];
  } | null>(null);

  // Generate the idempotency key ONCE per mount — retries reuse it so the
  // backend can dedupe (Critique #1: prevent double-charge on flaky 3G).
  const idempotencyKey = useMemo(uuidV4, []);

  const { control, handleSubmit, setValue, formState: { isValid } } = useForm<FormShape>({
    resolver: joiResolver(schema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { street: '', district: '', city: '', landmark: '', notes: '' },
  });

  /* Cart validation — runs on mount so we never let the user fill the
     address form with a cart that will 422 at submit. */
  const validateMutation = useMutation({
    mutationFn: () =>
      ordersApi.validateCart(
        items.map((l) => ({ menu_item_id: l.menu_item_id, quantity: l.quantity })),
      ),
    onSuccess: (data) => {
      if (data.unavailable.length > 0) {
        setReconcileResult({ unavailable: data.unavailable });
      }
    },
    onError: (err) => {
      const parsed = parseApiError(err);
      Toast.show({ type: 'error', text1: parsed.message });
    },
  });

  useEffect(() => {
    if (items.length > 0) validateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placeMutation = useMutation({
    mutationFn: (form: FormShape) => {
      if (!sellerId) {
        throw new Error('Missing seller');
      }
      const addr: DeliveryAddress = {
        street: form.street.trim(),
        ...(form.district?.trim() && { district: form.district.trim() }),
        city: form.city.trim(),
        ...(form.landmark?.trim() && { landmark: form.landmark.trim() }),
        ...(form.notes?.trim() && { notes: form.notes.trim() }),
      };
      return ordersApi.place(
        {
          seller_id: sellerId,
          items: items.map((l) => ({ menu_item_id: l.menu_item_id, quantity: l.quantity })),
          delivery_address: addr,
          customer_notes: form.notes?.trim() || undefined,
        },
        idempotencyKey,
      );
    },
    onSuccess: ({ order }) => {
      clear();
      qc.invalidateQueries({ queryKey: ['orders'] });
      Toast.show({ type: 'success', text1: 'Order placed!' });
      // Dismiss the modal back to tabs, then jump to the tracking screen.
      navigation.getParent()?.navigate('Tabs', {
        screen: 'OrdersTab',
        params: { screen: 'OrderTracking', params: { orderId: order.id } },
      } as never);
    },
    onError: (err) => {
      const parsed = parseApiError(err);
      if (parsed.code === 'UNPROCESSABLE') {
        // Backend says the cart is invalid — surface the same reconciliation modal.
        setReconcileResult({
          unavailable: (parsed.details ?? []).map((d) => ({
            menu_item_id: d.field,
            reason: d.message,
          })),
        });
        return;
      }
      Toast.show({ type: 'error', text1: parsed.message });
    },
  });

  /* Empty cart edge case — shouldn't normally happen since the trigger
     comes from CartScreen, but defensive. */
  if (items.length === 0) {
    return (
      <SafeScreen>
        <ScreenHeader title="Checkout" onBack={() => navigation.goBack()} />
        <View style={styles.emptyWrap}>
          <Text variant="h3" align="center">Cart is empty</Text>
          <Button onPress={() => navigation.goBack()} variant="secondary">
            Back to browsing
          </Button>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScreenHeader title="Checkout" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingScreen>
        {/* Validation block */}
        {validateMutation.isPending ? (
          <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
            <Skeleton height={16} width="40%" />
            <Skeleton height={48} borderRadius={radii.lg} />
          </View>
        ) : null}

        {/* Delivery address */}
        <View style={styles.section}>
          <Text variant="overline" color="text.secondary">Delivery address</Text>

          <FormInput
            control={control}
            name="street"
            label="Street & number"
            placeholder="Rue Tarik Ibn Ziad, 24"
            autoCapitalize="words"
            returnKeyType="next"
          />
          <FormInput
            control={control}
            name="district"
            label="District (optional)"
            placeholder="Maarif"
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Pressable
            onPress={() => setShowCityPicker(true)}
            accessibilityRole="button"
            accessibilityLabel="Pick a city"
            style={({ pressed }) => [styles.cityField, pressed && { opacity: 0.7 }]}
          >
            <View style={{ flex: 1 }}>
              <Text variant="bodySmallMedium" color="text.primary" style={styles.label}>
                City
              </Text>
              <CityFieldDisplay control={control} />
            </View>
            <ChevronDown size={20} color={colors.text.secondary} />
          </Pressable>

          <FormInput
            control={control}
            name="landmark"
            label="Landmark (optional)"
            placeholder="Near the blue pharmacy"
            autoCapitalize="sentences"
            returnKeyType="next"
            helper="Many Moroccan addresses are easier with a nearby landmark."
          />
          <FormInput
            control={control}
            name="notes"
            label="Notes for the kitchen (optional)"
            placeholder="No spicy please, ring at gate 2"
            autoCapitalize="sentences"
            multiline
            numberOfLines={3}
            returnKeyType="done"
          />
        </View>

        {/* Order summary */}
        <View style={styles.section}>
          <Text variant="overline" color="text.secondary" style={{ marginBottom: spacing.sm }}>
            From {sellerName ?? 'kitchen'}
          </Text>
          {items.map((l) => (
            <View key={l.menu_item_id} style={styles.summaryRow}>
              <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                {l.quantity} × {l.name}
              </Text>
              <Text variant="bodyMedium">{(l.price * l.quantity).toLocaleString()} MAD</Text>
            </View>
          ))}
          <View style={{ height: spacing.sm }} />
          <CartSummary subtotal={subtotal} />
        </View>

        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Button
            onPress={handleSubmit((v) => placeMutation.mutate(v))}
            loading={placeMutation.isPending}
            disabled={
              !isValid ||
              validateMutation.isPending ||
              reconcileResult !== null
            }
            fullWidth
            size="lg"
          >
            Place order · {subtotal.toLocaleString()} MAD
          </Button>
        </View>
      </KeyboardAvoidingScreen>

      {/* City picker modal */}
      <CityPickerModal
        visible={showCityPicker}
        onClose={() => setShowCityPicker(false)}
        onPick={(c) => {
          setValue('city', c, { shouldDirty: true, shouldValidate: true });
          setShowCityPicker(false);
        }}
      />

      {/* Cart reconciliation modal */}
      <Modal
        visible={!!reconcileResult}
        transparent
        animationType="fade"
        onRequestClose={() => setReconcileResult(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <AlertTriangle size={24} color={colors.feedback.warning} />
            </View>
            <Text variant="h3" align="center">Some items aren't available</Text>
            <Text variant="bodySmall" color="text.secondary" align="center" style={{ marginTop: 4 }}>
              Remove them to continue with your order.
            </Text>

            <View style={styles.modalList}>
              {reconcileResult?.unavailable.map((u) => {
                const line = items.find((l) => l.menu_item_id === u.menu_item_id);
                return (
                  <View key={u.menu_item_id} style={styles.modalRow}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" numberOfLines={1}>
                        {line?.name ?? 'Item'}
                      </Text>
                      <Text variant="caption" color="text.secondary">
                        {u.reason}
                      </Text>
                    </View>
                    <Button
                      onPress={() => {
                        removeItem(u.menu_item_id);
                        const next = reconcileResult.unavailable.filter(
                          (x) => x.menu_item_id !== u.menu_item_id,
                        );
                        if (next.length === 0) setReconcileResult(null);
                        else setReconcileResult({ unavailable: next });
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      Remove
                    </Button>
                  </View>
                );
              })}
            </View>

            <Button
              onPress={() => {
                setReconcileResult(null);
                navigation.goBack();
              }}
              variant="ghost"
              fullWidth
            >
              Back to cart
            </Button>
          </View>
        </View>
      </Modal>
    </SafeScreen>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function CityFieldDisplay({ control }: { control: Control<FormShape> }) {
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
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.cityPicker}>
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
                style={({ pressed }) => [
                  styles.cityRow,
                  pressed && { backgroundColor: colors.surfaceMuted },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Select ${item}`}
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
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.md,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actions: {
    marginTop: spacing.md,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalIcon: {
    alignSelf: 'center',
    width: 48, height: 48,
    borderRadius: radii.full,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  modalList: {
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
  },
  cityPicker: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
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
