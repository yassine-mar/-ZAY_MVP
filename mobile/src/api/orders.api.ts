import { apiClient } from './client';
import type {
  CartValidationResult,
  Order,
  OrderStatus,
  OrderStatusEntry,
  PlaceOrderInput,
} from '@/types/domain.types';
import type { PaginatedResponse } from '@/types/api.types';

export interface ListOrdersQuery {
  status?: OrderStatus | OrderStatus[];
  page?: number;
  limit?: number;
}

export const ordersApi = {
  list: (query: ListOrdersQuery = {}) =>
    apiClient.get<unknown, PaginatedResponse<Order>>('/orders', { params: query }),

  get: (id: string) =>
    apiClient.get<unknown, { order: Order; history: OrderStatusEntry[] }>(
      `/orders/${id}`,
    ),

  /**
   * Cart reconciliation — runs on CheckoutScreen mount so we never let the
   * customer get to the address form with a cart that will 422 on submit.
   * (Critique Issue #3 in 06_MOBILE_ARCHITECTURE.md.)
   */
  validateCart: (items: Array<{ menu_item_id: string; quantity: number }>) =>
    apiClient.post<unknown, CartValidationResult>('/cart/validate', { items }),

  place: (input: PlaceOrderInput, idempotencyKey: string) =>
    apiClient.post<unknown, { order: Order }>('/orders', input, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),

  cancel: (id: string, reason?: string) =>
    apiClient.post<unknown, { order: Order }>(`/orders/${id}/cancel`, { reason }),
};
