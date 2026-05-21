'use strict';

jest.mock('../../src/services/notification.service', () => ({
  notifyOrderPlaced: jest.fn().mockResolvedValue(),
  notifyOrderStatusChanged: jest.fn().mockResolvedValue(),
  notifySellerApproved: jest.fn().mockResolvedValue(),
  notifySellerRejected: jest.fn().mockResolvedValue(),
  notifySellerSuspended: jest.fn().mockResolvedValue(),
  sendNotification: jest.fn().mockResolvedValue(),
}));

jest.mock('../../src/services/upload.service', () => ({
  uploadImage: jest.fn().mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/zay/avatars/test.jpg',
    public_id: 'zay/avatars/test',
  }),
  deleteImage: jest.fn().mockResolvedValue(true),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../../src/app');
const { db, closeDatabase } = require('../../src/config/database');
const env = require('../../src/config/env');
const {
  createTestSeller,
  createTestAdmin,
  generateAdminToken,
  truncateAuthTables,
} = require('../helpers/auth.helpers');

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

const signSeller = (user, status = 'approved') =>
  jwt.sign(
    { sub: user.id, role: 'seller', seller_status: status },
    env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN }
  );

/* ── Registration ─────────────────────────────────────────────────────── */

describe('POST /api/v1/auth/register/seller — kitchen profile', () => {
  it('creates user + pending seller_profile atomically with kitchen fields', async () => {
    const payload = {
      name: 'Khadija Test',
      email: `kitchen-${Date.now()}@example.com`,
      phone: '+212612345678',
      password: 'StrongPass1!',
      business_name: 'Dar Khadija Kitchen',
      bio: 'Authentic Moroccan home cooking — tagines, couscous, pastilla.',
      address: 'Rue Hassan II, Quartier Maârif',
      city: 'Casablanca',
      delivery_radius_km: 8,
    };

    const res = await request(app).post('/api/v1/auth/register/seller').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('seller');
    expect(res.body.data.seller_profile.status).toBe('pending');
    expect(res.body.data.seller_profile.business_name).toBe(payload.business_name);
    expect(res.body.data.seller_profile.delivery_radius_km).toBe(8);
    expect(res.body.data.seller_profile.is_open).toBe(false);

    // DB consistency
    const userRow = await db.query('SELECT id FROM users WHERE email = $1', [payload.email]);
    const sellerRow = await db.query(
      'SELECT status, is_open, approved_at, approved_by FROM seller_profiles WHERE user_id = $1',
      [userRow.rows[0].id]
    );
    expect(sellerRow.rows[0].status).toBe('pending');
    expect(sellerRow.rows[0].is_open).toBe(false);
    expect(sellerRow.rows[0].approved_at).toBeNull();
    expect(sellerRow.rows[0].approved_by).toBeNull();
  });
});

/* ── Seller profile management ────────────────────────────────────────── */

