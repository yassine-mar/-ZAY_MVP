'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const UserModel = require('../models/user.model');
const SellerModel = require('../models/seller.model');
const { USER_ROLES, USER_STATUSES } = require('../constants/roles');
const { setUserId } = require('../utils/requestContext');

/**
 * Verifies the Bearer access token, loads the user from DB (fresh — never
 * trusts the JWT payload beyond `sub` and signature), and attaches:
 *
 *   req.user                      → full user row (no password_hash)
 *   req.user.sellerProfile        → seller_profile row if user.role = 'seller'
 *
 * Side effects:
 *   - Populates AsyncLocalStorage userId for log correlation downstream.
 *
 * Rejects with:
 *   401 UNAUTHORIZED       — missing / malformed header, invalid token, user not found
 *   401 TOKEN_EXPIRED      — JWT exp passed
 *   403 ACCOUNT_SUSPENDED  — user.status === 'suspended'
 */
const authenticate = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  let payload;
  try {
    // Pinning `algorithms: ['HS256']` is critical — without it the library
    // would accept tokens with `alg: none`, a classic bypass.
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(
        new AppError(401, 'TOKEN_EXPIRED', 'Your session has expired. Please log in again.')
      );
    }
    return next(new AppError(401, 'UNAUTHORIZED', 'Invalid authentication token'));
  }

  if (!payload.sub) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Invalid authentication token'));
  }

  // Always re-fetch from DB. The JWT can't be revoked mid-lifetime, but
  // suspending/deleting a user takes effect on the very next request.
  const user = await UserModel.findById(payload.sub);
  if (!user) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  if (user.status === USER_STATUSES.SUSPENDED) {
    return next(
      new AppError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended.')
    );
  }

  if (user.role === USER_ROLES.SELLER) {
    user.sellerProfile = await SellerModel.findByUserId(user.id);
  }

  req.user = user;
  setUserId(user.id); // log correlation via AsyncLocalStorage
  return next();
};

module.exports = authenticate;
