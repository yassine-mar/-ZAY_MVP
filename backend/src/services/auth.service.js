'use strict';

const bcrypt = require('bcrypt');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const UserModel = require('../models/user.model');
const SellerModel = require('../models/seller.model');
const RefreshTokenModel = require('../models/refreshToken.model');
const TokenService = require('./token.service');
const { withTransaction } = require('../models/base.model');
const { USER_ROLES, USER_STATUSES } = require('../constants/roles');

/**
 * AuthService — public surface:
 *   register({ name, email, phone, password }, ctx)
 *   registerSeller({ ...customer fields, business_name, bio, address, city, delivery_radius_km }, ctx)
 *   login({ email, password }, ctx)
 *   adminLogin({ email, password }, ctx)
 *   refresh({ refresh_token }, ctx)
 *   logout(userId, refreshToken)
 *
 * `ctx` is optional and carries { ip, userAgent } for refresh-token audit columns.
 *
 * Security invariants:
 *   - Passwords hashed with bcrypt cost 12.
 *   - Email lowercased + trimmed before any DB lookup or write.
 *   - Login is timing-safe: bcrypt.compare always runs, even on unknown email.
 *   - Generic error message on auth failure — never reveals which field is wrong.
 *   - Suspended users cannot log in.
 *   - Admin login signs with a SEPARATE secret (ADMIN_JWT_SECRET).
 *   - Refresh tokens are rotated on every use; reuse triggers family revoke.
 */

const BCRYPT_ROUNDS = 12;
// A real bcrypt hash with cost factor 12 — used for timing-safe compare when no user found.
// The string must be a valid bcrypt hash format, otherwise bcrypt.compare returns immediately.
const DUMMY_HASH = '$2b$12$' + 'A'.repeat(53);

const normalizeEmail = (email) => String(email).toLowerCase().trim();

const register = async ({ name, email, phone, password }, ctx = {}) => {
  const normalizedEmail = normalizeEmail(email);

  if (await UserModel.existsByEmail(normalizedEmail)) {
    throw new AppError(409, 'CONFLICT', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await UserModel.create({
    name: String(name).trim(),
    email: normalizedEmail,
    phone,
    passwordHash,
    role: USER_ROLES.CUSTOMER,
  });

  const tokens = await TokenService.issueTokenPair(user, null, ctx);

  logger.info('User registered', { userId: user.id, role: user.role });
  return { user, tokens };
};

const registerSeller = async (input, ctx = {}) => {
  const normalizedEmail = normalizeEmail(input.email);

  if (await UserModel.existsByEmail(normalizedEmail)) {
    throw new AppError(409, 'CONFLICT', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  // user + seller_profile must be created atomically — partial state is invalid.
  const { user, sellerProfile } = await withTransaction(async (client) => {
    const u = await UserModel.create(
      {
        name: String(input.name).trim(),
        email: normalizedEmail,
        phone: input.phone,
        passwordHash,
        role: USER_ROLES.SELLER,
      },
      client
    );

    const sp = await SellerModel.create(
      {
        userId: u.id,
        businessName: String(input.business_name).trim(),
        bio: input.bio || null,
        address: input.address,
        city: input.city,
        deliveryRadiusKm: input.delivery_radius_km,
      },
      client
    );

    return { user: u, sellerProfile: sp };
  });

  const tokens = await TokenService.issueTokenPair(user, sellerProfile, ctx);

  logger.info('Seller registered', { userId: user.id, sellerId: sellerProfile.id });
  return { user, sellerProfile, tokens };
};

const login = async ({ email, password }, ctx = {}) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await UserModel.findByEmailWithPassword(normalizedEmail);

  // Timing-safe: always run bcrypt.compare so attackers can't distinguish
  // "user not found" from "user found, wrong password" by response time.
  const passwordMatches = user
    ? await bcrypt.compare(password, user.password_hash)
    : await bcrypt.compare(password, DUMMY_HASH);

  if (!user || !passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  if (user.status === USER_STATUSES.SUSPENDED) {
    throw new AppError(
      403,
      'ACCOUNT_SUSPENDED',
      'Your account has been suspended. Please contact support.'
    );
  }

  // Strip password_hash from the result before passing back to caller.
  // The serializer in the controller will catch it as well — defense in depth.
  delete user.password_hash;

  let sellerProfile = null;
  if (user.role === USER_ROLES.SELLER) {
    sellerProfile = await SellerModel.findByUserId(user.id);
  }

  const tokens = await TokenService.issueTokenPair(user, sellerProfile, ctx);

  logger.info('User logged in', { userId: user.id, role: user.role });
  return { user, sellerProfile, tokens };
};

const adminLogin = async ({ email, password }, _ctx = {}) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await UserModel.findByEmailWithPassword(normalizedEmail);

  const passwordMatches = user
    ? await bcrypt.compare(password, user.password_hash)
    : await bcrypt.compare(password, DUMMY_HASH);

  // Treat "not admin role" the same as wrong credentials — don't reveal that
  // the email exists as a customer/seller.
  if (!user || !passwordMatches || user.role !== USER_ROLES.ADMIN) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  if (user.status === USER_STATUSES.SUSPENDED) {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Account suspended');
  }

  delete user.password_hash;
  const accessToken = TokenService.signAdminToken(user);

  logger.info('Admin logged in', { userId: user.id });
  return { user, accessToken };
};

const refresh = async ({ refresh_token: refreshToken }, ctx = {}) =>
  TokenService.rotateRefreshToken(refreshToken, ctx);

const logout = async (userId, refreshToken) => {
  if (refreshToken) {
    await TokenService.revokeRefreshToken(refreshToken);
  }
  await UserModel.clearFcmToken(userId);
  logger.info('User logged out', { userId });
};

module.exports = {
  register,
  registerSeller,
  login,
  adminLogin,
  refresh,
  logout,
};
