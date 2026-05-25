import { apiClient } from './client';
import type {
  Category,
  MenuItem,
  PaginatedResponse,
  SellerDetail,
  SellerSummary,
} from '@/types/domain.types';
import type { PaginatedResponse as _Paginated } from '@/types/api.types';

export interface BrowseItemsQuery {
  search?: string;
  category_id?: string;
  seller_id?: string;
  page?: number;
  limit?: number;
}

export interface BrowseSellersQuery {
  city?: string;
  page?: number;
  limit?: number;
}

export const browseApi = {
  categories: () =>
    apiClient.get<unknown, { categories: Category[] }>('/browse/categories'),

  featuredItems: () =>
    apiClient.get<unknown, { items: MenuItem[] }>('/browse/featured'),

  sellers: (query: BrowseSellersQuery = {}) =>
    apiClient.get<unknown, _Paginated<SellerSummary>>('/browse/sellers', {
      params: query,
    }),

  seller: (id: string) =>
    apiClient.get<unknown, { seller: SellerDetail }>(`/browse/sellers/${id}`),

  items: (query: BrowseItemsQuery = {}) =>
    apiClient.get<unknown, _Paginated<MenuItem>>('/browse/items', {
      params: query,
    }),

  item: (id: string) =>
    apiClient.get<unknown, { item: MenuItem }>(`/browse/items/${id}`),
};

// Re-export to make the type accessible to consumers via this module.
export type { PaginatedResponse } from '@/types/api.types';
