'use strict';

const request = require('supertest');
const { createApp } = require('../../src/app');
const { closeDatabase } = require('../../src/config/database');
const { createTestSeller, truncateAuthTables } = require('../helpers/auth.helpers');
const {
  seedCategory,
  seedMenu,
  seedMenuItem,
  truncateMenuTables,
} = require('../helpers/menu.helpers');

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

const seedFixture = async ({
  sellerOverrides = {},
  catOverrides = {},
  itemOverrides = {},
} = {}) => {
  const { sellerProfile } = await createTestSeller(sellerOverrides);
  const category = await seedCategory({
    slug: `tagine-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    ...catOverrides,
  });
  const menu = await seedMenu(sellerProfile.id);
  const item = await seedMenuItem(menu.id, category.id, itemOverrides);
  return { sellerProfile, category, menu, item };
};

describe('GET /api/v1/browse/items', () => {
  it('returns available items from approved sellers (public, no auth)', async () => {
    await seedFixture({ itemOverrides: { name: 'Tagine Poulet aux Olives' } });

    const res = await request(app).get('/api/v1/browse/items');

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].name).toBe('Tagine Poulet aux Olives');
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('excludes unavailable items', async () => {
    await seedFixture({ itemOverrides: { name: 'Visible', is_available: true } });
    await seedFixture({
      catOverrides: { slug: `c-${Date.now()}-${Math.random()}` },
      itemOverrides: { name: 'Hidden', is_available: false },
    });

    const res = await request(app).get('/api/v1/browse/items');

    expect(res.body.data.items.map((i) => i.name)).toEqual(['Visible']);
  });

  it('excludes items from non-approved sellers', async () => {
    await seedFixture({ sellerOverrides: { sellerStatus: 'pending' } });

    const res = await request(app).get('/api/v1/browse/items');

    expect(res.body.data.items).toEqual([]);
  });

  it('filters by category slug', async () => {
    const { category } = await seedFixture({
      catOverrides: { slug: 'tagine-test' },
      itemOverrides: { name: 'A tagine' },
    });
    await seedFixture({
      catOverrides: { slug: 'couscous-test' },
      itemOverrides: { name: 'A couscous' },
    });

    const res = await request(app).get(`/api/v1/browse/items?category=${category.slug}`);

    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].name).toBe('A tagine');
  });

  it('filters by price range', async () => {
    await seedFixture({
      catOverrides: { slug: `c-${Date.now()}-1` },
      itemOverrides: { name: 'Cheap', price: 30 },
    });
    await seedFixture({
      catOverrides: { slug: `c-${Date.now()}-2` },
      itemOverrides: { name: 'Mid', price: 80 },
    });
    await seedFixture({
      catOverrides: { slug: `c-${Date.now()}-3` },
      itemOverrides: { name: 'Expensive', price: 200 },
    });

    const res = await request(app).get('/api/v1/browse/items?min_price=50&max_price=120');

    expect(res.body.data.items.map((i) => i.name)).toEqual(['Mid']);
  });

  it('rejects min_price > max_price', async () => {
    const res = await request(app).get('/api/v1/browse/items?min_price=100&max_price=50');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('full-text searches with French diacritics', async () => {
    await seedFixture({
      catOverrides: { slug: `c-${Date.now()}-1` },
      itemOverrides: { name: 'Pastilla au poulet', description: 'Délicieuse pastilla sucrée-salée' },
    });
    await seedFixture({
      catOverrides: { slug: `c-${Date.now()}-2` },
      itemOverrides: { name: 'Harira', description: 'Soupe traditionnelle marocaine' },
    });

    const res = await request(app).get('/api/v1/browse/items?search=pastilla');

    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].name).toContain('Pastilla');
  });

  it('paginates results', async () => {
    for (let i = 0; i < 5; i += 1) {
      await seedFixture({
        catOverrides: { slug: `c-${Date.now()}-${i}-${Math.random()}` },
        itemOverrides: { name: `Item ${i}`, price: 10 + i },
      });
    }

    const page1 = await request(app).get('/api/v1/browse/items?limit=2&page=1');
    const page2 = await request(app).get('/api/v1/browse/items?limit=2&page=2');

    expect(page1.body.data.items).toHaveLength(2);
    expect(page2.body.data.items).toHaveLength(2);
    expect(page1.body.data.pagination.total).toBe(5);
    expect(page1.body.data.pagination.totalPages).toBe(3);
    expect(page1.body.data.pagination.hasNext).toBe(true);
    expect(page2.body.data.pagination.hasPrev).toBe(true);
  });

  it('sorts by price ascending', async () => {
    await seedFixture({
      catOverrides: { slug: `c-${Date.now()}-1` },
      itemOverrides: { name: 'Mid', price: 80 },
    });
    await seedFixture({
      catOverrides: { slug: `c-${Date.now()}-2` },
      itemOverrides: { name: 'Cheap', price: 30 },
    });
    await seedFixture({
      catOverrides: { slug: `c-${Date.now()}-3` },
      itemOverrides: { name: 'Expensive', price: 200 },
    });

    const res = await request(app).get('/api/v1/browse/items?sort=price_asc');

    expect(res.body.data.items.map((i) => Number(i.price))).toEqual([30, 80, 200]);
  });
});

describe('GET /api/v1/browse/items/featured', () => {
  it('returns featured items (recent fallback when no orders exist)', async () => {
    await seedFixture({
      catOverrides: { slug: `c-${Date.now()}-1` },
      itemOverrides: { name: 'Recent Item' },
    });

    const res = await request(app).get('/api/v1/browse/items/featured');

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });
});

describe('GET /api/v1/browse/categories', () => {
  it('returns categories (proxy to /categories)', async () => {
    await seedCategory({ slug: `tagine-${Date.now()}`, name: 'Tagine' });

    const res = await request(app).get('/api/v1/browse/categories');

    expect(res.status).toBe(200);
    expect(res.body.data.categories.length).toBeGreaterThan(0);
  });
});
