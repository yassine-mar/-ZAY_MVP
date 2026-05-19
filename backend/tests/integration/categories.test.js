'use strict';

const request = require('supertest');
const { createApp } = require('../../src/app');
const { db, closeDatabase } = require('../../src/config/database');
const {
  createTestAdmin,
  generateAdminToken,
  truncateAuthTables,
  truncateCategoriesTable,
} = require('../helpers/auth.helpers');

let app;

beforeAll(() => {
  ({ app } = createApp());
});

afterEach(async () => {
  await truncateCategoriesTable();
  await truncateAuthTables();
});

afterAll(async () => {
  await closeDatabase();
});

const adminAuth = async () => {
  const admin = await createTestAdmin();
  return { admin, token: generateAdminToken(admin) };
};

const seedCategory = async (overrides = {}) => {
  const defaults = {
    name: 'Tagine',
    slug: 'tagine',
    icon: '🥘',
    sort_order: 0,
    is_active: true,
  };
  const final = { ...defaults, ...overrides };
  const result = await db.query(
    `INSERT INTO categories (id, name, slug, icon, sort_order, is_active)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)
     RETURNING *`,
    [final.name, final.slug, final.icon, final.sort_order, final.is_active]
  );
  return result.rows[0];
};

describe('GET /api/v1/categories (public)', () => {
  it('returns active categories sorted by sort_order then name', async () => {
    await seedCategory({ name: 'Couscous', slug: 'couscous', sort_order: 2 });
    await seedCategory({ name: 'Tagine', slug: 'tagine', sort_order: 1 });
    await seedCategory({ name: 'Bourek', slug: 'bourek', sort_order: 2 });

    const res = await request(app).get('/api/v1/categories');

    expect(res.status).toBe(200);
    expect(res.body.data.categories.map((c) => c.name)).toEqual([
      'Tagine',     // sort_order 1
      'Bourek',     // sort_order 2, alphabetical first
      'Couscous',   // sort_order 2
    ]);
  });

  it('excludes inactive categories from public list', async () => {
    await seedCategory({ name: 'Active', slug: 'active', is_active: true });
    await seedCategory({ name: 'Inactive', slug: 'inactive', is_active: false });

    const res = await request(app).get('/api/v1/categories');

    expect(res.body.data.categories.map((c) => c.name)).toEqual(['Active']);
  });

  it('does not require authentication', async () => {
    await seedCategory();

    const res = await request(app).get('/api/v1/categories');

    expect(res.status).toBe(200);
  });

  it('does not expose is_active or timestamps in public shape', async () => {
    await seedCategory();

    const res = await request(app).get('/api/v1/categories');

    const c = res.body.data.categories[0];
    expect(c.is_active).toBeUndefined();
    expect(c.created_at).toBeUndefined();
    expect(c.updated_at).toBeUndefined();
  });

  it('returns empty array when no categories exist', async () => {
    const res = await request(app).get('/api/v1/categories');

    expect(res.status).toBe(200);
    expect(res.body.data.categories).toEqual([]);
  });
});

