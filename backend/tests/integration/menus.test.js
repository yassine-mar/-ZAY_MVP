'use strict';

const request = require('supertest');
const { createApp } = require('../../src/app');
const { db, closeDatabase } = require('../../src/config/database');
const {
  createTestSeller,
  truncateAuthTables,
} = require('../helpers/auth.helpers');
const { seedCategory, seedMenu, truncateMenuTables } = require('../helpers/menu.helpers');
const jwt = require('jsonwebtoken');
const env = require('../../src/config/env');

let app;

beforeAll(() => {
  ({ app } = createApp());
});

afterEach(async () => {
  await truncateMenuTables();
  await truncateAuthTables();
});

afterAll(async () => {
  await closeDatabase();
});

const signSellerToken = (user, sellerStatus = 'approved') =>
  jwt.sign(
    { sub: user.id, role: 'seller', seller_status: sellerStatus },
    env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN }
  );

const setupSeller = async () => {
  const { user, sellerProfile } = await createTestSeller();
  const token = signSellerToken(user);
  return { user, sellerProfile, token };
};

describe('GET /api/v1/menus', () => {
  it('returns empty list when seller has no menus', async () => {
    const { token } = await setupSeller();

    const res = await request(app)
      .get('/api/v1/menus')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.menus).toEqual([]);
  });

  it('returns the seller\'s menus', async () => {
    const { sellerProfile, token } = await setupSeller();
    await seedMenu(sellerProfile.id, { name: 'Plats Chauds', sort_order: 1 });
    await seedMenu(sellerProfile.id, { name: 'Desserts', sort_order: 2 });

    const res = await request(app)
      .get('/api/v1/menus')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.menus).toHaveLength(2);
    expect(res.body.data.menus.map((m) => m.name)).toEqual(['Plats Chauds', 'Desserts']);
  });

  it('rejects unauthenticated', async () => {
    const res = await request(app).get('/api/v1/menus');
    expect(res.status).toBe(401);
  });

  it('rejects pending sellers (not yet approved)', async () => {
    const { user } = await createTestSeller({ sellerStatus: 'pending' });
    const token = signSellerToken(user, 'pending');

    const res = await request(app)
      .get('/api/v1/menus')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SELLER_NOT_APPROVED');
  });
});

describe('POST /api/v1/menus', () => {
  it('creates a menu', async () => {
    const { sellerProfile, token } = await setupSeller();

    const res = await request(app)
      .post('/api/v1/menus')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Plats Chauds', description: 'Tagines et plats mijotés' });

    expect(res.status).toBe(201);
    expect(res.body.data.menu.name).toBe('Plats Chauds');
    expect(res.body.data.menu.seller_id).toBe(sellerProfile.id);
  });

  it('rejects invalid input', async () => {
    const { token } = await setupSeller();

    const res = await request(app)
      .post('/api/v1/menus')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'a' }); // too short

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PUT /api/v1/menus/:id', () => {
  it('updates the menu', async () => {
    const { sellerProfile, token } = await setupSeller();
    const menu = await seedMenu(sellerProfile.id);

    const res = await request(app)
      .put(`/api/v1/menus/${menu.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', description: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.data.menu.name).toBe('New Name');
  });

  it('returns 404 when seller does not own the menu', async () => {
    const { token } = await setupSeller();
    const { sellerProfile: otherSeller } = await createTestSeller();
    const menu = await seedMenu(otherSeller.id);

    const res = await request(app)
      .put(`/api/v1/menus/${menu.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hijack' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/menus/:id', () => {
  it('soft-deletes the menu', async () => {
    const { sellerProfile, token } = await setupSeller();
    const menu = await seedMenu(sellerProfile.id);

    const res = await request(app)
      .delete(`/api/v1/menus/${menu.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const row = await db.query('SELECT deleted_at FROM menus WHERE id = $1', [menu.id]);
    expect(row.rows[0].deleted_at).not.toBeNull();
  });

  it('subsequent GET returns the menu list without the deleted menu', async () => {
    const { sellerProfile, token } = await setupSeller();
    const m1 = await seedMenu(sellerProfile.id, { name: 'Keep' });
    const m2 = await seedMenu(sellerProfile.id, { name: 'Delete' });

    await request(app)
      .delete(`/api/v1/menus/${m2.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const res = await request(app)
      .get('/api/v1/menus')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data.menus).toHaveLength(1);
    expect(res.body.data.menus[0].id).toBe(m1.id);
  });
});
