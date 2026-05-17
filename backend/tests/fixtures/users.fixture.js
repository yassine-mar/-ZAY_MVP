'use strict';

const bcrypt = require('bcrypt');

const TEST_PASSWORD = 'TestPass123!';

const buildCustomer = (overrides = {}) => ({
  name: 'Test Customer',
  email: 'customer@test.com',
  phone: '+212612345678',
  password: TEST_PASSWORD,
  role: 'customer',
  ...overrides,
});

const buildSeller = (overrides = {}) => ({
  name: 'Test Seller',
  email: 'seller@test.com',
  phone: '+212698765432',
  password: TEST_PASSWORD,
  role: 'seller',
  business_name: 'Test Kitchen',
  bio: 'Test bio',
  address: 'Rue Test',
  city: 'Casablanca',
  delivery_radius_km: 5,
  ...overrides,
});

const buildAdmin = (overrides = {}) => ({
  name: 'Test Admin',
  email: 'admin@test.com',
  phone: '+212600000000',
  password: TEST_PASSWORD,
  role: 'admin',
  ...overrides,
});

const hashPassword = async (password) => bcrypt.hash(password, 4);

module.exports = { buildCustomer, buildSeller, buildAdmin, hashPassword, TEST_PASSWORD };
