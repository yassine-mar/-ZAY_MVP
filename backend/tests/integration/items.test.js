'use strict';

// Mock UploadService at the module level so tests don't hit Cloudinary.
jest.mock('../../src/services/upload.service', () => ({
  uploadImage: jest.fn().mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/zay/items/test-img.jpg',
    public_id: 'zay/items/test-img',
  }),
  deleteImage: jest.fn().mockResolvedValue(true),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../../src/app');
const { db, closeDatabase } = require('../../src/config/database');
const env = require('../../src/config/env');
const { createTestSeller, truncateAuthTables } = require('../helpers/auth.helpers');
const {
  seedCategory,
  seedMenu,
  seedMenuItem,
  truncateMenuTables,
} = require('../helpers/menu.helpers');
const UploadService = require('../../src/services/upload.service');

let app;

beforeAll(() => {
  ({ app } = createApp());
});

afterEach(async () => {
  jest.clearAllMocks();
  await truncateMenuTables();
  await truncateAuthTables();
});

afterAll(async () => {
  await closeDatabase();
});

const signSellerToken = (user) =>
  jwt.sign(
    { sub: user.id, role: 'seller', seller_status: 'approved' },
    env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN }
  );

const setup = async () => {
  const { user, sellerProfile } = await createTestSeller();
  const token = signSellerToken(user);
  const category = await seedCategory();
  const menu = await seedMenu(sellerProfile.id);
  return { user, sellerProfile, token, category, menu };
};

describe('POST /api/v1/menus/:menuId/items (add item)', () => {
  it('adds an item to a menu', async () => {
    const { token, category, menu } = await setup();

    const res = await request(app)
      .post(`/api/v1/menus/${menu.id}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Tagine Poulet',
        description: 'Poulet aux olives',
        price: 65,
        prep_time_min: 45,
        category_id: category.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.item.name).toBe('Tagine Poulet');
    expect(Number(res.body.data.item.price)).toBe(65);
    expect(res.body.data.item.is_available).toBe(true);
  });

  it('rejects invalid price', async () => {
    const { token, category, menu } = await setup();

    const res = await request(app)
      .post(`/api/v1/menus/${menu.id}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X', price: -10, category_id: category.id });

    expect(res.status).toBe(400);
  });

  it('rejects items added to another seller\'s menu', async () => {
    const { token } = await setup();
    const { sellerProfile: other } = await createTestSeller();
    const otherMenu = await seedMenu(other.id);
    const category = await seedCategory({ slug: `c-${Date.now()}` });

    const res = await request(app)
      .post(`/api/v1/menus/${otherMenu.id}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tagine', price: 65, category_id: category.id });

    expect(res.status).toBe(404);
  });

  it('rejects items with inactive category', async () => {
    const { token, menu } = await setup();
    const inactive = await seedCategory({ slug: `inactive-${Date.now()}`, is_active: false });

    const res = await request(app)
      .post(`/api/v1/menus/${menu.id}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tagine', price: 65, category_id: inactive.id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CATEGORY');
  });
});

describe('PUT /api/v1/items/:id', () => {
  it('updates the item', async () => {
    const { token, category, menu } = await setup();
    const item = await seedMenuItem(menu.id, category.id);

    const res = await request(app)
      .put(`/api/v1/items/${item.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', price: 80 });

    expect(res.status).toBe(200);
    expect(res.body.data.item.name).toBe('New Name');
    expect(Number(res.body.data.item.price)).toBe(80);
  });

  it('rejects update by non-owner', async () => {
    const { token } = await setup();
    const { sellerProfile: other } = await createTestSeller();
    const cat2 = await seedCategory({ slug: `c-${Date.now()}-${Math.random()}` });
    const otherMenu = await seedMenu(other.id);
    const otherItem = await seedMenuItem(otherMenu.id, cat2.id);

    const res = await request(app)
      .put(`/api/v1/items/${otherItem.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hijacked' });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/items/:id/availability', () => {
  it('toggles availability', async () => {
    const { token, category, menu } = await setup();
    const item = await seedMenuItem(menu.id, category.id, { is_available: true });

    const res = await request(app)
      .patch(`/api/v1/items/${item.id}/availability`)
      .set('Authorization', `Bearer ${token}`)
      .send({ is_available: false });

    expect(res.status).toBe(200);
    expect(res.body.data.item.is_available).toBe(false);

    const row = await db.query('SELECT is_available FROM menu_items WHERE id = $1', [item.id]);
    expect(row.rows[0].is_available).toBe(false);
  });
});

describe('DELETE /api/v1/items/:id', () => {
  it('soft-deletes the item', async () => {
    const { token, category, menu } = await setup();
    const item = await seedMenuItem(menu.id, category.id);

    const res = await request(app)
      .delete(`/api/v1/items/${item.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const row = await db.query('SELECT deleted_at FROM menu_items WHERE id = $1', [item.id]);
    expect(row.rows[0].deleted_at).not.toBeNull();
  });
});

describe('POST /api/v1/items/:id/image', () => {
  it('uploads an image and stores the URL', async () => {
    const { token, category, menu } = await setup();
    const item = await seedMenuItem(menu.id, category.id);

    const res = await request(app)
      .post(`/api/v1/items/${item.id}/image`)
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from('fake-image-bytes'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body.data.image_url).toContain('test-img.jpg');
    expect(UploadService.uploadImage).toHaveBeenCalledWith(expect.any(Buffer), 'items');

    const row = await db.query('SELECT image_url, image_public_id FROM menu_items WHERE id = $1', [item.id]);
    expect(row.rows[0].image_url).toBeTruthy();
    expect(row.rows[0].image_public_id).toBe('zay/items/test-img');
  });

  it('rejects non-image mimetype via multer fileFilter', async () => {
    const { token, category, menu } = await setup();
    const item = await seedMenuItem(menu.id, category.id);

    const res = await request(app)
      .post(`/api/v1/items/${item.id}/image`)
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from('not-an-image'), { filename: 'evil.exe', contentType: 'application/octet-stream' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });
});
