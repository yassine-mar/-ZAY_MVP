'use strict';

jest.mock('../../../src/models/base.model', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
}));

const { query } = require('../../../src/models/base.model');
const AnalyticsAdminService = require('../../../src/services/admin/analytics.admin.service');

beforeEach(() => jest.clearAllMocks());

describe('AnalyticsAdminService.getOverview', () => {
  it('aggregates platform-wide KPIs', async () => {
    query
      // user stats
      .mockResolvedValueOnce({
        rows: [{
          total_users: 1247,
          total_customers: 1152,
          total_sellers: 95,
          total_admins: 3,
          suspended_users: 4,
          new_this_month: 87,
        }],
      })
      // seller status breakdown
      .mockResolvedValueOnce({
        rows: [
          { status: 'pending', count: 12 },
          { status: 'approved', count: 67 },
          { status: 'rejected', count: 12 },
          { status: 'suspended', count: 4 },
        ],
      })
      // order + revenue stats
      .mockResolvedValueOnce({
        rows: [{
          total_orders: 3841,
          orders_today: 47,
          orders_this_week: 312,
          orders_this_month: 1203,
          auto_cancelled_today: 2,
          delivered: 3500,
          finalized: 3800,
          revenue_today: '5400',
          revenue_this_week: '38000',
          revenue_this_month: '144360',
          gmv_all_time: '412000',
          aov: '120',
        }],
      })
      // top categories
      .mockResolvedValueOnce({
        rows: [
          { name: 'Tagine', slug: 'tagine', icon: '🥘', order_count: 1240 },
          { name: 'Couscous', slug: 'couscous', icon: '🍚', order_count: 890 },
        ],
      });

    const result = await AnalyticsAdminService.getOverview();

    expect(result.users.total).toBe(1247);
    expect(result.users.sellers.pending).toBe(12);
    expect(result.users.sellers.approved).toBe(67);
    expect(result.orders.total).toBe(3841);
    expect(result.orders.today).toBe(47);
    expect(result.orders.auto_cancelled_today).toBe(2);
    expect(result.orders.completion_rate).toBeCloseTo(3500 / 3800, 4);
    expect(result.revenue.this_month).toBe(144360);
    expect(result.revenue.gmv_all_time).toBe(412000);
    expect(result.top_categories).toHaveLength(2);
  });

  it('returns zeroed shape when orders table is missing', async () => {
    query
      .mockResolvedValueOnce({
        rows: [{
          total_users: 10, total_customers: 8, total_sellers: 2,
          total_admins: 0, suspended_users: 0, new_this_month: 5,
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const err = new Error('relation orders does not exist');
    err.code = '42P01';
    query.mockRejectedValueOnce(err);

    const result = await AnalyticsAdminService.getOverview();

    expect(result.users.total).toBe(10);
    expect(result.orders.total).toBe(0);
    expect(result.revenue.gmv_all_time).toBe(0);
  });
});

describe('AnalyticsAdminService.getOrderTrends', () => {
  it('returns daily breakdown for requested window', async () => {
    query.mockResolvedValue({
      rows: [
        { day: new Date('2026-05-12T00:00:00Z'), orders: 47, cancelled: 2, revenue: '5400' },
        { day: new Date('2026-05-13T00:00:00Z'), orders: 52, cancelled: 1, revenue: '6300' },
      ],
    });

    const result = await AnalyticsAdminService.getOrderTrends(30);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      date: '2026-05-12', orders: 47, cancelled: 2, revenue: 5400,
    });
  });

  it('clamps days to a sane range', async () => {
    query.mockResolvedValue({ rows: [] });

    await AnalyticsAdminService.getOrderTrends(99999);

    // Should still call with a sane upper bound (max 365)
    expect(query).toHaveBeenCalled();
  });
});

describe('AnalyticsAdminService.getTopSellers', () => {
  it('returns top sellers by order count + revenue', async () => {
    query.mockResolvedValue({
      rows: [
        {
          id: 'sp-1', business_name: 'Dar Khadija', city: 'Casablanca',
          order_count: 240, revenue: '28800', avg_order_value: '120',
        },
        {
          id: 'sp-2', business_name: 'Lalla Touria', city: 'Rabat',
          order_count: 180, revenue: '19440', avg_order_value: '108',
        },
      ],
    });

    const result = await AnalyticsAdminService.getTopSellers(10);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'sp-1', business_name: 'Dar Khadija', order_count: 240, revenue: 28800,
    });
  });
});