describe('GET /api/v1/admin/categories', () => {
  it('returns all categories including inactive (admin view)', async () => {
    const { token } = await adminAuth();
    await seedCategory({ name: 'Active', slug: 'active', is_active: true });
    await seedCategory({ name: 'Inactive', slug: 'inactive', is_active: false });

    const res = await request(app)
      .get('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.categories).toHaveLength(2);
    // Admin shape includes is_active
    const inactive = res.body.data.categories.find((c) => c.slug === 'inactive');
    expect(inactive.is_active).toBe(false);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/v1/admin/categories');

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/admin/categories', () => {
  it('creates a category with auto-generated slug', async () => {
    const { token } = await adminAuth();

    const res = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Plats Chauds', icon: '🍲' });

    expect(res.status).toBe(201);
    expect(res.body.data.category.name).toBe('Plats Chauds');
    expect(res.body.data.category.slug).toBe('plats-chauds');
    expect(res.body.data.category.is_active).toBe(true);
  });

  it('strips diacritics in auto-generated slug', async () => {
    const { token } = await adminAuth();

    const res = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Pâtisserie Marocaine' });

    expect(res.status).toBe(201);
    expect(res.body.data.category.slug).toBe('patisserie-marocaine');
  });

  it('rejects duplicate name with 409', async () => {
    const { token } = await adminAuth();
    await seedCategory({ name: 'Tagine', slug: 'tagine' });

    const res = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tagine', slug: 'tagine-different' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toContain('name');
  });

  it('rejects duplicate slug with 409', async () => {
    const { token } = await adminAuth();
    await seedCategory({ name: 'Tagine', slug: 'tagine' });

    const res = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Different Name', slug: 'tagine' });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('slug');
  });

  it.each([
    ['name too short', { name: 'a' }],
    ['slug bad format', { name: 'Valid', slug: 'Invalid Slug!' }],
    ['icon too long', { name: 'Valid', icon: 'a'.repeat(20) }],
    ['sort_order negative', { name: 'Valid', sort_order: -1 }],
  ])('rejects %s with 400', async (_label, badField) => {
    const { token } = await adminAuth();

    const res = await request(app)
      .post('/api/v1/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .send(badField);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects when no admin token provided', async () => {
    const res = await request(app)
      .post('/api/v1/admin/categories')
      .send({ name: 'Tagine' });

    expect(res.status).toBe(401);
  });
});

describe('PUT /api/v1/admin/categories/:id', () => {
  it('updates name and auto-regenerates slug', async () => {
    const { token } = await adminAuth();
    const cat = await seedCategory({ name: 'Old', slug: 'old' });

    const res = await request(app)
      .put(`/api/v1/admin/categories/${cat.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.category.name).toBe('New Name');
    expect(res.body.data.category.slug).toBe('new-name');
  });

  it('respects explicit slug when both name and slug provided', async () => {
    const { token } = await adminAuth();
    const cat = await seedCategory({ name: 'Old', slug: 'old' });

    const res = await request(app)
      .put(`/api/v1/admin/categories/${cat.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name', slug: 'custom-slug' });

    expect(res.body.data.category.slug).toBe('custom-slug');
  });

  it('reactivates a deactivated category', async () => {
    const { token } = await adminAuth();
    const cat = await seedCategory({ is_active: false });

    const res = await request(app)
      .put(`/api/v1/admin/categories/${cat.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ is_active: true });

    expect(res.body.data.category.is_active).toBe(true);
  });

  it('returns 404 for non-existent id', async () => {
    const { token } = await adminAuth();

    const res = await request(app)
      .put('/api/v1/admin/categories/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid UUID in path', async () => {
    const { token } = await adminAuth();

    const res = await request(app)
      .put('/api/v1/admin/categories/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });

    expect(res.status).toBe(400);
  });

  it('rejects empty update body', async () => {
    const { token } = await adminAuth();
    const cat = await seedCategory();

    const res = await request(app)
      .put(`/api/v1/admin/categories/${cat.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/v1/admin/categories/:id', () => {
  it('deactivates instead of hard-deleting', async () => {
    const { token } = await adminAuth();
    const cat = await seedCategory();

    const res = await request(app)
      .delete(`/api/v1/admin/categories/${cat.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.category.is_active).toBe(false);

    // Row still exists in DB
    const row = await db.query('SELECT is_active FROM categories WHERE id = $1', [cat.id]);
    expect(row.rows[0]).toBeDefined();
    expect(row.rows[0].is_active).toBe(false);
  });

  it('is idempotent — deactivating an already-inactive category does not error', async () => {
    const { token } = await adminAuth();
    const cat = await seedCategory({ is_active: false });

    const res = await request(app)
      .delete(`/api/v1/admin/categories/${cat.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.category.is_active).toBe(false);
  });

  it('returns 404 for non-existent id', async () => {
    const { token } = await adminAuth();

    const res = await request(app)
      .delete('/api/v1/admin/categories/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
