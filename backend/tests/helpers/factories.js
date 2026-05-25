'use strict';

/**
 * Fluent test-data factory.
 *
 * Composes the per-domain helpers (auth, menu, order) into one entry-point
 * so integration tests can build complex scenarios in a few lines instead
 * of a dozen sequential helper calls.
 *
 *   const scene = await factory.scene.customerOrderingFromSeller();
 *   await request(app)
 *     .post(`/api/v1/orders/${scene.order.id}/cancel`)
 *     .set('Authorization', `Bearer ${scene.tokens.customer}`)
 *     .expect(200);
 *
 * Each builder returns the full set of created records so tests can
 * assert on any layer without re-querying the DB.
 */
const jwt = require('jsonwebtoken');
const env = require('../../src/config/env');

const auth = require('./auth.helpers');
const menu = require('./menu.helpers');
const order = require('./order.helpers');

/* ── Token signing (avoids hitting /auth/login on every test) ─────────── */

const signCustomerToken = (user) =>
  jwt.sign({ sub: user.id, role: 'customer' }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN,
  });

const signSellerToken = (user, sellerStatus = 'approved') =>
  jwt.sign(
    { sub: user.id, role: 'seller', seller_status: sellerStatus },
    env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN }
  );

/* ── Scene builders ────────────────────────────────────────────────────── */

const scene = {
  /**
   * Three actors + tokens, no orders. The starting point for any
   * customer/seller interaction test.
   */
  async customerAndSeller() {
    const customer = await auth.createTestUser();
    const { user: sellerUser, sellerProfile } = await auth.createTestSeller();
    return {
      customer,
      sellerUser,
      sellerProfile,
      tokens: {
        customer: signCustomerToken(customer),
        seller: signSellerToken(sellerUser),
      },
    };
  },

  /**
   * Seller with one menu containing two items, ready to order.
   */
  async sellerWithMenu({ itemPrice = 65, secondItemPrice = 25 } = {}) {
    const base = await this.customerAndSeller();
    const category = await menu.seedCategory();
    const m = await menu.seedMenu(base.sellerProfile.id);
    const item1 = await menu.seedMenuItem(m.id, category.id, {
      name: 'Tagine Poulet',
      price: itemPrice,
    });
    const item2 = await menu.seedMenuItem(m.id, category.id, {
      name: 'Salade Marocaine',
      price: secondItemPrice,
    });
    return { ...base, category, menu: m, items: [item1, item2] };
  },

  /**
   * Full scenario: a customer has placed a pending order against a seller
   * with one item. Used by status-transition and cancel tests.
   *
   * Composes the lower-level `seedOrder` + `seedOrderItem` helpers — they
   * exist as separate primitives so tests that need fine-grained control
   * (e.g. seeding 5 items with different prices) can build their own
   * scenes; `scene.customerOrderingFromSeller` is the common case.
   */
  async customerOrderingFromSeller({ status = 'pending', quantity = 1 } = {}) {
    const base = await this.sellerWithMenu();
    const firstItem = base.items[0];
    const o = await order.seedOrder({
      customerId: base.customer.id,
      sellerId: base.sellerProfile.id,
      status,
      totalAmount: firstItem.price * quantity,
    });
    const orderItem = await order.seedOrderItem({
      orderId: o.id,
      menuItemId: firstItem.id,
      name: firstItem.name,
      price: firstItem.price,
      quantity,
    });
    return { ...base, order: { ...o, items: [orderItem] } };
  },
};

/* ── Truncate-all helper for "clean slate" tests ──────────────────────── */

const wipe = async () => {
  await order.truncateOrderTables();
  await menu.truncateMenuTables();
  await auth.truncateAuthTables();
};

module.exports = {
  signCustomerToken,
  signSellerToken,
  scene,
  wipe,
};