describe('GET /api/v1/seller/profile', () => {
  it('returns own profile (pending sellers can see their state)', async () => {
    const { user, sellerProfile } = await createTestSeller({ sellerStatus: 'pending' });
    const token = signSeller(user, 'pending');

    const res = await request(app)
      .get('/api/v1/seller/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.profile.id).toBe(sellerProfile.id);
    expect(res.body.data.profile.status).toBe('pending');
  });
});

describe('PUT /api/v1/seller/profile', () => {
  it('updates editable fields (approved seller)', async () => {
    const { user, sellerProfile } = await createTestSeller();
    const token = signSeller(user);

    const res = await request(app)
      .put('/api/v1/seller/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bio: 'Updated bio',
        delivery_radius_km: 12,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.profile.bio).toBe('Updated bio');
    expect(res.body.data.profile.delivery_radius_km).toBe(12);

    const row = await db.query(
      'SELECT bio, delivery_radius_km FROM seller_profiles WHERE id = $1',
      [sellerProfile.id]
    );
    expect(row.rows[0].bio).toBe('Updated bio');
    expect(row.rows[0].delivery_radius_km).toBe(12);
  });

  it('rejects status manipulation via update', async () => {
    const { user, sellerProfile } = await createTestSeller();
    const token = signSeller(user);

    await request(app)
      .put('/api/v1/seller/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'approved', is_open: true, business_name: 'X Kitchen' });

    const row = await db.query(
      'SELECT status, is_open FROM seller_profiles WHERE id = $1',
      [sellerProfile.id]
    );
    // status and is_open were filtered out at the validator (unknown fields stripped)
    expect(row.rows[0].is_open).toBe(false); // unchanged
  });

  it('rejects updates from non-approved sellers', async () => {
    const { user } = await createTestSeller({ sellerStatus: 'pending' });
    const token = signSeller(user, 'pending');

    const res = await request(app)
      .put('/api/v1/seller/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'New bio' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SELLER_NOT_APPROVED');
  });
});

describe('PATCH /api/v1/seller/profile/availability', () => {
  it('toggles is_open for approved seller', async () => {
    const { user, sellerProfile } = await createTestSeller();
    const token = signSeller(user);

    const res = await request(app)
      .patch('/api/v1/seller/profile/availability')
      .set('Authorization', `Bearer ${token}`)
      .send({ is_open: true });

    expect(res.status).toBe(200);
    expect(res.body.data.profile.is_open).toBe(true);

    const row = await db.query('SELECT is_open FROM seller_profiles WHERE id = $1', [sellerProfile.id]);
    expect(row.rows[0].is_open).toBe(true);
  });
});

describe('POST /api/v1/seller/profile/avatar', () => {
  it('uploads avatar (Cloudinary mocked)', async () => {
    const { user, sellerProfile } = await createTestSeller();
    const token = signSeller(user);

    const res = await request(app)
      .post('/api/v1/seller/profile/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', Buffer.from('fake-image'), { filename: 'avatar.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body.data.avatar_url).toContain('test.jpg');

    const row = await db.query(
      'SELECT avatar_url, avatar_public_id FROM seller_profiles WHERE id = $1',
      [sellerProfile.id]
    );
    expect(row.rows[0].avatar_url).toBeTruthy();
    expect(row.rows[0].avatar_public_id).toBe('zay/avatars/test');
  });
});

/* ── Admin approval workflow ──────────────────────────────────────────── */

describe('Admin seller management', () => {
  it('GET /admin/sellers?status=pending returns pending sellers', async () => {
    await createTestSeller({ sellerStatus: 'pending' });
    await createTestSeller({ sellerStatus: 'approved' });
    const admin = await createTestAdmin();
    const adminToken = generateAdminToken(admin);

    const res = await request(app)
      .get('/api/v1/admin/sellers?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].status).toBe('pending');
  });

  it('PATCH /admin/sellers/:id/approve moves pending → approved', async () => {
    const { sellerProfile } = await createTestSeller({ sellerStatus: 'pending' });
    const admin = await createTestAdmin();
    const adminToken = generateAdminToken(admin);

    const res = await request(app)
      .patch(`/api/v1/admin/sellers/${sellerProfile.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ note: 'Documents verified' });

    expect(res.status).toBe(200);
    expect(res.body.data.seller.status).toBe('approved');

    const row = await db.query(
      'SELECT status, approved_at, approved_by FROM seller_profiles WHERE id = $1',
      [sellerProfile.id]
    );
    expect(row.rows[0].status).toBe('approved');
    expect(row.rows[0].approved_at).not.toBeNull();
    expect(row.rows[0].approved_by).toBe(admin.id);
  });

  it('refuses to approve an already-approved seller', async () => {
    const { sellerProfile } = await createTestSeller({ sellerStatus: 'approved' });
    const admin = await createTestAdmin();
    const adminToken = generateAdminToken(admin);

    const res = await request(app)
      .patch(`/api/v1/admin/sellers/${sellerProfile.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_STATUS');
  });

  it('PATCH /admin/sellers/:id/reject with reason', async () => {
    const { sellerProfile } = await createTestSeller({ sellerStatus: 'pending' });
    const admin = await createTestAdmin();
    const adminToken = generateAdminToken(admin);

    const res = await request(app)
      .patch(`/api/v1/admin/sellers/${sellerProfile.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'ID document is not clear enough for verification' });

    expect(res.status).toBe(200);
    expect(res.body.data.seller.status).toBe('rejected');

    const row = await db.query(
      'SELECT status, rejection_reason, rejected_by, rejected_at FROM seller_profiles WHERE id = $1',
      [sellerProfile.id]
    );
    expect(row.rows[0].status).toBe('rejected');
    expect(row.rows[0].rejection_reason).toContain('not clear enough');
    expect(row.rows[0].rejected_by).toBe(admin.id);
    expect(row.rows[0].rejected_at).not.toBeNull();
  });

  it('requires reason on reject (min 10 chars)', async () => {
    const { sellerProfile } = await createTestSeller({ sellerStatus: 'pending' });
    const admin = await createTestAdmin();
    const adminToken = generateAdminToken(admin);

    const res = await request(app)
      .patch(`/api/v1/admin/sellers/${sellerProfile.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'no' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PATCH /admin/sellers/:id/suspend changes approved → suspended', async () => {
    const { sellerProfile } = await createTestSeller({ sellerStatus: 'approved' });
    const admin = await createTestAdmin();
    const adminToken = generateAdminToken(admin);

    const res = await request(app)
      .patch(`/api/v1/admin/sellers/${sellerProfile.id}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Repeated late cancellations' });

    expect(res.status).toBe(200);
    expect(res.body.data.seller.status).toBe('suspended');

    const row = await db.query(
      'SELECT status, suspension_reason, suspended_at FROM seller_profiles WHERE id = $1',
      [sellerProfile.id]
    );
    expect(row.rows[0].status).toBe('suspended');
    expect(row.rows[0].suspension_reason).toContain('Repeated late');
    expect(row.rows[0].suspended_at).not.toBeNull();
  });

  it('rejects non-admin access to /admin/sellers', async () => {
    const { user } = await createTestSeller();
    const sellerToken = signSeller(user);

    const res = await request(app)
      .get('/api/v1/admin/sellers')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(401);
  });
});
