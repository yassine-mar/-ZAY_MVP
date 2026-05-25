import { ChefHat, PackageCheck, Truck } from 'lucide-react-native';
import type { OrderStatus } from '@/types/domain.types';

/**
 * Seller status-transition state machine.
 *
 *   pending     → accept (with estimated_ready_at)
 *   accepted    → mark preparing
 *   preparing   → mark ready
 *   ready       → mark delivered
 *   delivered   → (terminal)
 *   cancelled   → (terminal)
 *
 * Cancel is available at every non-terminal step but is a destructive
 * action — render in a separate visual slot.
 */
interface TransitionAction {
  toStatus: Exclude<OrderStatus, 'pending'>;
  label: string;
  variant: 'primary' | 'destructive';
  /** Icon component for the action button. */
  icon?: typeof ChefHat;
  /** Requires an estimated_ready_at value in the payload. */
  requiresETA?: boolean;
  /** Requires a reason string. */
  requiresReason?: boolean;
}

export const PRIMARY_TRANSITION: Record<
  Exclude<OrderStatus, 'delivered' | 'cancelled'>,
  TransitionAction | null
> = {
  pending:   { toStatus: 'accepted',  label: 'Accept order', variant: 'primary', requiresETA: true },
  accepted:  { toStatus: 'preparing', label: 'Start preparing', variant: 'primary', icon: ChefHat },
  preparing: { toStatus: 'ready',     label: 'Mark as ready', variant: 'primary', icon: PackageCheck },
  ready:     { toStatus: 'delivered', label: 'Mark as delivered', variant: 'primary', icon: Truck },
};

export const CANCEL_ACTION: TransitionAction = {
  toStatus: 'cancelled',
  label: 'Cancel order',
  variant: 'destructive',
  requiresReason: true,
};

export function sellerCanAct(status: OrderStatus): boolean {
  return !['delivered', 'cancelled'].includes(status);
}
