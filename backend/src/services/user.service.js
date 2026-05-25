'use strict';

const bcrypt = require('bcrypt');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const UserModel = require('../models/user.model');
const SellerModel = require('../models/seller.model');
const OrderModel = require('../models/order.model');
const RefreshTokenModel = require('../models/refreshToken.model');
const UploadService = require('./upload.service');
const { withTransaction } = require('../models/base.model');
const { USER_ROLES } = require('../constants/roles');

const BCRYPT_ROUNDS = 12;

/**
 * Whitelist of fields a user can update on themselves via PUT /users/me.
 * - email is immutable (would require verification flow — Phase 2)
 * - role / status are not user-controllable (admin only)
 * - password has its own dedicated endpoint
 * - avatar has its own dedicated endpoint (multipart)
 */
const ALLOWED_PROFILE_FIELDS = ['name', 'phone'];

/* ── Profile ───────────────────────────────────────────────────────────── */

const getMe = async (userId) => {
  const user = await UserModel.findById(userId);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

  if (user.role === USER_ROLES.SELLER) {
    user.sellerProfile = await SellerModel.findByUserId(user.id);
  }
  return user;
};

const updateMe = async (userId, fields) => {
  const sanitized = {};
  for (const key of ALLOWED_PROFILE_FIELDS) {
    if (fields[key] !== undefined) {
      sanitized[key] = typeof fields[key] === 'string' ? fields[key].trim() : fields[key];
    }
  }

  if (Object.keys(sanitized).length === 0) {
    throw new AppError(
      400,
      'BAD_REQUEST',
      `No valid fields to update. Allowed: ${ALLOWED_PROFILE_FIELDS.join(', ')}`
    );
  }

  const updated = await UserModel.update(userId, sanitized);
  if (!updated) throw new AppError(404, 'NOT_FOUND', 'User not found');

  logger.info('Profile updated', { userId, fields: Object.keys(sanitized) });
  return updated;
};

/* ── Password change ───────────────────────────────────────────────────── */

const changePassword = async (userId, { currentPassword, newPassword }) => {
  if (currentPassword === newPassword) {
    throw new AppError(400, 'SAME_PASSWORD', 'New password must be different from current password');
  }

  const user = await UserModel.findByIdWithPassword(userId);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

  const matches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!matches) {
    throw new AppError(401, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await UserModel.updatePassword(userId, newHash);

  // Security: revoke ALL refresh tokens. Forces re-login on every device —
  // the right move after a password change (only the current session is
  // intentional; any other active session is suspect or stale).
  await RefreshTokenModel.revokeAllForUser(userId);

  logger.info('Password changed', { userId });
};

/* ── Avatar ────────────────────────────────────────────────────────────── */

const uploadAvatar = async (userId, file) => {
  if (!file || !file.buffer) {
    throw new AppError(400, 'BAD_REQUEST', 'No image file provided');
  }

  const user = await UserModel.findById(userId);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

  const previousPublicId = user.avatar_public_id;

  const { secure_url, public_id } = await UploadService.uploadImage(file.buffer, 'avatars');

  await UserModel.update(userId, {
    avatar_url: secure_url,
    avatar_public_id: public_id,
  });

  // Fire-and-forget cleanup of the old asset. Failure is logged but never
  // bubbles up — the new avatar is already saved.
  if (previousPublicId) {
    UploadService.deleteImage(previousPublicId).catch((err) => {
      logger.warn('Old avatar cleanup failed', { previousPublicId, error: err.message });
    });
  }

  logger.info('Avatar updated', { userId });
  return { avatar_url: secure_url };
};

/* ── FCM token ─────────────────────────────────────────────────────────── */

const updateFcmToken = async (userId, fcmToken) => {
  await UserModel.updateFcmToken(userId, fcmToken);
};

const clearFcmToken = async (userId) => {
  await UserModel.clearFcmToken(userId);
};

/* ── Account deletion ──────────────────────────────────────────────────── */

/**
 * Soft-delete the user account.
 * Blocked when active orders exist (per API Design critique Issue #4).
 * Atomically: revoke refresh tokens, soft-delete user, suspend seller profile.
 */
const deleteMe = async (userId) => {
  const activeCount = await OrderModel.countActiveByCustomer(userId);
  if (activeCount > 0) {
    throw new AppError(
      409,
      'ACTIVE_ORDERS_EXIST',
      'Cannot delete account while you have active orders. Please wait for them to complete or contact support.'
    );
  }

  await withTransaction(async (client) => {
    // Revoke every active refresh token — this user is gone, all sessions die.
    await client.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );

    // Soft delete the user row.
    await UserModel.softDelete(userId, client);

    // If the user is a seller, suspend their seller profile so it stops
    // appearing in browse results / preventing existing seller_profiles row
    // from acting as an orphan.
    await SellerModel.markSuspendedByUserId(userId, 'Account deleted by user', client);
  });

  logger.info('Account deleted', { userId });
};

module.exports = {
  getMe,
  updateMe,
  changePassword,
  uploadAvatar,
  updateFcmToken,
  clearFcmToken,
  deleteMe,
  ALLOWED_PROFILE_FIELDS,
};
