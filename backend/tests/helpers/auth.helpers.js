'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../../src/config/database');
const env = require('../../src/config/env');

const FAST_BCRYPT_ROUNDS = 4; // tests don't need cost factor 12

const buildRegisterPayload = (overrides = {}) => ({
  name: 'Fatima Test',
  email: `test-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
  phone: '+212612345678',
  password: 'StrongPass1!',
  ...overrides,
});

const buildSellerRegisterPayload = (overrides = {}) => ({
  ...buildRegisterPayload(),
  business_name: 'Dar Test',
  bio: 'Test bio',
  address: 'Rue Test, Maârif',
  city: 'Casablanca',
  delivery_radius_km: 5,
  ...overrides,
});

const createTestUser = async ({
  role = 'customer',
  status = 'active',
  email,
  password = 'StrongPass1!',
  name = 'Test User',
  phone = '+212612345678',
} = {}) => {
  const passwordHash = await bcrypt.hash(password, FAST_BCRYPT_ROUNDS);
  const userEmail = email || `test-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

  const result = await db.query(
    `INSERT INTO users (id, name, email, phone, password_hash, role, status)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, userEmail, phone, passwordHash, role, status]
  );
  return { ...result.rows[0], _password: password };
};

const createTestSeller = async ({ sellerStatus = 'approved', ...userOverrides } = {}) => {
  const user = await createTestUser({ ...userOverrides, role: 'seller' });

  const sellerResult = await db.query(
    `INSERT INTO seller_profiles
       (id, user_id, business_name, address, city, delivery_radius_km, status, approved_at)
     VALUES
       (uuid_generate_v4(), $1, $2, $3, $4, $5, $6,
        CASE WHEN $6 = 'approved' THEN NOW() ELSE NULL END)
     RETURNING *`,
    [user.id, 'Test Kitchen', 'Test Address', 'Casablanca', 5, sellerStatus]
  );
  return { user, sellerProfile: sellerResult.rows[0] };
};

const createTestAdmin = async (overrides = {}) =>
  createTestUser({ ...overrides, role: 'admin', name: overrides.name || 'Test Admin' });

/**
 * Sign an admin JWT directly without going through the login flow.
 * Use this when a test exercises an admin endpoint and doesn't need to
 * verify the admin login plumbing itself.
 */
const generateAdminToken = (user) =>
  jwt.sign(
    { sub: user.id, role: 'admin', isAdmin: true },
    env.ADMIN_JWT_SECRET,
    { algorithm: 'HS256', expiresIn: env.ADMIN_JWT_EXPIRES_IN }
  );

const truncateAuthTables = async () => {
  await db.query('TRUNCATE TABLE refresh_tokens, seller_profiles, users RESTART IDENTITY CASCADE');
};

const truncateCategoriesTable = async () => {
  await db.query('TRUNCATE TABLE categories RESTART IDENTITY CASCADE');
};

module.exports = {
  buildRegisterPayload,
  buildSellerRegisterPayload,
  createTestUser,
  createTestSeller,
  createTestAdmin,
  generateAdminToken,
  truncateAuthTables,
  truncateCategoriesTable,
};
