'use strict';

const SellerModel = require('../models/seller.model');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const UploadService = require('./upload.service');
const { query } = require('../models/base.model');

/**
 * Whitelist of fields a seller can update on themselves.
 * Excludes:
 *   - status / approved_at / approved_by / rejected_* / suspended_*  (admin only)
 *   - is_open (has its own endpoint)
 *   - user_id (immutable)
 *   - avatar_url / banner_url (set by upload endpoints)
 */
const ALLOWED_PROFILE_FIELDS = [
  'business_name', 'bio', 'address', 'city', 'delivery_radius_km', 'specialties',
];

const getProfile = async (user) => {
  const profile = await SellerModel.findByUserId(user.id);
  if (!profile) throw new AppError(404, 'NOT_FOUND', 'Seller profile not found');
  return profile;
};

const updateProfile = async (user, fields) => {
  const sanitized = {};
  for (const key of ALLOWED_PROFILE_FIELDS) {
    if (fields[key] !== undefined) {
      sanitized[key] =
        typeof fields[key] === 'string' ? fields[key].trim() : fields[key];
    }
  }

  if (Object.keys(sanitized).length === 0) {
    throw new AppError(
      400,
      'BAD_REQUEST',
      `No valid fields to update. Allowed: ${ALLOWED_PROFILE_FIELDS.join(', ')}`
    );
  }

  const updated = await SellerModel.update(user.sellerProfile.id, sanitized);
  if (!updated) throw new AppError(404, 'NOT_FOUND', 'Seller profile not found');

  logger.info('Seller profile updated', {
    sellerId: user.sellerProfile.id,
    fields: Object.keys(sanitized),
  });
  return updated;
};

const toggleAvailability = async (user, isOpen) => {
  const updated = await SellerModel.update(user.sellerProfile.id, { is_open: Boolean(isOpen) });
  if (!updated) throw new AppError(404, 'NOT_FOUND', 'Seller profile not found');

  logger.info('Seller availability toggled', {
    sellerId: user.sellerProfile.id,
    isOpen: Boolean(isOpen),
  });
  return updated;
};

const uploadAvatar = async (user, file) => {
  if (!file || !file.buffer) {
    throw new AppError(400, 'BAD_REQUEST', 'No image file provided');
  }

  const profile = await SellerModel.findByUserId(user.id);
  if (!profile) throw new AppError(404, 'NOT_FOUND', 'Seller profile not found');

  const previousPublicId = profile.avatar_public_id;
  const { secure_url, public_id } = await UploadService.uploadImage(file.buffer, 'avatars');

  await SellerModel.update(profile.id, {
    avatar_url: secure_url,
    avatar_public_id: public_id,
  });

  if (previousPublicId) {
    UploadService.deleteImage(previousPublicId).catch((err) =>
      logger.warn('Old seller avatar cleanup failed', {
        previousPublicId, error: err.message,
      }));
  }

  return { avatar_url: secure_url, avatar_public_id: public_id };
};

const uploadBanner = async (user, file) => {
  if (!file || !file.buffer) {
    throw new AppError(400, 'BAD_REQUEST', 'No image file provided');
  }

  const profile = await SellerModel.findByUserId(user.id);
  if (!profile) throw new AppError(404, 'NOT_FOUND', 'Seller profile not found');

  const previousPublicId = profile.banner_public_id;
  // 'sellers' folder uses the 1200×400 banner transformation.
  const { secure_url, public_id } = await UploadService.uploadImage(file.buffer, 'sellers');

  await SellerModel.update(profile.id, {
    banner_url: secure_url,
    banner_public_id: public_id,
  });

  if (previousPublicId) {
    UploadService.deleteImage(previousPublicId).catch((err) =>
      logger.warn('Old seller banner cleanup failed', {
        previousPublicId, error: err.message,
      }));
  }

  return { banner_url: secure_url, banner_public_id: public_id };
};

/**
 * Minimal MVP analytics — counts + revenue for the current month.
 * Defensive against the orders table not existing (graceful staged build).
 */
const getAnalytics = async (user) => {
  const sellerId = user.sellerProfile.id;
  try {
    const stats = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status NOT IN ('cancelled'))::int AS total_orders,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_orders,
         COUNT(*) FILTER (
           WHERE status NOT IN ('cancelled')
             AND created_at >= DATE_TRUNC('month', NOW())
         )::int AS orders_this_month,
         COALESCE(
           SUM(total_amount) FILTER (
             WHERE status = 'delivered'
               AND created_at >= DATE_TRUNC('month', NOW())
           ), 0
         ) AS revenue_this_month,
         COUNT(*) FILTER (
           WHERE status = 'delivered'
             AND created_at >= NOW() - INTERVAL '30 days'
         )::int AS completed_last_30_days
       FROM orders
       WHERE seller_id = $1`,
      [sellerId]
    );

    const topItems = await query(
      `SELECT mi.id, mi.name, mi.image_url, COUNT(oi.id)::int AS order_count
       FROM order_items oi
       JOIN menu_items mi ON oi.menu_item_id = mi.id
       JOIN orders o      ON oi.order_id = o.id
       WHERE o.seller_id = $1 AND o.status NOT IN ('cancelled')
       GROUP BY mi.id, mi.name, mi.image_url
       ORDER BY order_count DESC
       LIMIT 5`,
      [sellerId]
    );

    return {
      ...stats.rows[0],
      revenue_this_month: Number(stats.rows[0].revenue_this_month),
      top_items: topItems.rows,
    };
  } catch (err) {
    if (err.code === '42P01') {
      // Orders table not yet migrated (shouldn't happen post-orders feature).
      return {
        total_orders: 0,
        pending_orders: 0,
        orders_this_month: 0,
        revenue_this_month: 0,
        completed_last_30_days: 0,
        top_items: [],
      };
    }
    throw err;
  }
};

module.exports = {
  getProfile,
  updateProfile,
  toggleAvailability,
  uploadAvatar,
  uploadBanner,
  getAnalytics,
  ALLOWED_PROFILE_FIELDS,
};
