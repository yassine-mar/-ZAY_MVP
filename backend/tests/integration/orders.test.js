'use strict';

// Mock notification service to avoid Firebase init and side-effect noise.
jest.mock('../../src/services/notification.service', () => ({
  notifyOrderPlaced: jest.fn().mockResolvedValue(),
  notifyOrderStatusChanged: jest.fn().mockResolvedValue(),
  notifyOrderAutoCancelled: jest.fn().mockResolvedValue(),
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

const signSeller = (user) =>
  jwt.sign(
    { sub: user.id, role: 'seller', seller_status: 'approved' },
    env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN }
  );

const fullSetup = async ({ itemPrice = 65, secondItemPrice = 25 } = {}) => {
  const customer = await createTestUser();
  const customerToken = signCustomer(customer);
  const { user: sellerAccountUser, sellerProfile } = await createTestSeller();
  const sellerToken = signSeller(sellerAccountUser);
  const category = await seedCategory({
    slug: `c-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
  });
  const menu = await seedMenu(sellerProfile.id);
  const item1 = await seedMenuItem(menu.id, category.id, { price: itemPrice });
  const item2 = await seedMenuItem(menu.id, category.id, {
    name: 'Harira',
    price: secondItemPrice,
  });
  return {
    customer, customerToken,
    sellerAccountUser, sellerProfile, sellerToken,
    category, menu, item1, item2,
  };
};

const validOrderBody = (item1, item2) => ({
  seller_id: undefined, // filled by caller from sellerProfile
  items: [
    { menu_item_id: item1.id, quantity: 2 },
    { menu_item_id: item2.id, quantity: 1 },
  ],
  delivery_address: { street: '12 Rue Hassan II', city: 'Casablanca' },
  customer_notes: 'No spicy',
  payment_method: 'cash',
});

describe('POST /api/v1/orders — create order', () => {
  it('creates an order with server-side total', async () => {
    const { customerToken, sellerProfile, item1, item2 } = await fullSetup();

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ ...validOrderBody(item1, item2), seller_id: sellerProfile.id });

    expect(res.status).toBe(201);
    expect(res.body.data.order.status).toBe('pending');
    expect(Number(res.body.data.order.total_amount)).toBe(65 * 2 + 25); // 155
    expect(res.body.data.order.items).toHaveLength(2);

    // DB verification: history row exists
    const history = await db.query(
      'SELECT * FROM order_status_history WHERE order_id = $1',
      [res.body.data.order.id]
    );
    expect(history.rows).toHaveLength(1);
    expect(history.rows[0].to_status).toBe('pending');
    expect(history.rows[0].from_status).toBeNull();
  });

  it('snapshots name + price into order_items', async () => {
    const { customerToken, sellerProfile, item1, item2 } = await fullSetup();

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ ...validOrderBody(item1, item2), seller_id: sellerProfile.id });

    const itemRows = await db.query(
      'SELECT name, price, quantity, subtotal FROM order_items WHERE order_id = $1 ORDER BY price DESC',
      [res.body.data.order.id]
    );
    expect(itemRows.rows[0].name).toBe('Tagine Poulet aux Olives');
    expect(Number(itemRows.rows[0].price)).toBe(65);
    expect(Number(itemRows.rows[0].subtotal)).toBe(130);
  });

  it('replays the same order on idempotency key reuse', async () => {
    const { customerToken, sellerProfile, item1, item2 } = await fullSetup();
    const key = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

    const first = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', key)
      .send({ ...validOrderBody(item1, item2), seller_id: sellerProfile.id });

    const replay = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', key)
      .send({ ...validOrderBody(item1, item2), seller_id: sellerProfile.id });

    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(replay.body.data.order.id).toBe(first.body.data.order.id);

    const rowCount = await db.query('SELECT COUNT(*) FROM orders WHERE idempotency_key = $1', [key]);
    expect(Number(rowCount.rows[0].count)).toBe(1);
  });

  it('rejects order when seller is closed', async () => {
    const { customerToken, sellerProfile, item1, item2 } = await fullSetup();
    await db.query('UPDATE seller_profiles SET is_open = FALSE WHERE id = $1', [sellerProfile.id]);

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ ...validOrderBody(item1, item2), seller_id: sellerProfile.id });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('SELLER_CLOSED');
  });

  it('rejects unavailable items with structured details', async () => {
    const { customerToken, sellerProfile, item1, item2 } = await fullSetup();
    await db.query('UPDATE menu_items SET is_available = FALSE WHERE id = $1', [item2.id]);

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ ...validOrderBody(item1, item2), seller_id: sellerProfile.id });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('UNPROCESSABLE');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ menu_item_id: item2.id }),
      ])
    );
  });

  it('rejects cross-seller order', async () => {
    const { customerToken, sellerProfile, item1 } = await fullSetup();
    const { sellerProfile: otherSeller } = await createTestSeller();
    const otherCategory = await seedCategory({ slug: `c-${Date.now()}-${Math.random()}` });
    const otherMenu = await seedMenu(otherSeller.id);
    const otherItem = await seedMenuItem(otherMenu.id, otherCategory.id);

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        seller_id: sellerProfile.id,
        items: [
          { menu_item_id: item1.id, quantity: 1 },
          { menu_item_id: otherItem.id, quantity: 1 },
        ],
        delivery_address: { street: '12 Rue Hassan II', city: 'Casablanca' },
        payment_method: 'cash',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CROSS_SELLER_ORDER');
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).post('/api/v1/orders').send({});
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/orders/:id', () => {
  it('returns the order to its owner', async () => {
    const { customerToken, sellerProfile, item1, item2 } = await fullSetup();
    const placed = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ ...validOrderBody(item1, item2), seller_id: sellerProfile.id });

    const res = await request(app)
      .get(`/api/v1/orders/${placed.body.data.order.id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.order.id).toBe(placed.body.data.order.id);
  });

  it('returns 404 to another customer (no enumeration)', async () => {
    const { customerToken, sellerProfile, item1, item2 } = await fullSetup();
    const placed = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ ...validOrderBody(item1, item2), seller_id: sellerProfile.id });

    const bob = await createTestUser();
    const bobToken = signCustomer(bob);

    const res = await request(app)
      .get(`/api/v1/orders/${placed.body.data.order.id}`)
      .set('Authorization', `Bearer ${bobToken}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/orders/:id/cancel — customer cancel', () => {
  it('cancels a pending order', async () => {
    const { customerToken, sellerProfile, item1, item2 } = await fullSetup();
    const placed = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ ...validOrderBody(item1, item2), seller_id: sellerProfile.id });

    const res = await request(app)
      .patch(`/api/v1/orders/${placed.body.data.order.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.order.status).toBe('cancelled');

    const dbRow = await db.query(
      'SELECT status, cancelled_at FROM orders WHERE id = $1',
      [placed.body.data.order.id]
    );
    expect(dbRow.rows[0].status).toBe('cancelled');
    expect(dbRow.rows[0].cancelled_at).not.toBeNull();
  });

  it('rejects cancel of an accepted order (status machine)', async () => {
    const { customerToken, sellerToken, sellerProfile, item1, item2 } = await fullSetup();
    const placed = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ ...validOrderBody(item1, item2), seller_id: sellerProfile.id });

    // Seller accepts
    await request(app)
      .patch(`/api/v1/seller/orders/${placed.body.data.order.id}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        status: 'accepted',
        estimated_ready_at: new Date(Date.now() + 60 * 60_000).toISOString(),
      })
      .expect(200);

    // Customer tries to cancel — must be rejected
    const res = await request(app)
      .patch(`/api/v1/orders/${placed.body.data.order.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });
});

