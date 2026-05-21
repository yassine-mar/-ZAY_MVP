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
  createTestAdmin,
  generateAdminToken,
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

/* ── Admin auth & RBAC ────────────────────────────────────────────────── */

describe('Admin authentication (RBAC)', () => {
  it('rejects user tokens on admin endpoints (separate JWT secret)', async () => {
    const customer = await createTestUser();
    const userToken = signCustomer(customer);

    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${userToken}`);

    // Token signature verifies against JWT_SECRET, not ADMIN_JWT_SECRET → rejected
    expect(res.status).toBe(401);
  });

  it('rejects requests with no token', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    expect(res.status).toBe(401);
  });

  it('accepts a valid admin token', async () => {
    const admin = await createTestAdmin();
    const token = generateAdminToken(admin);

    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('POST /admin/auth/login returns admin access token', async () => {
    await createTestAdmin({ email: 'admin@test.com', password: 'AdminPass1!' });

    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: 'admin@test.com', password: 'AdminPass1!' });

    expect(res.status).toBe(200);
    expect(res.body.data.access_token).toBeDefined();
    expect(res.body.data.token_type).toBe('Bearer');
    expect(res.body.data.user.role).toBe('admin');
  });

  it('admin login rejects non-admin credentials with generic error', async () => {
    await createTestUser({ email: 'regular@test.com', password: 'Pass1!' });

    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: 'regular@test.com', password: 'Pass1!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

/* ── User management ──────────────────────────────────────────────────── */

describe('Admin user management', () => {
  const setupAdmin = async () => {
    const admin = await createTestAdmin();
    return { admin, token: generateAdminToken(admin) };
  };

  it('GET /admin/users returns paginated list with filters', async () => {
    const { token } = await setupAdmin();
    await createTestUser({ role: 'customer' });
    await createTestUser({ role: 'customer' });
    await createTestSeller();

    const customersOnly = await request(app)
      .get('/api/v1/admin/users?role=customer')
      .set('Authorization', `Bearer ${token}`);

    expect(customersOnly.status).toBe(200);
    // 2 customers + 1 admin (the admin itself) — depends on what counts as
    // customer. We filter only customer role.
    expect(customersOnly.body.data.items.every((u) => u.role === 'customer')).toBe(true);
    expect(customersOnly.body.data.items.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /admin/users/:id returns detail with order summary', async () => {
    const { token } = await setupAdmin();
    const customer = await createTestUser();

    const res = await request(app)
      .get(`/api/v1/admin/users/${customer.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(customer.id);
    expect(res.body.data.user.order_summary).toBeDefined();
    expect(res.body.data.user.order_summary.total_orders).toBe(0);
  });

  it('PATCH /admin/users/:id/suspend suspends a user with audit', async () => {
    const { admin, token } = await setupAdmin();
    const customer = await createTestUser();

    const res = await request(app)
      .patch(`/api/v1/admin/users/${customer.id}/suspend`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Repeated abusive behavior' });

    expect(res.status).toBe(200);

    const row = await db.query(
      'SELECT status, suspended_at, suspended_by, suspension_reason FROM users WHERE id = $1',
      [customer.id]
    );
    expect(row.rows[0].status).toBe('suspended');
    expect(row.rows[0].suspended_at).not.toBeNull();
    expect(row.rows[0].suspended_by).toBe(admin.id);
    expect(row.rows[0].suspension_reason).toBe('Repeated abusive behavior');
  });

  it('prevents an admin from suspending themselves', async () => {
    const { admin, token } = await setupAdmin();

    const res = await request(app)
      .patch(`/api/v1/admin/users/${admin.id}/suspend`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'self-test' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_SUSPEND_SELF');
  });

  it('rejects suspend without reason', async () => {
    const { token } = await setupAdmin();
    const customer = await createTestUser();

    const res = await request(app)
      .patch(`/api/v1/admin/users/${customer.id}/suspend`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('refuses to suspend an already-suspended user', async () => {
    const { token } = await setupAdmin();
    const suspended = await createTestUser({ status: 'suspended' });

    const res = await request(app)
      .patch(`/api/v1/admin/users/${suspended.id}/suspend`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'already done' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });
});

/* ── Order monitoring ─────────────────────────────────────────────────── */

describe('Admin order monitoring', () => {
  const setupAdminWithOrder = async () => {
    const admin = await createTestAdmin();
    const adminToken = generateAdminToken(admin);
    const customer = await createTestUser();
    const customerToken = signCustomer(customer);
    const { sellerProfile } = await createTestSeller();
    const category = await seedCategory({
      slug: `c-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    });
    const menu = await seedMenu(sellerProfile.id);
    const item = await seedMenuItem(menu.id, category.id);

    const placed = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        seller_id: sellerProfile.id,
        items: [{ menu_item_id: item.id, quantity: 1 }],
        delivery_address: { street: '12 Rue Test', city: 'Casablanca' },
        payment_method: 'cash',
      });
    return { admin, adminToken, customer, sellerProfile, order: placed.body.data.order };
  };

  it('GET /admin/orders returns paginated orders across all sellers', async () => {
    const { adminToken } = await setupAdminWithOrder();

    const res = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
  });

  it('GET /admin/orders/:id returns full detail with status history', async () => {
    const { adminToken, order } = await setupAdminWithOrder();

    const res = await request(app)
      .get(`/api/v1/admin/orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.order.id).toBe(order.id);
    expect(res.body.data.history).toHaveLength(1);
    expect(res.body.data.history[0].to_status).toBe('pending');
  });

  it('PATCH /admin/orders/:id/cancel force-cancels with audit', async () => {
    const { admin, adminToken, order } = await setupAdminWithOrder();

    const res = await request(app)
      .patch(`/api/v1/admin/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Seller went offline mid-prep' });

    expect(res.status).toBe(200);
    expect(res.body.data.order.status).toBe('cancelled');

    const row = await db.query(
      'SELECT status, cancellation_reason FROM orders WHERE id = $1',
      [order.id]
    );
    expect(row.rows[0].status).toBe('cancelled');
    expect(row.rows[0].cancellation_reason).toContain('Seller went offline');

    // History records admin as the actor
    const history = await db.query(
      'SELECT changed_by, to_status FROM order_status_history WHERE order_id = $1 ORDER BY changed_at',
      [order.id]
    );
    const cancelEntry = history.rows.find((r) => r.to_status === 'cancelled');
    expect(cancelEntry.changed_by).toBe(admin.id);
  });

  it('refuses to force-cancel a delivered order', async () => {
    const { adminToken, sellerProfile, order } = await setupAdminWithOrder();

    // Walk to delivered as seller
    const sellerUser = (await db.query(
      'SELECT u.id FROM users u JOIN seller_profiles sp ON sp.user_id = u.id WHERE sp.id = $1',
      [sellerProfile.id]
    )).rows[0];
    const sellerToken = jwt.sign(
      { sub: sellerUser.id, role: 'seller', seller_status: 'approved' },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN }
    );
    const eta = new Date(Date.now() + 60 * 60_000).toISOString();
    for (const status of ['accepted', 'preparing', 'ready', 'delivered']) {
      await request(app)
        .patch(`/api/v1/seller/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(status === 'accepted' ? { status, estimated_ready_at: eta } : { status })
        .expect(200);
    }

    const res = await request(app)
      .patch(`/api/v1/admin/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'too late' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });
});

/* ── Analytics ────────────────────────────────────────────────────────── */

describe('Admin analytics', () => {
  it('GET /admin/analytics/overview returns platform KPIs', async () => {
    const admin = await createTestAdmin();
    const token = generateAdminToken(admin);

    const res = await request(app)
      .get('/api/v1/admin/analytics/overview')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.overview).toMatchObject({
      users: expect.objectContaining({ total: expect.any(Number) }),
      orders: expect.objectContaining({ total: expect.any(Number) }),
      revenue: expect.objectContaining({ gmv_all_time: expect.any(Number) }),
      top_categories: expect.any(Array),
    });
  });

  it('GET /admin/analytics/orders returns daily breakdown', async () => {
    const admin = await createTestAdmin();
    const token = generateAdminToken(admin);

    const res = await request(app)
      .get('/api/v1/admin/analytics/orders?days=14')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.trends)).toBe(true);
  });

  it('GET /admin/analytics/sellers returns top sellers', async () => {
    const admin = await createTestAdmin();
    const token = generateAdminToken(admin);

    const res = await request(app)
      .get('/api/v1/admin/analytics/sellers?limit=5')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.top_sellers)).toBe(true);
  });
});
