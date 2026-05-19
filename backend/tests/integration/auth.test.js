'use strict';

const request = require('supertest');
const { createApp } = require('../../src/app');
const { db, closeDatabase } = require('../../src/config/database');
const { truncateAuthTables, createTestUser } = require('../helpers/auth.helpers');

let app;

beforeAll(() => {
  ({ app } = createApp());
});

afterEach(async () => {
  await truncateAuthTables();
});

afterAll(async () => {
  await closeDatabase();
});

const validRegister = () => ({
  name: 'Fatima Test',
  email: `test-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
  phone: '+212612345678',
  password: 'StrongPass1!',
});

describe('POST /api/v1/auth/register', () => {
  it('creates a customer and returns tokens', async () => {
    const payload = validRegister();
    const res = await request(app).post('/api/v1/auth/register').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(payload.email);
    expect(res.body.data.user.role).toBe('customer');
    expect(res.body.data.user.password_hash).toBeUndefined();
    expect(res.body.data.user.fcm_token).toBeUndefined();
    expect(res.body.data.access_token).toBeDefined();
    expect(res.body.data.refresh_token).toBeDefined();
    expect(res.body.data.token_type).toBe('Bearer');
    expect(res.body.data.expires_in).toBeGreaterThan(0);

    const dbUser = await db.query('SELECT * FROM users WHERE email = $1', [payload.email]);
    expect(dbUser.rows[0]).toBeDefined();
    expect(dbUser.rows[0].password_hash).not.toBe(payload.password);
    expect(dbUser.rows[0].password_hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('rejects duplicate email with 409', async () => {
    const payload = validRegister();
    await request(app).post('/api/v1/auth/register').send(payload).expect(201);

    const res = await request(app).post('/api/v1/auth/register').send(payload);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it.each([
    ['name too short', { name: 'a' }],
    ['email invalid', { email: 'not-an-email' }],
    ['phone non-Moroccan', { phone: '0612345678' }],
    ['password too short', { password: 'Sho1!' }],
    ['password no uppercase', { password: 'lowercase1!' }],
    ['password no number', { password: 'NoNumbers!' }],
    ['password no special', { password: 'NoSpecial1' }],
  ])('rejects %s with 400', async (_label, badField) => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegister(), ...badField });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeDefined();
  });

  it('strips unknown fields (no privilege escalation)', async () => {
    const payload = { ...validRegister(), role: 'admin', is_admin: true, status: 'suspended' };
    const res = await request(app).post('/api/v1/auth/register').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('customer');
    expect(res.body.data.user.status).toBe('active');
  });
});

describe('POST /api/v1/auth/register/seller', () => {
  const validSellerRegister = () => ({
    ...validRegister(),
    business_name: 'Dar Test',
    bio: 'Authentic Moroccan home cooking',
    address: 'Rue Hassan II, Maârif',
    city: 'Casablanca',
    delivery_radius_km: 8,
  });

  it('creates user + seller_profile atomically with status=pending', async () => {
    const payload = validSellerRegister();
    const res = await request(app).post('/api/v1/auth/register/seller').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('seller');
    expect(res.body.data.seller_profile.status).toBe('pending');
    expect(res.body.data.seller_profile.business_name).toBe(payload.business_name);
    expect(res.body.data.seller_profile.delivery_radius_km).toBe(8);
    expect(res.body.data.access_token).toBeDefined();

    const userRow = await db.query('SELECT * FROM users WHERE email = $1', [payload.email]);
    const sellerRow = await db.query(
      'SELECT * FROM seller_profiles WHERE user_id = $1',
      [userRow.rows[0].id]
    );
    expect(sellerRow.rows[0]).toBeDefined();
    expect(sellerRow.rows[0].is_open).toBe(false);
    expect(sellerRow.rows[0].approved_at).toBeNull();
  });

  it('rejects invalid city', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register/seller')
      .send({ ...validSellerRegister(), city: 'Atlantis' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in with valid credentials and returns tokens', async () => {
    const user = await createTestUser({ password: 'StrongPass1!' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'StrongPass1!' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(user.id);
    expect(res.body.data.user.password_hash).toBeUndefined();
    expect(res.body.data.access_token).toBeDefined();
    expect(res.body.data.refresh_token).toBeDefined();
  });

  it('returns 401 INVALID_CREDENTIALS for wrong password', async () => {
    const user = await createTestUser({ password: 'StrongPass1!' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'WrongPass1!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('returns same generic error for unknown email (no enumeration)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'AnyPass1!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('returns 403 ACCOUNT_SUSPENDED for suspended users', async () => {
    const user = await createTestUser({ status: 'suspended', password: 'StrongPass1!' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'StrongPass1!' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('exchanges a valid refresh token for a new pair', async () => {
    const user = await createTestUser({ password: 'StrongPass1!' });
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'StrongPass1!' });

    const oldRefresh = loginRes.body.data.refresh_token;
    const oldAccess = loginRes.body.data.access_token;

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: oldRefresh });

    expect(res.status).toBe(200);
    expect(res.body.data.access_token).toBeDefined();
    expect(res.body.data.refresh_token).toBeDefined();
    expect(res.body.data.refresh_token).not.toBe(oldRefresh);
    expect(res.body.data.access_token).not.toBe(oldAccess);
  });

  it('rejects reuse of a rotated refresh token and revokes the family', async () => {
    const user = await createTestUser({ password: 'StrongPass1!' });
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'StrongPass1!' });
    const oldRefresh = loginRes.body.data.refresh_token;

    const firstRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: oldRefresh });
    expect(firstRefresh.status).toBe(200);

    const reuse = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: oldRefresh });
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('INVALID_REFRESH_TOKEN');

    const newRefresh = firstRefresh.body.data.refresh_token;
    const after = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: newRefresh });
    expect(after.status).toBe(401);

    const tokens = await db.query(
      'SELECT revoked_at FROM refresh_tokens WHERE user_id = $1',
      [user.id]
    );
    expect(tokens.rows.length).toBeGreaterThan(0);
    expect(tokens.rows.every((r) => r.revoked_at !== null)).toBe(true);
  });

  it('rejects an unknown refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: 'this-token-was-never-issued' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('clears FCM token and revokes the refresh token', async () => {
    const user = await createTestUser({ password: 'StrongPass1!' });
    await db.query('UPDATE users SET fcm_token = $1 WHERE id = $2', ['fcm-abc-123', user.id]);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'StrongPass1!' });
    const { access_token, refresh_token } = loginRes.body.data;

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${access_token}`)
      .send({ refresh_token });

    expect(res.status).toBe(200);

    const after = await db.query('SELECT fcm_token FROM users WHERE id = $1', [user.id]);
    expect(after.rows[0].fcm_token).toBeNull();

    const refreshAttempt = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token });
    expect(refreshAttempt.status).toBe(401);
  });

  it('rejects logout without an access token', async () => {
    const res = await request(app).post('/api/v1/auth/logout').send({});
    expect(res.status).toBe(401);
  });

  it('rejects logout with an invalid access token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', 'Bearer not-a-real-jwt')
      .send({});
    expect(res.status).toBe(401);
  });
});
