import { apiClient } from './client';
import type {
  Order,
  OrderStatus,
  OrderStatusEntry,
} from '@/types/domain.types';
import type { PaginatedResponse } from '@/types/api.types';

export interface SellerOrdersQuery {
  status?: OrderStatus | OrderStatus[];
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface UpdateOrderStatusInput {
  status: Exclude<OrderStatus, 'pending'>;
  estimated_ready_at?: string;   // required when transitioning pending → accepted
  reason?: string;               // required when transitioning → cancelled
  note?: string;
}

export const sellerOrdersApi = {
  list: (query: SellerOrdersQuery = {}) =>
    apiClient.get<unknown, PaginatedResponse<Order>>('/seller/orders', {
      params: query,
    }),

  get: (id: string) =>
    apiClient.get<unknown, { order: Order; history: OrderStatusEntry[] }>(
      `/seller/orders/${id}`,
    ),

  updateStatus: (id: string, input: UpdateOrderStatusInput) =>
    apiClient.patch<unknown, { order: Order }>(`/seller/orders/${id}/status`, input),

  cancel: (id: string, reason: string) =>
    apiClient.post<unknown, { order: Order }>(`/seller/orders/${id}/cancel`, {
      reason,
    }),
};
