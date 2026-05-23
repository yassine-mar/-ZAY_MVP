import { apiClient } from './client';
import type { Order, OrderStatus, OrderStatusHistoryEntry } from '@/types/domain.types';
import type { PaginatedResponse } from '@/types/api.types';

export interface OrdersListQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  seller_id?: string;
  customer_id?: string;
  from_date?: string;
  to_date?: string;
  auto_cancelled?: boolean;
}

export const ordersApi = {
  list: (params: OrdersListQuery) =>
    apiClient.get<unknown, PaginatedResponse<Order>>('/admin/orders', { params }),

  get: (id: string) =>
    apiClient.get<unknown, { order: Order; history: OrderStatusHistoryEntry[] }>(
      `/admin/orders/${id}`
    ),

  forceCancel: (id: string, reason: string) =>
    apiClient.patch<unknown, { order: Order }>(`/admin/orders/${id}/cancel`, { reason }),
};
