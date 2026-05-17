'use strict';

const { runMigrations } = require('../../migrations/migrate');
const { db } = require('../../src/config/database');

const truncateAllTables = async () => {
  await db.query(`
    TRUNCATE TABLE
      notifications,
      order_status_history,
      order_items,
      orders,
      menu_items,
      menus,
      categories,
      seller_profiles,
      users,
      schema_migrations
    RESTART IDENTITY CASCADE
  `);
};

const setupTestDatabase = async () => {
  await runMigrations();
};

const teardownTestDatabase = async () => {
  await db.end();
};

module.exports = { truncateAllTables, setupTestDatabase, teardownTestDatabase };
