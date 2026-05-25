import { View, StyleSheet } from 'react-native';
import { Check, X, Clock } from 'lucide-react-native';
import { Text } from '@/components/ui/Text';
import { colors, radii, spacing } from '@/theme';
import {
  ORDER_STATUS_META,
  TIMELINE_STATUSES,
} from '@/constants/orderStatus';
import { formatDateTime } from '@/utils/format';
import type { Order, OrderStatus, OrderStatusEntry } from '@/types/domain.types';

interface Props {
  order: Order;
  history: OrderStatusEntry[];
}

/**
 * Vertical stepper showing the order's progress.
 *   - Steps completed (history contains the to_status): filled circle + check
 *   - Current step: pulsing primary circle
 *   - Future steps: muted outlined circle
 *
 * Cancelled orders render an X badge instead of the active step.
 */
export function OrderTimeline({ order, history }: Props) {
  const isCancelled = order.status === 'cancelled';

  // Build a map of status → timestamp (from history) for the "happened at" labels.
  const timestamps = new Map<OrderStatus, string>();
  history.forEach((entry) => {
    timestamps.set(entry.to_status, entry.changed_at);
  });

  const currentStep = ORDER_STATUS_META[order.status].step;

  return (
    <View style={styles.root}>
      {isCancelled ? (
        <View style={styles.cancelledWrap}>
          <View style={styles.cancelledIcon}>
            <X size={18} color={colors.text.onPrimary} strokeWidth={3} />
          </View>
          <View style={styles.cancelledBody}>
            <Text variant="bodyBold">Cancelled</Text>
            {timestamps.has('cancelled') ? (
              <Text variant="caption" color="text.secondary">
                {formatDateTime(timestamps.get('cancelled')!)}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        TIMELINE_STATUSES.map((status, i) => {
          const meta = ORDER_STATUS_META[status];
          const ts = timestamps.get(status);
          const isPast = currentStep > meta.step;
          const isCurrent = currentStep === meta.step;
          const isLast = i === TIMELINE_STATUSES.length - 1;

          return (
            <View key={status} style={styles.step}>
              <View style={styles.stepRail}>
                <View
                  style={[
                    styles.dot,
                    isPast && { backgroundColor: meta.color, borderColor: meta.color },
                    isCurrent && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  {isPast ? (
                    <Check size={12} color={colors.text.onPrimary} strokeWidth={3} />
                  ) : isCurrent ? (
                    <Clock size={12} color={colors.text.onPrimary} strokeWidth={2.5} />
                  ) : null}
                </View>
                {!isLast ? (
                  <View
                    style={[
                      styles.line,
                      (isPast || isCurrent) && { backgroundColor: meta.color },
                    ]}
                  />
                ) : null}
              </View>

              <View style={styles.stepBody}>
                <Text
                  variant="bodyMedium"
                  color={isPast || isCurrent ? 'text.primary' : 'text.tertiary'}
                >
                  {meta.label}
                </Text>
                {ts ? (
                  <Text variant="caption" color="text.secondary">
                    {formatDateTime(ts)}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 0,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepRail: {
    alignItems: 'center',
    width: 24,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: -2,
    marginBottom: -2,
  },
  stepBody: {
    flex: 1,
    paddingBottom: spacing.lg,
    gap: 2,
  },
  cancelledWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  cancelledIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.feedback.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelledBody: { gap: 2 },
});
