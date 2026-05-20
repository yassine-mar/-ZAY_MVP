'use strict';

const { db } = require('../../src/config/database');

const seedCategory = async (overrides = {}) => {
  const final = {
    name: 'Tagine',
    slug: `tagine-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    icon: '🥘',
    sort_order: 0,
    is_active: true,
    ...overrides,
  };
  const result = await db.query(
    `INSERT INTO categories (id, name, slug, icon, sort_order, is_active)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)
     RETURNING *`,
    [final.name, final.slug, final.icon, final.sort_order, final.is_active]
  );
  return result.rows[0];
};

const seedMenu = async (sellerId, overrides = {}) => {
  const final = {
    name: 'Plats Chauds',
    description: 'Tagines et plats mijotés',
    sort_order: 0,
    ...overrides,
  };
  const result = await db.query(
    `INSERT INTO menus (id, seller_id, name, description, sort_order)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4)
     RETURNING *`,
    [sellerId, final.name, final.description, final.sort_order]
  );
  return result.rows[0];
};

const seedMenuItem = async (menuId, categoryId, overrides = {}) => {
  const final = {
    name: 'Tagine Poulet aux Olives',
    description: 'Poulet mijoté avec olives vertes et citron confit',
    price: 65,
    prep_time_min: 45,
    image_url: null,
    image_public_id: null,
    is_available: true,
    ...overrides,
  };
  const result = await db.query(
    `INSERT INTO menu_items
       (id, menu_id, category_id, name, description, price,
        prep_time_min, image_url, image_public_id, is_available)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      menuId, categoryId, final.name, final.description, final.price,
      final.prep_time_min, final.image_url, final.image_public_id, final.is_available,
    ]
  );
  return result.rows[0];
};

const truncateMenuTables = async () => {
  // menu_items has FK to menus + categories; truncate menu_items first
  // (or use CASCADE — the truncate of `menus` already cascades to menu_items).
  await db.query('TRUNCATE TABLE menu_items, menus, categories RESTART IDENTITY CASCADE');
};

module.exports = {
  seedCategory,
  seedMenu,
  seedMenuItem,
  truncateMenuTables,
};
