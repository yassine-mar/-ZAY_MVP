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

/* ── Profile management (carried over from onboarding step) ───────────── */

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

/* ── Comprehensive analytics — single endpoint backing the dashboard ───── */

const EMPTY_ANALYTICS = Object.freeze({
  revenue: {
    today: 0,
    this_week: 0,
    this_month: 0,
    all_time: 0,
    pending: 0,
    average_order_value: 0,
  },
  orders: {
    today: 0,
    this_week: 0,
    this_month: 0,
    all_time: 0,
    by_status: {
      pending: 0, accepted: 0, preparing: 0, ready: 0, delivered: 0, cancelled: 0,
    },
    completion_rate: null,
  },
  trends: {
    daily_last_7_days: [],
  },
  top_items: [],
});

/**
 * Single-call dashboard analytics for the seller home screen.
 *
 * Returns:
 *   revenue:   today / this_week / this_month / all_time / pending / AOV
 *   orders:    same buckets + by_status counts + completion_rate
 *   trends:    daily orders + revenue for the last 7 days
 *   top_items: top 5 best-selling items with revenue
 *
 * Three parallel queries (stats / daily trends / top items). Defensive against
 * the orders table not existing (returns zeroed shape) — kept from the staged
 * build pattern.
 */
const getAnalytics = async (user) => {
  const sellerId = user.sellerProfile.id;

  try {
    const [statsResult, dailyResult, topItemsResult] = await Promise.all([
      query(
        `SELECT
           -- Revenue (delivered orders only, except 'pending' which is locked-in but not yet collected)
           COALESCE(SUM(total_amount) FILTER (
             WHERE status = 'delivered' AND created_at::date = CURRENT_DATE
           ), 0) AS revenue_today,
           COALESCE(SUM(total_amount) FILTER (
             WHERE status = 'delivered' AND created_at >= DATE_TRUNC('week', NOW())
           ), 0) AS revenue_this_week,
           COALESCE(SUM(total_amount) FILTER (
             WHERE status = 'delivered' AND created_at >= DATE_TRUNC('month', NOW())
           ), 0) AS revenue_this_month,
           COALESCE(SUM(total_amount) FILTER (WHERE status = 'delivered'), 0) AS revenue_all_time,
           COALESCE(SUM(total_amount) FILTER (
             WHERE status IN ('accepted', 'preparing', 'ready')
           ), 0) AS revenue_pending,
           COALESCE(AVG(total_amount) FILTER (WHERE status = 'delivered'), 0) AS aov_delivered,

           -- Orders (excludes cancelled from period counts; cancellation is tracked separately)
           COUNT(*) FILTER (
             WHERE status NOT IN ('cancelled') AND created_at::date = CURRENT_DATE
           )::int AS orders_today,
           COUNT(*) FILTER (
             WHERE status NOT IN ('cancelled') AND created_at >= DATE_TRUNC('week', NOW())
           )::int AS orders_this_week,
           COUNT(*) FILTER (
             WHERE status NOT IN ('cancelled') AND created_at >= DATE_TRUNC('month', NOW())
           )::int AS orders_this_month,
           COUNT(*) FILTER (WHERE status NOT IN ('cancelled'))::int AS orders_all_time,

           -- By-status snapshot (current state of every order this seller has ever received)
           COUNT(*) FILTER (WHERE status = 'pending')::int    AS status_pending,
           COUNT(*) FILTER (WHERE status = 'accepted')::int   AS status_accepted,
           COUNT(*) FILTER (WHERE status = 'preparing')::int  AS status_preparing,
           COUNT(*) FILTER (WHERE status = 'ready')::int      AS status_ready,
           COUNT(*) FILTER (WHERE status = 'delivered')::int  AS status_delivered,
           COUNT(*) FILTER (WHERE status = 'cancelled')::int  AS status_cancelled
         FROM orders
         WHERE seller_id = $1`,
        [sellerId]
      ),

      query(
        `SELECT
           DATE_TRUNC('day', created_at)::date AS day,
           COUNT(*) FILTER (WHERE status NOT IN ('cancelled'))::int AS orders,
           COALESCE(SUM(total_amount) FILTER (WHERE status = 'delivered'), 0) AS revenue
         FROM orders
         WHERE seller_id = $1
           AND created_at >= NOW() - INTERVAL '7 days'
         GROUP BY DATE_TRUNC('day', created_at)
         ORDER BY day ASC`,
        [sellerId]
      ),

      query(
        `SELECT
           mi.id,
           mi.name,
           mi.image_url,
           COUNT(oi.id)::int AS order_count,
           COALESCE(SUM(oi.subtotal) FILTER (WHERE o.status = 'delivered'), 0) AS revenue
         FROM order_items oi
         JOIN menu_items mi ON oi.menu_item_id = mi.id
         JOIN orders o      ON oi.order_id = o.id
         WHERE o.seller_id = $1 AND o.status NOT IN ('cancelled')
         GROUP BY mi.id, mi.name, mi.image_url
         ORDER BY order_count DESC, revenue DESC
         LIMIT 5`,
        [sellerId]
      ),
    ]);

    const s = statsResult.rows[0];
    const delivered = s.status_delivered;
    const cancelled = s.status_cancelled;
    const finalized = delivered + cancelled;

    return {
      revenue: {
        today: Number(s.revenue_today),
        this_week: Number(s.revenue_this_week),
        this_month: Number(s.revenue_this_month),
        all_time: Number(s.revenue_all_time),
        pending: Number(s.revenue_pending),
        average_order_value: Number(Number(s.aov_delivered).toFixed(2)),
      },
      orders: {
        today: s.orders_today,
        this_week: s.orders_this_week,
        this_month: s.orders_this_month,
        all_time: s.orders_all_time,
        by_status: {
          pending: s.status_pending,
          accepted: s.status_accepted,
          preparing: s.status_preparing,
          ready: s.status_ready,
          delivered: s.status_delivered,
          cancelled: s.status_cancelled,
        },
        completion_rate: finalized > 0
          ? Number((delivered / finalized).toFixed(4))
          : null,
      },
      trends: {
        daily_last_7_days: dailyResult.rows.map((r) => ({
          date: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10),
          orders: r.orders,
          revenue: Number(r.revenue),
        })),
      },
      top_items: topItemsResult.rows.map((r) => ({
        id: r.id,
        name: r.name,
        image_url: r.image_url,
        order_count: r.order_count,
        revenue: Number(r.revenue),
      })),
    };
  } catch (err) {
    if (err.code === '42P01') {
      // Orders table doesn't exist yet (staged build). Return zeroed shape.
      return EMPTY_ANALYTICS;
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
  EMPTY_ANALYTICS,
};
