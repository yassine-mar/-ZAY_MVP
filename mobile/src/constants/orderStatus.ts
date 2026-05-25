import { colors } from '@/theme';
import type { OrderStatus } from '@/types/domain.types';

interface StatusMeta {
  label: string;
  color: string;
  bg: string;
  /** Order of progress (-1 means terminal-failure, used to render strikes through cancelled). */
  step: number;
}

export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  pending:    { label: 'Pending',    color: colors.status.pending,    bg: '#FEF3C7', step: 0 },
  accepted:   { label: 'Accepted',   color: colors.status.accepted,   bg: '#D1FAE5', step: 1 },
  preparing:  { label: 'Preparing',  color: colors.status.preparing,  bg: '#DBEAFE', step: 2 },
  ready:      { label: 'Ready',      color: colors.status.ready,      bg: '#EDE9FE', step: 3 },
  delivered:  { label: 'Delivered',  color: colors.status.delivered,  bg: '#A7F3D0', step: 4 },
  cancelled:  { label: 'Cancelled',  color: colors.status.cancelled,  bg: '#FEE2E2', step: -1 },
};

/** Statuses considered "in flight" (not terminal). */
export const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'accepted', 'preparing', 'ready'];
export const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'cancelled'];

/** Customers can cancel only while the order is still pending. */
export function customerCanCancel(status: OrderStatus): boolean {
  return status === 'pending';
}

/** Seller phone is revealed after the order is accepted (Amendment 3). */
export function shouldShowSellerPhone(status: OrderStatus): boolean {
  return ['accepted', 'preparing', 'ready', 'delivered'].includes(status);
}

/** Ordered list of statuses to render in the timeline (skips cancelled). */
export const TIMELINE_STATUSES: OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'delivered',
];
