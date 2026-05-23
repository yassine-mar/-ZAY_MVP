import { apiClient } from './client';
import type { Seller, SellerStatus } from '@/types/domain.types';
import type { PaginatedResponse } from '@/types/api.types';

export interface SellersListQuery {
  page?: number;
  limit?: number;
  status?: SellerStatus;
  city?: string;
}

export const sellersApi = {
  list: (params: SellersListQuery) =>
    apiClient.get<unknown, PaginatedResponse<Seller>>('/admin/sellers', { params }),

  get: (id: string) =>
    apiClient.get<unknown, { seller: Seller }>(`/admin/sellers/${id}`),

  approve: (id: string, note?: string) =>
    apiClient.patch<unknown, { seller: Seller }>(`/admin/sellers/${id}/approve`, { note }),

  reject: (id: string, reason: string) =>
    apiClient.patch<unknown, { seller: Seller }>(`/admin/sellers/${id}/reject`, { reason }),

  suspend: (id: string, reason: string) =>
    apiClient.patch<unknown, { seller: Seller }>(`/admin/sellers/${id}/suspend`, { reason }),
};
