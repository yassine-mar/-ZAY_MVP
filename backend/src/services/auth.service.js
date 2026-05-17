'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const UserModel = require('../models/user.model');
const SellerModel = require('../models/seller.model');
const { withTransaction } = require('../models/base.model');

const BCRYPT_ROUNDS = 12;
const DUMMY_HASH = '$2b$12$invalidhashforuserwhennotfound00000000000000000000000000';

/**
 * Register a new customer account.
 * @returns {{ user: object, token: string }}
 */
const register = async ({ name, email, phone, password }) => {
  // TODO:
  // 1. Check email uniqueness → throw AppError(409, 'CONFLICT')
  // 2. bcrypt.hash(password, BCRYPT_ROUNDS)
  // 3. UserModel.create({ name, email, phone, passwordHash, role: 'customer' })
  // 4. signUserToken(user)
  // 5. Return { user: serializeUser(user), token }
  throw new Error('Not implemented');
};

/**
 * Register a new seller account (status: pending).
 * Uses a DB transaction: creates user + seller_profile atomically.
 * @returns {{ user: object, sellerProfile: object, token: string }}
 */
const registerSeller = async ({ name, email, phone, password, business_name, bio, address, city, delivery_radius_km }) => {
  // TODO:
  // 1. Check email uniqueness → throw AppError(409, 'CONFLICT')
  // 2. bcrypt.hash(password, BCRYPT_ROUNDS)
  // 3. withTransaction(async (client) => {
  //      user = UserModel.create({ ..., role: 'seller' }, client)
  //      sellerProfile = SellerModel.create({ userId: user.id, ... }, client)
  //    })
  // 4. signUserToken(user, sellerProfile)
  // 5. Return { user, sellerProfile, token }
  throw new Error('Not implemented');
};

/**
 * Login with email + password.
 * TIMING SAFE: Always runs bcrypt.compare even when user not found.
 * @returns {{ user: object, token: string }}
 */
const login = async ({ email, password }) => {
  // TODO:
  // 1. UserModel.findByEmailWithPassword(email)
  // 2. If not found: bcrypt.compare(password, DUMMY_HASH) then throw AppError(401, 'INVALID_CREDENTIALS')
  // 3. If found: bcrypt.compare(password, user.password_hash)
  // 4. If no match: throw AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  // 5. If user.status === 'suspended': throw AppError(403, 'ACCOUNT_SUSPENDED')
  // 6. If seller: fetch sellerProfile
  // 7. Sign token, return { user: serializeUser(user), token }
  throw new Error('Not implemented');
};

/**
 * Admin login — signs with ADMIN_JWT_SECRET, shorter expiry.
 * @returns {{ token: string }}
 */
const adminLogin = async ({ email, password }) => {
  // TODO: same as login but:
  // - Verify user.role === 'admin' → throw AppError(403, 'FORBIDDEN') if not
  // - Use jwt.sign with env.ADMIN_JWT_SECRET and env.ADMIN_JWT_EXPIRES_IN
  throw new Error('Not implemented');
};

/**
 * Clear FCM token on logout.
 * @returns {void}
 */
const logout = async (userId) => {
  // TODO: UserModel.clearFcmToken(userId)
  throw new Error('Not implemented');
};

/** @returns {string} signed JWT */
const signUserToken = (user, sellerProfile = null) => {
  const payload = {
    sub: user.id,
    role: user.role,
    ...(sellerProfile && { seller_status: sellerProfile.status }),
  };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
};

module.exports = { register, registerSeller, login, adminLogin, logout };
