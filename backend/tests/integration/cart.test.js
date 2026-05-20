'use strict';

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

const signCustomerToken = (user) =>
  jwt.sign(
    { sub: user.id, role: 'customer' },
    env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN }
  );

const setup = async ({ sellerOverrides = {}, itemPrice = 65 } = {}) => {
  const customer = await createTestUser();
  const customerToken = signCustomerToken(customer);
  const { sellerProfile } = await createTestSeller(sellerOverrides);
  const category = await seedCategory({
    slug: `c-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
  });
  const menu = await seedMenu(sellerProfile.id);
  const item = await seedMenuItem(menu.id, category.id, { price: itemPrice });
  return { customer, customerToken, sellerProfile, category, menu, item };
};

describe('POST /api/v1/cart/validate', () => {
  it('returns valid=true for a clean cart from an open approved seller', async () => {
    const { customerToken, item } = await setup({ itemPrice: 65 });

    const res = await request(app)
      .post('/api/v1/cart/validate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ menu_item_id: item.id, quantity: 2 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.blockers).toEqual([]);
    expect(res.body.data.warnings).toEqual([]);
    expect(Number(res.body.data.total_amount)).toBe(130);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].available).toBe(true);
  });

  it('warns when an item became unavailable', async () => {
    const { customerToken, category, menu, item: avail } = await setup();
    const goneItem = await seedMenuItem(menu.id, category.id, {
      name: 'Sold Out',
      price: 30,
      is_available: false,
    });

    const res = await request(app)
      .post('/api/v1/cart/validate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [
          { menu_item_id: avail.id, quantity: 1 },
          { menu_item_id: goneItem.id, quantity: 1 },
        ],
      });

    expect(res.body.data.valid).toBe(false);
    expect(res.body.data.warnings).toContain('items_unavailable');
    const goneResult = res.body.data.items.find((i) => i.menu_item_id === goneItem.id);
    expect(goneResult.available).toBe(false);
    expect(goneResult.issues).toContain('item_unavailable');
    // Total reflects only available items.
    expect(Number(res.body.data.total_amount)).toBe(Number(avail.price));
  });

  it('warns when a price has changed since the client cached it', async () => {
    const { customerToken, item } = await setup({ itemPrice: 75 });

    const res = await request(app)
      .post('/api/v1/cart/validate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ menu_item_id: item.id, quantity: 1, client_price: 65 }], // client saw old price
      });

    expect(res.body.data.warnings).toContain('prices_changed');
    expect(res.body.data.valid).toBe(false);
    const result = res.body.data.items[0];
    expect(result.price_changed).toBe(true);
    expect(Number(result.current_price)).toBe(75);
    expect(Number(result.client_price)).toBe(65);
  });

  it('blocks when items belong to multiple sellers', async () => {
    const { customerToken, item: itemA } = await setup();
    const { sellerProfile: sellerB } = await createTestSeller();
    const catB = await seedCategory({ slug: `c-${Date.now()}-${Math.random()}` });
    const menuB = await seedMenu(sellerB.id);
    const itemB = await seedMenuItem(menuB.id, catB.id);

    const res = await request(app)
      .post('/api/v1/cart/validate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [
          { menu_item_id: itemA.id, quantity: 1 },
          { menu_item_id: itemB.id, quantity: 1 },
        ],
      });

    expect(res.body.data.valid).toBe(false);
    expect(res.body.data.blockers).toContain('cross_seller_order');
    expect(Number(res.body.data.total_amount)).toBe(0);
  });

  it('blocks when the seller is closed', async () => {
    const { customerToken, sellerProfile, item } = await setup();
    await db.query('UPDATE seller_profiles SET is_open = FALSE WHERE id = $1', [sellerProfile.id]);

    const res = await request(app)
      .post('/api/v1/cart/validate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ menu_item_id: item.id, quantity: 1 }] });

    expect(res.body.data.valid).toBe(false);
    expect(res.body.data.blockers).toContain('seller_closed');
  });

  it('blocks when all items in the cart no longer exist', async () => {
    const { customerToken } = await setup();

    const res = await request(app)
      .post('/api/v1/cart/validate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [
          { menu_item_id: '00000000-0000-4000-8000-000000000001', quantity: 1 },
          { menu_item_id: '00000000-0000-4000-8000-000000000002', quantity: 1 },
        ],
      });

    expect(res.body.data.valid).toBe(false);
    expect(res.body.data.blockers).toContain('all_items_unavailable');
  });

  it('rejects empty items array via Joi validator', async () => {
    const { customerToken } = await setup();

    const res = await request(app)
      .post('/api/v1/cart/validate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects quantity > 10 (single-line abuse cap)', async () => {
    const { customerToken, item } = await setup();

    const res = await request(app)
      .post('/api/v1/cart/validate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ menu_item_id: item.id, quantity: 99 }] });

    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/v1/cart/validate')
      .send({ items: [{ menu_item_id: '00000000-0000-4000-8000-000000000001', quantity: 1 }] });

    expect(res.status).toBe(401);
  });

  it('rejects sellers and admins (customer-only endpoint)', async () => {
    const { sellerProfile } = await createTestSeller();
    const sellerUser = await db.query('SELECT * FROM users WHERE id = $1', [sellerProfile.user_id]);
    const sellerToken = jwt.sign(
      { sub: sellerUser.rows[0].id, role: 'seller', seller_status: 'approved' },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN }
    );

    const res = await request(app)
      .post('/api/v1/cart/validate')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ items: [{ menu_item_id: '00000000-0000-4000-8000-000000000001', quantity: 1 }] });

    expect(res.status).toBe(403);
  });
});
