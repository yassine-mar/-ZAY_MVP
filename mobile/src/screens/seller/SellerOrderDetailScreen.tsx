import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Linking,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Phone, X, AlertTriangle, MapPin } from 'lucide-react-native';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { OrderStatusBadge } from '@/components/domain/OrderStatusBadge';
import { OrderTimeline } from '@/components/domain/OrderTimeline';
import { CartSummary } from '@/components/domain/CartSummary';
import { ETAPicker } from '@/components/domain/ETAPicker';
import { ReasonPrompt } from '@/components/domain/ReasonPrompt';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';

import { sellerOrdersApi } from '@/api/sellerOrders.api';
import { useOrderUpdates } from '@/hooks/useOrderUpdates';
import { PRIMARY_TRANSITION, sellerCanAct } from '@/constants/sellerActions';
import { parseApiError } from '@/utils/error';
import {
  formatDateTime,
  formatPhone,
  formatRelative,
} from '@/utils/format';
import { colors, radii, spacing } from '@/theme';
import type { OrderStatus } from '@/types/domain.types';
import type { SellerOrdersScreenProps } from '@/types/navigation.types';

export function SellerOrderDetailScreen({
  navigation,
  route,
}: SellerOrdersScreenProps<'SellerOrderDetail'>) {
  const { orderId } = route.params;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [etaModalVisible, setEtaModalVisible] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(30);
  const [cancelPromptVisible, setCancelPromptVisible] = useState(false);

  useOrderUpdates(orderId);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => sellerOrdersApi.get(orderId),
  });

  const updateMutation = useMutation({
    mutationFn: (input: Parameters<typeof sellerOrdersApi.updateStatus>[1]) =>
      sellerOrdersApi.updateStatus(orderId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['seller', 'orders'] });
      qc.invalidateQueries({ queryKey: ['seller', 'analytics'] });
    },
    onError: (err) => {
      const parsed = parseApiError(err);
      Toast.show({ type: 'error', text1: parsed.message });
    },
  });

  if (isError) {
    return (
      <SafeScreen>
        <ScreenHeader title="Order" onBack={() => navigation.goBack()} />
        <ErrorScreen onRetry={() => refetch()} />
      </SafeScreen>
    );
  }

  if (isLoading || !data) {
    return (
      <SafeScreen>
        <ScreenHeader title="Order" onBack={() => navigation.goBack()} />
        <View style={styles.skeletonWrap}>
          <Skeleton height={80} borderRadius={radii.lg} />
          <Skeleton height={140} borderRadius={radii.lg} />
          <Skeleton height={120} borderRadius={radii.lg} />
        </View>
      </SafeScreen>
    );
  }

  const { order, history } = data;
  const canAct = sellerCanAct(order.status);
  const transition =
    order.status === 'delivered' || order.status === 'cancelled'
      ? null
      : PRIMARY_TRANSITION[order.status as Exclude<OrderStatus, 'delivered' | 'cancelled'>];

  const handlePrimary = () => {
    if (!transition) return;
    if (transition.requiresETA) {
      setEtaModalVisible(true);
    } else {
      updateMutation.mutate({ status: transition.toStatus });
    }
  };

  const handleAcceptWithEta = () => {
    const eta = new Date(Date.now() + etaMinutes * 60_000).toISOString();
    updateMutation.mutate({ status: 'accepted', estimated_ready_at: eta });
    setEtaModalVisible(false);
  };

  return (
    <SafeScreen>
      <ScreenHeader
        title={`Order #${order.id.slice(0, 8)}`}
        subtitle={`Placed ${formatRelative(order.created_at)}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: canAct ? 140 + insets.bottom : spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status header */}
        <View style={styles.statusCard}>
          <View style={styles.statusHead}>
            <Text variant="caption" color="text.secondary">Status</Text>
            <OrderStatusBadge status={order.status} />
          </View>
          {order.estimated_ready_at && canAct ? (
            <Text variant="bodySmall" color="text.secondary">
              Ready by {formatDateTime(order.estimated_ready_at)}
            </Text>
          ) : null}
        </View>

        {/* Customer */}
        <View style={styles.section}>
          <Text variant="overline" color="text.secondary" style={{ marginBottom: spacing.sm }}>
            Customer
          </Text>
          <View style={styles.customerRow}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold">{order.customer?.name ?? 'Customer'}</Text>
              {order.customer?.phone ? (
                <Text variant="caption" color="text.secondary">
                  {formatPhone(order.customer.phone)}
                </Text>
              ) : null}
            </View>
            {order.customer?.phone ? (
              <Button
                onPress={() => Linking.openURL(`tel:${order.customer!.phone}`)}
                variant="secondary"
                size="sm"
                leftIcon={<Phone size={14} color={colors.text.primary} />}
              >
                Call
              </Button>
            ) : null}
          </View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text variant="overline" color="text.secondary" style={{ marginBottom: spacing.sm }}>
            Items ({order.items.length})
          </Text>
          {order.items.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <Text variant="body" style={{ flex: 1 }} numberOfLines={2}>
                {it.quantity} × {it.name}
              </Text>
              <Text variant="bodyMedium">
                {it.subtotal.toLocaleString()} MAD
              </Text>
            </View>
          ))}
          <View style={{ height: spacing.md }} />
          <CartSummary subtotal={order.total_amount} />
        </View>

        {/* Delivery */}
        <View style={styles.section}>
          <View style={styles.deliveryHead}>
            <MapPin size={14} color={colors.text.secondary} />
            <Text variant="overline" color="text.secondary">Delivery</Text>
          </View>
          <Text variant="body">{order.delivery_address.street}</Text>
          {order.delivery_address.district ? (
            <Text variant="body">{order.delivery_address.district}</Text>
          ) : null}
          <Text variant="body">{order.delivery_address.city}</Text>
          {order.delivery_address.landmark ? (
            <Text variant="bodySmall" color="text.secondary" style={{ marginTop: spacing.xs }}>
              Landmark: {order.delivery_address.landmark}
            </Text>
          ) : null}
          {order.customer_notes ? (
            <View style={styles.noteBlock}>
              <Text variant="caption" color="text.secondary" style={{ marginBottom: 2 }}>
                Customer note
              </Text>
              <Text variant="bodySmall">{order.customer_notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text variant="overline" color="text.secondary" style={{ marginBottom: spacing.md }}>
            Progress
          </Text>
          <OrderTimeline order={order} history={history} />
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      {canAct ? (
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
        >
          {transition ? (
            <Button
              onPress={handlePrimary}
              loading={updateMutation.isPending && !cancelPromptVisible}
              size="lg"
              fullWidth
              leftIcon={
                transition.icon ? (
                  <transition.icon size={18} color={colors.text.onPrimary} strokeWidth={2} />
                ) : undefined
              }
            >
              {transition.label}
            </Button>
          ) : null}
          <Pressable
            onPress={() => setCancelPromptVisible(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Cancel order"
            style={({ pressed }) => [styles.cancelLink, pressed && { opacity: 0.6 }]}
          >
            <X size={14} color={colors.feedback.error} />
            <Text variant="bodySmallMedium" color="feedback.error">
              Cancel order
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* ETA modal — only used for Accept */}
      <Modal
        visible={etaModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEtaModalVisible(false)}
      >
        <Pressable onPress={() => setEtaModalVisible(false)} style={styles.modalBackdrop}>
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalCard}>
            <Text variant="h3">When will it be ready?</Text>
            <Text variant="bodySmall" color="text.secondary">
              The customer will see this ETA. Pick how long you need to cook.
            </Text>

            <View style={{ marginTop: spacing.md }}>
              <ETAPicker value={etaMinutes} onChange={setEtaMinutes} />
            </View>

            <View style={styles.modalActions}>
              <Button
                onPress={() => setEtaModalVisible(false)}
                variant="ghost"
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                onPress={handleAcceptWithEta}
                loading={updateMutation.isPending}
                style={{ flex: 1 }}
              >
                Accept · {etaMinutes} min
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Cancel prompt */}
      <ReasonPrompt
        visible={cancelPromptVisible}
        title="Cancel this order?"
        description="The customer will be notified with your reason. This can't be undone."
        confirmLabel="Cancel order"
        destructive
        onClose={() => setCancelPromptVisible(false)}
        onConfirm={async (reason) => {
          await sellerOrdersApi.cancel(orderId, reason);
          qc.invalidateQueries({ queryKey: ['order', orderId] });
          qc.invalidateQueries({ queryKey: ['seller', 'orders'] });
          Toast.show({ type: 'success', text1: 'Order cancelled' });
        }}
      />
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statusHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  deliveryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  noteBlock: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
  },
  skeletonWrap: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    alignItems: 'center',
  },
  cancelLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
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
    gap: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
