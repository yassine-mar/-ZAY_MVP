import { useState } from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, X, Clock } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { SafeScreen } from '@/components/ui/SafeScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { OrderStatusBadge } from '@/components/domain/OrderStatusBadge';
import { OrderTimeline } from '@/components/domain/OrderTimeline';
import { CartSummary } from '@/components/domain/CartSummary';
import { ErrorScreen } from '@/components/feedback/ErrorScreen';

import { ordersApi } from '@/api/orders.api';
import { useOrderUpdates } from '@/hooks/useOrderUpdates';
import {
  customerCanCancel,
  shouldShowSellerPhone,
} from '@/constants/orderStatus';
import { parseApiError } from '@/utils/error';
import { formatDateTime, formatPhone, formatRelative } from '@/utils/format';
import { colors, radii, spacing } from '@/theme';
import type { OrdersStackScreenProps } from '@/types/navigation.types';

export function OrderTrackingScreen({
  navigation,
  route,
}: OrdersStackScreenProps<'OrderTracking'>) {
  const { orderId } = route.params;
  const qc = useQueryClient();
  const [cancelling, setCancelling] = useState(false);

  // Real-time subscription — updates the ['order', orderId] cache when the
  // seller changes status. Refetches history on each event.
  useOrderUpdates(orderId);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.get(orderId),
    // Light polling as a safety net if the socket isn't connected.
    refetchInterval: 30_000,
  });

  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancel(orderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      Toast.show({ type: 'success', text1: 'Order cancelled' });
    },
    onError: (err) => {
      const parsed = parseApiError(err);
      Toast.show({ type: 'error', text1: parsed.message });
    },
  });

  const handleCancel = () => {
    Alert.alert(
      'Cancel this order?',
      'The kitchen will be notified. You can place a new order after cancelling.',
      [
        { text: 'Keep order', style: 'cancel' },
        {
          text: 'Cancel order',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try { await cancelMutation.mutateAsync(); }
            finally { setCancelling(false); }
          },
        },
      ],
    );
  };

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
          <Skeleton height={28} width="50%" />
          <Skeleton height={80} borderRadius={radii.lg} />
          <Skeleton height={140} borderRadius={radii.lg} />
          <Skeleton height={100} borderRadius={radii.lg} />
        </View>
      </SafeScreen>
    );
  }

  const { order, history } = data;
  const showPhone = shouldShowSellerPhone(order.status);
  const canCancel = customerCanCancel(order.status);

  return (
    <SafeScreen>
      <ScreenHeader
        title={`Order #${order.id.slice(0, 8)}`}
        subtitle={`Placed ${formatRelative(order.created_at)}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Status hero */}
        <View style={styles.statusCard}>
          <View style={styles.statusHead}>
            <Text variant="caption" color="text.secondary">Status</Text>
            <OrderStatusBadge status={order.status} />
          </View>
          {order.estimated_ready_at && order.status !== 'cancelled' && order.status !== 'delivered' ? (
            <View style={styles.etaRow}>
              <Clock size={14} color={colors.text.secondary} />
              <Text variant="bodySmall" color="text.secondary">
                Ready by {formatDateTime(order.estimated_ready_at)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text variant="overline" color="text.secondary">Progress</Text>
          <View style={{ marginTop: spacing.md }}>
            <OrderTimeline order={order} history={history} />
          </View>
        </View>

        {/* Seller */}
        <View style={styles.section}>
          <Text variant="overline" color="text.secondary" style={{ marginBottom: spacing.sm }}>
            Kitchen
          </Text>
          <View style={styles.sellerRow}>
            <Avatar
              uri={order.seller.avatar_url}
              name={order.seller.business_name}
              size={44}
            />
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold" numberOfLines={1}>
                {order.seller.business_name}
              </Text>
              {order.seller.city ? (
                <Text variant="caption" color="text.secondary">{order.seller.city}</Text>
              ) : null}
            </View>
            {showPhone && order.seller.phone ? (
              <Button
                onPress={() => Linking.openURL(`tel:${order.seller.phone}`)}
                variant="secondary"
                size="sm"
                leftIcon={<Phone size={14} color={colors.text.primary} />}
              >
                Call
              </Button>
            ) : null}
          </View>
          {showPhone && order.seller.phone ? (
            <Text variant="caption" color="text.secondary" style={{ marginTop: spacing.xs }}>
              {formatPhone(order.seller.phone)} · coordinate pickup or delivery directly.
            </Text>
          ) : null}
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text variant="overline" color="text.secondary" style={{ marginBottom: spacing.sm }}>
            Items ({order.items.length})
          </Text>
          {order.items.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <Text variant="body" style={{ flex: 1 }}>
                {it.quantity} × {it.name}
              </Text>
              <Text variant="bodyMedium">
                {(it.subtotal).toLocaleString()} MAD
              </Text>
            </View>
          ))}
          <View style={{ height: spacing.md }} />
          <CartSummary subtotal={order.total_amount} />
        </View>

        {/* Delivery */}
        <View style={styles.section}>
          <Text variant="overline" color="text.secondary" style={{ marginBottom: spacing.sm }}>
            Delivery address
          </Text>
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
              <Text variant="bodySmall" color="text.primary">
                Note: {order.customer_notes}
              </Text>
            </View>
          ) : null}
        </View>

        {canCancel ? (
          <Button
            onPress={handleCancel}
            variant="ghost"
            loading={cancelling}
            leftIcon={<X size={16} color={colors.feedback.error} />}
            style={{ marginTop: spacing.md }}
          >
            Cancel order
          </Button>
        ) : null}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
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
    gap: spacing.sm,
  },
  statusHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  sellerRow: {
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
});
