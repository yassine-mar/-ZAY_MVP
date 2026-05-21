'use strict';

jest.mock('../../src/services/notification.service', () => ({
  notifyOrderPlaced: jest.fn().mockResolvedValue(),
  notifyOrderStatusChanged: jest.fn().mockResolvedValue(),
  notifyOrderAutoCancelled: jest.fn().mockResolvedValue(),
  notifySellerApproved: jest.fn().mockResolvedValue(),
  notifySellerRejected: jest.fn().mockResolvedValue(),
  notifySellerSuspended: jest.fn().mockResolvedValue(),
  sendNotification: jest.fn().mockResolvedValue(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../../src/app');
const { db, closeDatabase } = require('../../src/config/database');
const env = require('../../src/config/env');
const {
  createTestUser,
  createTestSeller,
  truncateAuthTables,
} = require('../helpers/auth.helpers');
const {
  seedCategory,
  seedMenu,
  seedMenuItem,
  truncateMenuTables,
} = require('../helpers/menu.helpers');
const { truncateOrderTables } = require('../helpers/order.helpers');

let app;

beforeAll(() => {
  ({ app } = createApp());
});

afterEach(async () => {
  await truncateOrderTables();
  await truncateMenuTables();
  await truncateAuthTables();
});

afterAll(async () => {
  await closeDatabase();
});

const signCustomer = (user) =>
  jwt.sign({ sub: user.id, role: 'customer' }, env.JWT_SECRET, {
    algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN,
  });
const signSeller = (user, sellerStatus = 'approved') =>
  jwt.sign({ sub: user.id, role: 'seller', seller_status: sellerStatus }, env.JWT_SECRET, {
    algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN,
  });

const setupShop = async () => {
  const customer = await createTestUser();
  const customerToken = signCustomer(customer);
  const { user: sellerUser, sellerProfile } = await createTestSeller();
  const sellerToken = signSeller(sellerUser);
  const category = await seedCategory({
    slug: `c-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
  });
  const menu = await seedMenu(sellerProfile.id);
  const item = await seedMenuItem(menu.id, category.id, { price: 65 });
  return { customer, customerToken, sellerUser, sellerProfile, sellerToken, category, menu, item };
};

const placeOrder = async (customerToken, sellerProfile, item, quantity = 1) =>
  request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      seller_id: sellerProfile.id,
      items: [{ menu_item_id: item.id, quantity }],
      delivery_address: { street: '12 Rue Hassan II', city: 'Casablanca' },
      payment_method: 'cash',
    });

/* ── View incoming orders ─────────────────────────────────────────────── */

describe('GET /api/v1/seller/orders — view incoming orders', () => {
  it('returns paginated list scoped to this seller only', async () => {
    const shop = await setupShop();
    await placeOrder(shop.customerToken, shop.sellerProfile, shop.item, 2);
    await placeOrder(shop.customerToken, shop.sellerProfile, shop.item, 1);

    // Another seller's order — must NOT appear
    const otherShop = await setupShop();
    await placeOrder(otherShop.customerToken, otherShop.sellerProfile, otherShop.item, 1);

    const res = await request(app)
      .get('/api/v1/seller/orders')
      .set('Authorization', `Bearer ${shop.sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items.every((o) => o.seller.id === shop.sellerProfile.id)).toBe(true);
  });

  it('filters by status', async () => {
    const shop = await setupShop();
    const placed = await placeOrder(shop.customerToken, shop.sellerProfile, shop.item);
    // Accept one — leaves it as 'accepted', not 'pending'
    await request(app)
      .patch(`/api/v1/seller/orders/${placed.body.data.order.id}/status`)
      .set('Authorization', `Bearer ${shop.sellerToken}`)
      .send({ status: 'accepted', estimated_ready_at: new Date(Date.now() + 60 * 60_000).toISOString() })
      .expect(200);

    await placeOrder(shop.customerToken, shop.sellerProfile, shop.item);

    const pending = await request(app)
      .get('/api/v1/seller/orders?status=pending')
      .set('Authorization', `Bearer ${shop.sellerToken}`);
    expect(pending.body.data.items).toHaveLength(1);
    expect(pending.body.data.items[0].status).toBe('pending');

    const accepted = await request(app)
      .get('/api/v1/seller/orders?status=accepted')
      .set('Authorization', `Bearer ${shop.sellerToken}`);
    expect(accepted.body.data.items).toHaveLength(1);
    expect(accepted.body.data.items[0].status).toBe('accepted');
  });

  it('exposes customer name + phone (audience: seller)', async () => {
    const shop = await setupShop();
    await placeOrder(shop.customerToken, shop.sellerProfile, shop.item);

    const res = await request(app)
      .get('/api/v1/seller/orders')
      .set('Authorization', `Bearer ${shop.sellerToken}`);

    expect(res.body.data.items[0].customer).toBeDefined();
    expect(res.body.data.items[0].customer.phone).toBeTruthy();
  });
});

/* ── Accept (status update) + reject (cancel) ─────────────────────────── */

describe('Accept / reject order', () => {
  it('accepts a pending order with estimated_ready_at', async () => {
    const shop = await setupShop();
    const placed = await placeOrder(shop.customerToken, shop.sellerProfile, shop.item);
    const eta = new Date(Date.now() + 60 * 60_000).toISOString();

    const res = await request(app)
      .patch(`/api/v1/seller/orders/${placed.body.data.order.id}/status`)
      .set('Authorization', `Bearer ${shop.sellerToken}`)
      .send({ status: 'accepted', estimated_ready_at: eta });

    expect(res.status).toBe(200);
    expect(res.body.data.order.status).toBe('accepted');

    const row = await db.query(
      'SELECT accepted_at, estimated_ready_at FROM orders WHERE id = $1',
      [placed.body.data.order.id]
    );
    expect(row.rows[0].accepted_at).not.toBeNull();
    expect(row.rows[0].estimated_ready_at).not.toBeNull();
  });

  it('rejects a pending order via cancel with reason', async () => {
    const shop = await setupShop();
    const placed = await placeOrder(shop.customerToken, shop.sellerProfile, shop.item);

    const res = await request(app)
      .patch(`/api/v1/seller/orders/${placed.body.data.order.id}/cancel`)
      .set('Authorization', `Bearer ${shop.sellerToken}`)
      .send({ reason: 'Out of an essential ingredient' });

    expect(res.status).toBe(200);
    expect(res.body.data.order.status).toBe('cancelled');

    const row = await db.query(
      'SELECT cancellation_reason, cancelled_at FROM orders WHERE id = $1',
      [placed.body.data.order.id]
    );
    expect(row.rows[0].cancellation_reason).toContain('Out of an essential');
    expect(row.rows[0].cancelled_at).not.toBeNull();
  });
});

/* ── Update order status — full lifecycle ─────────────────────────────── */

describe('Update order status — full lifecycle', () => {
  it('runs pending → accepted → preparing → ready → delivered', async () => {
    const shop = await setupShop();
    const placed = await placeOrder(shop.customerToken, shop.sellerProfile, shop.item);
    const orderId = placed.body.data.order.id;

    const eta = new Date(Date.now() + 60 * 60_000).toISOString();
    const sequence = [
      { status: 'accepted', estimated_ready_at: eta },
      { status: 'preparing' },
      { status: 'ready' },
      { status: 'delivered' },
    ];

    for (const update of sequence) {
      const res = await request(app)
        .patch(`/api/v1/seller/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${shop.sellerToken}`)
        .send(update);
      expect(res.status).toBe(200);
    }

    const final = await db.query(
      'SELECT status, accepted_at, delivered_at FROM orders WHERE id = $1',
      [orderId]
    );
    expect(final.rows[0].status).toBe('delivered');
    expect(final.rows[0].accepted_at).not.toBeNull();
    expect(final.rows[0].delivered_at).not.toBeNull();
  });
});

/* ── View order history ───────────────────────────────────────────────── */

describe('GET /api/v1/seller/orders/:id/history', () => {
  it('returns the full status history in chronological order', async () => {
    const shop = await setupShop();
    const placed = await placeOrder(shop.customerToken, shop.sellerProfile, shop.item);
    const orderId = placed.body.data.order.id;

    const eta = new Date(Date.now() + 60 * 60_000).toISOString();
    await request(app)
      .patch(`/api/v1/seller/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${shop.sellerToken}`)
      .send({ status: 'accepted', estimated_ready_at: eta })
      .expect(200);
    await request(app)
      .patch(`/api/v1/seller/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${shop.sellerToken}`)
      .send({ status: 'preparing' })
      .expect(200);

    const res = await request(app)
      .get(`/api/v1/seller/orders/${orderId}/history`)
      .set('Authorization', `Bearer ${shop.sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.history).toHaveLength(3);
    expect(res.body.data.history.map((h) => h.to_status)).toEqual([
      'pending', 'accepted', 'preparing',
    ]);
    expect(res.body.data.history[1].changed_by).toBe(shop.sellerUser.id);
  });
});

/* ── Revenue / analytics ──────────────────────────────────────────────── */

describe('GET /api/v1/seller/analytics — revenue estimation', () => {
  it('returns zero shape for a brand-new seller', async () => {
    const shop = await setupShop();

    const res = await request(app)
      .get('/api/v1/seller/analytics')
      .set('Authorization', `Bearer ${shop.sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.analytics.revenue.this_month).toBe(0);
    expect(res.body.data.analytics.orders.all_time).toBe(0);
    expect(res.body.data.analytics.top_items).toEqual([]);
    expect(res.body.data.analytics.orders.completion_rate).toBeNull();
  });

  it('aggregates revenue from delivered orders only', async () => {
    const shop = await setupShop();

    // 1. Place + deliver one order
    const placed = await placeOrder(shop.customerToken, shop.sellerProfile, shop.item, 2);
    const orderId = placed.body.data.order.id;
    const eta = new Date(Date.now() + 60 * 60_000).toISOString();
    for (const status of ['accepted', 'preparing', 'ready', 'delivered']) {
      await request(app)
        .patch(`/api/v1/seller/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${shop.sellerToken}`)
        .send(status === 'accepted' ? { status, estimated_ready_at: eta } : { status })
        .expect(200);
    }

    // 2. Place + cancel another (revenue should NOT include it)
    const cancelled = await placeOrder(shop.customerToken, shop.sellerProfile, shop.item, 5);
    await request(app)
      .patch(`/api/v1/seller/orders/${cancelled.body.data.order.id}/cancel`)
      .set('Authorization', `Bearer ${shop.sellerToken}`)
      .send({ reason: 'Out of stock' })
      .expect(200);

    // 3. Leave one pending — counts toward pending revenue
    await placeOrder(shop.customerToken, shop.sellerProfile, shop.item, 1);

    const res = await request(app)
      .get('/api/v1/seller/analytics')
      .set('Authorization', `Bearer ${shop.sellerToken}`);

    const { analytics } = res.body.data;

    // Revenue this month = 65 * 2 = 130 (delivered only)
    expect(analytics.revenue.this_month).toBe(130);
    expect(analytics.revenue.all_time).toBe(130);

    // by_status: 1 delivered, 1 cancelled, 1 pending
    expect(analytics.orders.by_status.delivered).toBe(1);
    expect(analytics.orders.by_status.cancelled).toBe(1);
    expect(analytics.orders.by_status.pending).toBe(1);

    // completion_rate = 1 delivered / (1 delivered + 1 cancelled) = 0.5
    expect(analytics.orders.completion_rate).toBeCloseTo(0.5, 4);

    // Top items should include our tagine
    expect(analytics.top_items.length).toBeGreaterThan(0);
    expect(analytics.top_items[0].name).toBe('Tagine Poulet aux Olives');
  });

  it('rejects analytics for pending (not-yet-approved) sellers', async () => {
    const { user } = await createTestSeller({ sellerStatus: 'pending' });
    const token = signSeller(user, 'pending');

    const res = await request(app)
      .get('/api/v1/seller/analytics')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SELLER_NOT_APPROVED');
  });
});
