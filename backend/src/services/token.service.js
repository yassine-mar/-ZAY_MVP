'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const UserModel = require('../models/user.model');
const SellerModel = require('../models/seller.model');
const RefreshTokenModel = require('../models/refreshToken.model');
const { USER_ROLES, USER_STATUSES } = require('../constants/roles');

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_TOKEN_BYTES = 48;                         // 64 chars base64url

/**
 * Sign an access token for a regular user (customer or seller).
 * Includes seller_status in the payload when applicable.
 */
const signAccessToken = (user, sellerProfile = null) => {
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

/**
 * Sign an admin token. Signed with ADMIN_JWT_SECRET so it's cryptographically
 * distinct from user tokens — a forged user token cannot impersonate admin
 * even if role='admin' is injected.
 */
const signAdminToken = (user) =>
  jwt.sign(
    { sub: user.id, role: USER_ROLES.ADMIN, isAdmin: true },
    env.ADMIN_JWT_SECRET,
    { expiresIn: env.ADMIN_JWT_EXPIRES_IN, algorithm: 'HS256' }
  );

const generateRefreshToken = () =>
  crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');

const hashRefreshToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const parseExpiresIn = (ttl) => {
  if (typeof ttl === 'number') return ttl;
  const match = /^(\d+)([smhd])$/.exec(String(ttl).trim());
  if (!match) return 900;
  const num = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return num * multipliers[unit];
};

/**
 * Issue a fresh (access + refresh) token pair for a user.
 * The refresh token is persisted (hashed) and the raw value is returned
 * to the client exactly once.
 */
const issueTokenPair = async (user, sellerProfile = null, ctx = {}) => {
  const accessToken = signAccessToken(user, sellerProfile);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await RefreshTokenModel.create({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt,
    userAgent: ctx.userAgent ?? null,
    ip: ctx.ip ?? null,
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: parseExpiresIn(env.JWT_EXPIRES_IN),
  };
};

/**
 * Exchange a refresh token for a new pair (rotation).
 *
 * Security rules — any of these reject with 401 INVALID_REFRESH_TOKEN:
 *   - Token not found in DB
 *   - Token revoked (logout or reuse-triggered family revoke)
 *   - Token expired
 *   - Token already used (= theft signal → revoke entire user family)
 *   - Owning user no longer exists or is suspended
 */
const rotateRefreshToken = async (presentedToken, ctx = {}) => {
  if (typeof presentedToken !== 'string' || presentedToken.length < 8) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
  }

  const tokenHash = hashRefreshToken(presentedToken);
  const stored = await RefreshTokenModel.findByHash(tokenHash);

  if (!stored) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
  }

  if (stored.revoked_at) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token has been revoked');
  }

  if (new Date(stored.expires_at).getTime() <= Date.now()) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token has expired');
  }

  // Reuse detection — token was already rotated; presenting it again is a theft signal.
  if (stored.used_at) {
    logger.warn('Refresh token reuse detected — revoking family', {
      userId: stored.user_id,
      tokenId: stored.id,
      ip: ctx.ip,
    });
    await RefreshTokenModel.revokeAllForUser(stored.user_id);
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token has been used');
  }

  const user = await UserModel.findById(stored.user_id);
  if (!user || user.status === USER_STATUSES.SUSPENDED) {
    await RefreshTokenModel.revokeAllForUser(stored.user_id);
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Account no longer valid');
  }

  const sellerProfile = user.role === USER_ROLES.SELLER
    ? await SellerModel.findByUserId(user.id)
    : null;

  // Issue the new pair, then atomically mark the old token as rotated.
  const newAccessToken = signAccessToken(user, sellerProfile);
  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await RefreshTokenModel.rotate({
    oldId: stored.id,
    userId: user.id,
    newTokenHash: newRefreshTokenHash,
    newExpiresAt,
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
  });

  return {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    token_type: 'Bearer',
    expires_in: parseExpiresIn(env.JWT_EXPIRES_IN),
  };
};

/**
 * Revoke a single refresh token (on logout).
 * Silent if not found — logout should never reveal whether the token was valid.
 */
const revokeRefreshToken = async (presentedToken) => {
  if (!presentedToken) return;
  const tokenHash = hashRefreshToken(presentedToken);
  await RefreshTokenModel.revokeByHash(tokenHash);
};

module.exports = {
  signAccessToken,
  signAdminToken,
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  // exported for tests:
  hashRefreshToken,
  generateRefreshToken,
};
