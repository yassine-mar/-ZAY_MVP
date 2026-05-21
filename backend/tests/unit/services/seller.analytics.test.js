'use strict';

jest.mock('../../../src/models/base.model', () => ({
  query: jest.fn(),
  withTransaction: jest.fn(),
}));

const { query } = require('../../../src/models/base.model');
const SellerService = require('../../../src/services/seller.service');

const sellerUser = { id: 'u-seller', role: 'seller', sellerProfile: { id: 'sp-1' } };

beforeEach(() => jest.clearAllMocks());

const statsRow = (overrides = {}) => ({
  revenue_today: 0,
  revenue_this_week: 0,
  revenue_this_month: 0,
  revenue_all_time: 0,
  revenue_pending: 0,
  aov_delivered: 0,
  orders_today: 0,
  orders_this_week: 0,
  orders_this_month: 0,
  orders_all_time: 0,
  status_pending: 0,
  status_accepted: 0,
  status_preparing: 0,
  status_ready: 0,
  status_delivered: 0,
  status_cancelled: 0,
  ...overrides,
});

describe('SellerService.getAnalytics', () => {
  it('returns zeroed shape when the orders table does not exist (staged build)', async () => {
    const err = new Error('relation "orders" does not exist');
    err.code = '42P01';
    query.mockRejectedValue(err);

    const result = await SellerService.getAnalytics(sellerUser);

    expect(result).toEqual(SellerService.EMPTY_ANALYTICS);
  });

  it('returns full analytics shape for an active seller', async () => {
    query
      .mockResolvedValueOnce({
        rows: [statsRow({
          revenue_today: '1200',
          revenue_this_week: '8400',
          revenue_this_month: '32000',
          revenue_all_time: '145000',
          revenue_pending: '800',
          aov_delivered: '120.5',
          orders_today: 12,
          orders_this_week: 84,
          orders_this_month: 320,
          orders_all_time: 1450,
          status_pending: 2,
          status_accepted: 1,
          status_preparing: 2,
          status_ready: 1,
          status_delivered: 1200,
          status_cancelled: 250,
        })],
      })
      .mockResolvedValueOnce({
        rows: [
          { day: new Date('2024-05-12T00:00:00Z'), orders: 12, revenue: '1200' },
          { day: new Date('2024-05-13T00:00:00Z'), orders: 15, revenue: '1500' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { id: 'mi-1', name: 'Tagine', image_url: null, order_count: 200, revenue: '13000' },
          { id: 'mi-2', name: 'Couscous', image_url: null, order_count: 150, revenue: '9000' },
        ],
      });

    const result = await SellerService.getAnalytics(sellerUser);

    // Revenue
    expect(result.revenue.today).toBe(1200);
    expect(result.revenue.this_month).toBe(32000);
    expect(result.revenue.pending).toBe(800);
    expect(result.revenue.average_order_value).toBe(120.5);

    // Orders
    expect(result.orders.today).toBe(12);
    expect(result.orders.this_month).toBe(320);
    expect(result.orders.by_status.delivered).toBe(1200);

    // completion_rate = 1200 / (1200 + 250) = 0.8276
    expect(result.orders.completion_rate).toBeCloseTo(0.8276, 4);

    // Trends shape
    expect(result.trends.daily_last_7_days).toHaveLength(2);
    expect(result.trends.daily_last_7_days[0]).toEqual({
      date: '2024-05-12',
      orders: 12,
      revenue: 1200,
    });

    // Top items
    expect(result.top_items).toHaveLength(2);
    expect(result.top_items[0]).toMatchObject({
      id: 'mi-1', name: 'Tagine', order_count: 200, revenue: 13000,
    });
  });

  it('returns completion_rate=null when no orders are finalized yet', async () => {
    query
      .mockResolvedValueOnce({
        rows: [statsRow({ status_pending: 3, status_accepted: 2 })],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await SellerService.getAnalytics(sellerUser);

    expect(result.orders.completion_rate).toBeNull();
  });

  it('100% completion rate when no cancellations', async () => {
    query
      .mockResolvedValueOnce({
        rows: [statsRow({ status_delivered: 100, status_cancelled: 0 })],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await SellerService.getAnalytics(sellerUser);

    expect(result.orders.completion_rate).toBe(1);
  });

  it('runs all three queries in parallel (single Promise.all)', async () => {
    query.mockResolvedValue({ rows: [statsRow()] });
    query.mockResolvedValueOnce({ rows: [statsRow()] })
         .mockResolvedValueOnce({ rows: [] })
         .mockResolvedValueOnce({ rows: [] });

    await SellerService.getAnalytics(sellerUser);

    // Three queries total — stats, daily, top items
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('propagates non-42P01 errors', async () => {
    const err = new Error('connection lost');
    err.code = '08006';
    query.mockRejectedValue(err);

    await expect(SellerService.getAnalytics(sellerUser)).rejects.toThrow('connection lost');
  });
});