describe('PATCH /api/v1/seller/orders/:id/status — full lifecycle', () => {
  it('runs the happy path: pending → accepted → preparing → ready → delivered', async () => {
    const { customerToken, sellerToken, sellerProfile, item1, item2 } = await fullSetup();

    const placed = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ ...validOrderBody(item1, item2), seller_id: sellerProfile.id });
    const orderId = placed.body.data.order.id;

    const transitions = [
      { status: 'accepted', estimated_ready_at: new Date(Date.now() + 60 * 60_000).toISOString() },
      { status: 'preparing' },
      { status: 'ready' },
      { status: 'delivered' },
    ];

    for (const transition of transitions) {
      const res = await request(app)
        .patch(`/api/v1/seller/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(transition);
      expect(res.status).toBe(200);
      expect(res.body.data.order.status).toBe(transition.status);
    }

    // Final state checks
    const row = await db.query(
      'SELECT status, accepted_at, delivered_at FROM orders WHERE id = $1',
      [orderId]
    );
    expect(row.rows[0].status).toBe('delivered');
    expect(row.rows[0].accepted_at).not.toBeNull();
    expect(row.rows[0].delivered_at).not.toBeNull();

    // History should have 5 rows: initial pending + 4 transitions
    const history = await db.query(
      'SELECT to_status FROM order_status_history WHERE order_id = $1 ORDER BY changed_at ASC',
      [orderId]
    );
    expect(history.rows.map((r) => r.to_status)).toEqual([
      'pending', 'accepted', 'preparing', 'ready', 'delivered',
    ]);
  });

  it('rejects an invalid transition (delivered → accepted)', async () => {
    const { customerToken, sellerToken, sellerProfile, item1, item2 } = await fullSetup();
    const placed = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ ...validOrderBody(item1, item2), seller_id: sellerProfile.id });
    const orderId = placed.body.data.order.id;

    // Drive to delivered
    for (const status of ['accepted', 'preparing', 'ready', 'delivered']) {
      await request(app)
        .patch(`/api/v1/seller/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(
          status === 'accepted'
            ? { status, estimated_ready_at: new Date(Date.now() + 60 * 60_000).toISOString() }
            : { status }
        )
        .expect(200);
    }

    // Try to reverse
    const res = await request(app)
      .patch(`/api/v1/seller/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'accepted' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('returns 404 when seller does not own the order', async () => {
    const { customerToken, sellerProfile, item1, item2 } = await fullSetup();
    const placed = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ ...validOrderBody(item1, item2), seller_id: sellerProfile.id });

    const { user: otherSellerUser } = await createTestSeller();
    const otherToken = signSeller(otherSellerUser);

    const res = await request(app)
      .patch(`/api/v1/seller/orders/${placed.body.data.order.id}/status`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ status: 'accepted', estimated_ready_at: new Date(Date.now() + 60 * 60_000).toISOString() });

    expect(res.status).toBe(404);
  });
});
