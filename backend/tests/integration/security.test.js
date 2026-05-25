'use strict';

/**
 * Security integration suite.
 *
 * Cross-cutting adversarial tests that complement the per-feature
 * integration tests. Every test in here is an attack scenario we want to
 * actively confirm we block.
 *
 * Run with: npm run test:integration -- security
 *
 * Coverage:
 *   1. Mass-assignment / privilege escalation
 *   2. Cross-user IDOR (insecure direct object reference)
 *   3. Role-based authorization gates
 *   4. JWT tampering & confusion
 *   5. SQL-injection-shaped payloads
 *   6. Header injection
 *   7. Body-size / DoS limits
 *   8. Sensitive-field leakage in responses
 */

// Mute the notification side-effects so this suite focuses on auth/security.
jest.mock('../../src/services/notification.service', () => ({
  sendNotification: jest.fn().mockResolvedValue(),
  notifyOrderPlaced: jest.fn().mockResolvedValue(),
  notifyOrderStatusChanged: jest.fn().mockResolvedValue(),
  notifyOrderAutoCancelled: jest.fn().mockResolvedValue(),
  notifySellerApproved: jest.fn().mockResolvedValue(),
  notifySellerRejected: jest.fn().mockResolvedValue(),
  notifySellerSuspended: jest.fn().mockResolvedValue(),
  notifyAdminsSellerRegistered: jest.fn().mockResolvedValue(),
  notifyAdminsOrderEscalation: jest.fn().mockResolvedValue(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../../src/app');
const { db, closeDatabase } = require('../../src/config/database');
const env = require('../../src/config/env');

const { wipe, signCustomerToken, signSellerToken, scene } = require('../helpers/factories');
const {
  createTestUser,
  createTestSeller,
  createTestAdmin,
  generateAdminToken,
} = require('../helpers/auth.helpers');

let app;

beforeAll(() => {
  ({ app } = createApp());
});

afterEach(async () => {
  await wipe();
});

afterAll(async () => {
  await closeDatabase();
});

/* ════════════════════════════════════════════════════════════════════════
 * 1. Mass-assignment / privilege escalation
 * ════════════════════════════════════════════════════════════════════════*/

describe('Security — mass assignment / privilege escalation', () => {
  it('register strips role / status / is_admin from the body', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Sneaky',
        email: `sneak-${Date.now()}@example.com`,
        phone: '+212612345678',
        password: 'StrongPass1!',
        role: 'admin',          // ← attempt
        is_admin: true,         // ← attempt
        status: 'suspended',    // ← attempt
      })
      .expect(201);

    expect(res.body.data.user.role).toBe('customer');
    expect(res.body.data.user.status).toBe('active');
    expect(res.body.data.user.is_admin).toBeUndefined();
  });

  it('PATCH /users/me cannot change role, email, or status', async () => {
    const user = await createTestUser();
    const token = signCustomerToken(user);

    await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Updated',
        role: 'admin',
        email: 'hacker@example.com',
        status: 'suspended',
      })
      .expect(200);

    const after = await db.query('SELECT role, email, status FROM users WHERE id = $1', [user.id]);
    expect(after.rows[0].role).toBe('customer');
    expect(after.rows[0].email).toBe(user.email);
    expect(after.rows[0].status).toBe('active');
  });

  it('seller registration cannot self-approve', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register/seller')
      .send({
        name: 'Sneaky Seller',
        email: `seller-${Date.now()}@example.com`,
        phone: '+212612345678',
        password: 'StrongPass1!',
        business_name: 'Dar Sneaky',
        address: 'Rue Test',
        city: 'Casablanca',
        delivery_radius_km: 5,
        status: 'approved',      // ← attempt
        approved_at: new Date(), // ← attempt
      })
      .expect(201);

    expect(res.body.data.seller_profile.status).toBe('pending');
    expect(res.body.data.seller_profile.approved_at).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * 2. Cross-user IDOR
 * ════════════════════════════════════════════════════════════════════════*/

describe('Security — cross-user IDOR (insecure direct object reference)', () => {
  it('customer A cannot read customer B\'s order', async () => {
    const s1 = await scene.customerOrderingFromSeller();
    const customerB = await createTestUser();
    const tokenB = signCustomerToken(customerB);

    const res = await request(app)
      .get(`/api/v1/orders/${s1.order.id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    // Either 404 (defensive — don't reveal existence) or 403.
    expect([403, 404]).toContain(res.status);
    expect(res.body.data).toBeUndefined();
  });

  it('customer A cannot cancel customer B\'s order', async () => {
    const s1 = await scene.customerOrderingFromSeller();
    const customerB = await createTestUser();
    const tokenB = signCustomerToken(customerB);

    const res = await request(app)
      .post(`/api/v1/orders/${s1.order.id}/cancel`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect([403, 404]).toContain(res.status);

    const after = await db.query('SELECT status FROM orders WHERE id = $1', [s1.order.id]);
    expect(after.rows[0].status).toBe('pending'); // unchanged
  });

  it('seller A cannot transition seller B\'s order', async () => {
    const s1 = await scene.customerOrderingFromSeller();
    const otherSellerCtx = await createTestSeller();
    const otherSellerToken = signSellerToken(otherSellerCtx.user);

    const res = await request(app)
      .patch(`/api/v1/seller/orders/${s1.order.id}/status`)
      .set('Authorization', `Bearer ${otherSellerToken}`)
      .send({ status: 'accepted', estimated_ready_at: new Date(Date.now() + 1.8e6).toISOString() });

    expect([403, 404]).toContain(res.status);
  });

  it('customer cannot mark someone else\'s notification as read', async () => {
    const targetUser = await createTestUser();
    const notifRes = await db.query(
      `INSERT INTO notifications (id, user_id, type, title, body)
       VALUES (uuid_generate_v4(), $1, 'system', 't', 'b') RETURNING id`,
      [targetUser.id]
    );
    const notifId = notifRes.rows[0].id;

    const attacker = await createTestUser();
    const attackerToken = signCustomerToken(attacker);

    await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${attackerToken}`)
      .expect((res) => {
        // 200 with no-op OR 404 — never a successful mark.
        if (res.status === 200) {
          // succeeded only if it was actually scoped; verify DB unchanged
          return true;
        }
        return [403, 404].includes(res.status);
      });

    const after = await db.query(
      'SELECT is_read FROM notifications WHERE id = $1',
      [notifId]
    );
    expect(after.rows[0].is_read).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * 3. Role-based authorization gates
 * ════════════════════════════════════════════════════════════════════════*/

describe('Security — role-based authorization', () => {
  it('customer cannot hit /seller/* endpoints', async () => {
    const customer = await createTestUser();
    const token = signCustomerToken(customer);

    const res = await request(app)
      .get('/api/v1/seller/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('pending seller cannot hit approved-seller endpoints', async () => {
    const { user } = await createTestSeller({ sellerStatus: 'pending' });
    const token = signSellerToken(user, 'pending');

    const res = await request(app)
      .get('/api/v1/seller/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('seller cannot hit /admin/* endpoints', async () => {
    const { user } = await createTestSeller();
    const token = signSellerToken(user);

    const res = await request(app)
      .get('/api/v1/admin/sellers')
      .set('Authorization', `Bearer ${token}`);

    expect([401, 403]).toContain(res.status);
  });

  it('admin cannot perform customer-only actions with admin token', async () => {
    // Admin tokens are signed with ADMIN_JWT_SECRET — customer routes use
    // the user JWT middleware, which won't accept admin tokens.
    const admin = await createTestAdmin();
    const adminToken = generateAdminToken(admin);

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(401);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * 4. JWT tampering and confusion
 * ════════════════════════════════════════════════════════════════════════*/

describe('Security — JWT tampering and confusion', () => {
  it('rejects a JWT signed with the wrong secret', async () => {
    const forged = jwt.sign({ sub: 'attacker', role: 'admin' }, 'wrong-secret', {
      algorithm: 'HS256',
      expiresIn: '1h',
    });

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${forged}`);

    expect(res.status).toBe(401);
  });

  it('rejects an "alg=none" token (no algorithm confusion)', async () => {
    // Hand-craft an unsigned token: base64(header).base64(payload).
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ sub: 'attacker', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 })
    ).toString('base64url');
    const unsigned = `${header}.${payload}.`;

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${unsigned}`);

    expect(res.status).toBe(401);
  });

  it('admin token signed with USER secret cannot access admin routes', async () => {
    // Attacker has a customer JWT but tries to claim admin role.
    const forged = jwt.sign(
      { sub: 'user-1', role: 'admin', isAdmin: true },
      env.JWT_SECRET,           // ← wrong secret for admin guard
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/v1/admin/sellers')
      .set('Authorization', `Bearer ${forged}`);

    expect([401, 403]).toContain(res.status);
  });

  it('rejects an expired token', async () => {
    const user = await createTestUser();
    const expired = jwt.sign(
      { sub: user.id, role: 'customer' },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '-1s' }
    );

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
  });

  it('rejects a payload-tampered token (signature mismatch)', async () => {
    const user = await createTestUser();
    const valid = signCustomerToken(user);
    const [h, p, s] = valid.split('.');
    // Replace payload with one claiming admin role but keep the original signature.
    const tamperedPayload = Buffer.from(
      JSON.stringify({ sub: user.id, role: 'admin' })
    ).toString('base64url');
    const tampered = `${h}.${tamperedPayload}.${s}`;

    const res = await request(app)
      .get('/api/v1/admin/sellers')
      .set('Authorization', `Bearer ${tampered}`);

    expect([401, 403]).toContain(res.status);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * 5. SQL-injection-shaped payloads
 * ════════════════════════════════════════════════════════════════════════*/

describe('Security — SQL-injection-shaped inputs', () => {
  it('login payload with SQL meta-chars returns INVALID_CREDENTIALS, not 500', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: `attacker' OR 1=1; --@example.com`,
        password: `' OR '1'='1`,
      });

    // Joi rejects on email format; if it slipped through it'd be 401.
    // Either way: NOT a 500.
    expect(res.status).not.toBe(500);
    expect([400, 401]).toContain(res.status);
  });

  it('search query with SQL meta-chars does not affect DB', async () => {
    const user = await createTestUser();
    const token = signCustomerToken(user);

    const res = await request(app)
      .get('/api/v1/browse/items')
      .set('Authorization', `Bearer ${token}`)
      .query({ search: `'; DROP TABLE users; --` });

    expect(res.status).toBe(200);
    // Users table still exists.
    const u = await db.query('SELECT COUNT(*)::int AS c FROM users');
    expect(u.rows[0].c).toBeGreaterThanOrEqual(1);
  });

  it('UUID params reject non-UUID values cleanly', async () => {
    const user = await createTestUser();
    const token = signCustomerToken(user);

    const res = await request(app)
      .get(`/api/v1/orders/'; DROP TABLE orders; --`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).not.toBe(500);
    expect([400, 404]).toContain(res.status);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * 6. Header injection
 * ════════════════════════════════════════════════════════════════════════*/

describe('Security — header injection', () => {
  it('rejects CR/LF in Authorization header', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer abc\r\nX-Injected: yes');

    // Node's HTTP parser rejects CRLF in header values with 400-ish.
    expect([400, 401]).toContain(res.status);
    expect(res.headers['x-injected']).toBeUndefined();
  });

  it('X-Forwarded-For from untrusted hop does not override rate-limit key', async () => {
    // We can't fully test rate limiting in CI (would slow tests by minutes),
    // but we can assert the app doesn't trust raw X-Forwarded-For when
    // `trust proxy` is unset/default.
    const user = await createTestUser();
    const token = signCustomerToken(user);

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Forwarded-For', '1.2.3.4, 5.6.7.8');

    expect(res.status).toBe(200);
    // App should not echo or trust the header back to us.
    expect(res.headers['x-real-ip']).toBeUndefined();
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * 7. Body-size / DoS protection
 * ════════════════════════════════════════════════════════════════════════*/

describe('Security — input size & DoS', () => {
  it('rejects an oversized JSON body (>10kb default)', async () => {
    const huge = 'a'.repeat(200_000); // 200 KB
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: huge });

    // Express body-parser returns 413; some configs return 400.
    expect([400, 413]).toContain(res.status);
  });

  it('rejects an oversized string field per schema', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'x'.repeat(200), // schema max is 100
        email: `over-${Date.now()}@example.com`,
        phone: '+212612345678',
        password: 'StrongPass1!',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * 8. Sensitive-field leakage
 * ════════════════════════════════════════════════════════════════════════*/

describe('Security — sensitive field leakage', () => {
  it('never returns password_hash in any user response', async () => {
    const user = await createTestUser();
    const token = signCustomerToken(user);

    const me = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(JSON.stringify(me.body)).not.toMatch(/password_hash/);
  });

  it('never returns fcm_token in /users/me', async () => {
    const user = await createTestUser();
    await db.query('UPDATE users SET fcm_token = $1 WHERE id = $2', ['secret-token', user.id]);
    const token = signCustomerToken(user);

    const me = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(JSON.stringify(me.body)).not.toMatch(/fcm_token/);
    expect(JSON.stringify(me.body)).not.toMatch(/secret-token/);
  });

  it('public browse endpoint never returns customer phone on a seller', async () => {
    const { sellerProfile } = await createTestSeller();
    const res = await request(app)
      .get(`/api/v1/browse/sellers/${sellerProfile.id}`);

    // Whether 200 or 404, the response shouldn't expose user.password_hash.
    expect(JSON.stringify(res.body)).not.toMatch(/password_hash/);
    // The seller's phone is only revealed after order acceptance to the
    // ordering customer — never on browse.
    if (res.status === 200) {
      expect(res.body.data.seller.phone).toBeUndefined();
    }
  });
});
