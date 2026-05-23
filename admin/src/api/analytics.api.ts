import { apiClient } from './client';
import type {
  AnalyticsOverview,
  OrderTrendPoint,
  TopSeller,
} from '@/types/domain.types';

export const analyticsApi = {
  overview: () =>
    apiClient.get<unknown, { overview: AnalyticsOverview }>(
      '/admin/analytics/overview'
    ),

  orderTrends: (days = 30) =>
    apiClient.get<unknown, { trends: OrderTrendPoint[] }>(
      '/admin/analytics/orders',
      { params: { days } }
    ),

  topSellers: (limit = 10) =>
    apiClient.get<unknown, { top_sellers: TopSeller[] }>(
      '/admin/analytics/sellers',
      { params: { limit } }
    ),
};
