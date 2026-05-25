'use strict';

const NotificationModel = require('../models/notification.model');
const UserModel = require('../models/user.model');
const { query } = require('../models/base.model');
const logger = require('../utils/logger');

/**
 * Firebase Admin SDK is initialized in config/firebase.js. If the environment
 * lacks valid credentials (dev without Firebase, tests with fake values), the
 * init throws — and we still want notifications to work as DB records.
 * Lazy-load via try/catch so the rest of the service is bulletproof.
 */
let messaging = null;
try {
  // eslint-disable-next-line global-require
  ({ messaging } = require('../config/firebase'));
} catch (err) {
  logger.warn('Firebase not available — FCM disabled', { error: err.message });
}

const ORDER_STATUS_NOTIFY = {
  accepted:  { type: 'order_accepted',  title: 'Order accepted' },
  preparing: { type: 'order_preparing', title: 'Your order is being prepared' },
  ready:     { type: 'order_ready',     title: 'Your order is ready' },
  delivered: { type: 'order_delivered', title: 'Order delivered' },
  cancelled: { type: 'order_cancelled', title: 'Order cancelled' },
};

/**
 * Two-track delivery: write the DB row, then attempt FCM push.
 * The DB row is the source of truth — FCM is best-effort.
 * Never throws — failures are logged and the caller proceeds.
 */
const sendNotification = async ({ userId, type, title, body, orderId = null, data = null }) => {
  try {
    const notification = await NotificationModel.create({
      userId, type, title, body, orderId, data,
    });

    if (!messaging) return notification; // FCM disabled — DB record suffices

    const fcmToken = await UserModel.getFcmToken(userId);
    if (!fcmToken) return notification;

    try {
      await messaging.send({
        token: fcmToken,
        notification: { title, body },
        data: {
          type,
          order_id: orderId ?? '',
          ...(data && Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))),
        },
      });
      await NotificationModel.markFcmSent(notification.id);
    } catch (fcmErr) {
      logger.warn('FCM delivery failed', {
        userId, type, orderId, error: fcmErr.message,
      });
      await NotificationModel.markFcmError(notification.id, fcmErr.message);
    }

    return notification;
  } catch (err) {
    // Notification logging should never break a flow — log and continue.
    logger.error('Notification create failed', {
      userId, type, error: err.message,
    });
    return null;
  }
};

/* ── Typed notification helpers ───────────────────────────────────────── */

const notifyOrderPlaced = ({ order, sellerUserId }) =>
  sendNotification({
    userId: sellerUserId,
    type: 'order_placed',
    title: 'New order',
    body: `You have a new order for ${Number(order.total_amount).toFixed(2)} MAD.`,
    orderId: order.id,
    data: { order_status: 'pending' },
  });

const notifyOrderStatusChanged = ({ order, recipientId, newStatus }) => {
  const tpl = ORDER_STATUS_NOTIFY[newStatus];
  if (!tpl) return Promise.resolve(null);
  return sendNotification({
    userId: recipientId,
    type: tpl.type,
    title: tpl.title,
    body: tpl.body || `Your order is now ${newStatus}.`,
    orderId: order.id,
    data: { order_status: newStatus },
  });
};

const notifyOrderAutoCancelled = ({ order, customerId }) =>
  sendNotification({
    userId: customerId,
    type: 'order_auto_cancelled',
    title: 'Order cancelled',
    body: 'Your order was automatically cancelled — the seller did not respond.',
    orderId: order.id,
    data: { order_status: 'cancelled', auto_cancelled: true },
  });

const notifySellerApproved = ({ userId }) =>
  sendNotification({
    userId,
    type: 'seller_approved',
    title: 'Your seller account is approved',
    body: 'Welcome aboard. You can now open your kitchen and accept orders.',
  });

const notifySellerRejected = ({ userId, reason }) =>
  sendNotification({
    userId,
    type: 'seller_rejected',
    title: 'Application update',
    body: reason || 'Your seller application was not approved.',
  });

const notifySellerSuspended = ({ userId, reason }) =>
  sendNotification({
    userId,
    type: 'seller_suspended',
    title: 'Account suspended',
    body: reason || 'Your seller account has been suspended. Contact support.',
  });

/* ── Admin fan-out ─────────────────────────────────────────────────────── */

/**
 * Return user IDs of every active admin. Cached for 60s in-process to keep
 * notification fan-out cheap. Not Redis-backed (single-host MVP); revisit
 * when we scale to multiple Node instances.
 */
let adminIdCache = { ids: null, expiresAt: 0 };
const ADMIN_CACHE_TTL_MS = 60_000;

const getActiveAdminIds = async () => {
  const now = Date.now();
  if (adminIdCache.ids && adminIdCache.expiresAt > now) return adminIdCache.ids;
  const result = await query(
    `SELECT id FROM users
     WHERE role = 'admin' AND status = 'active' AND deleted_at IS NULL`
  );
  const ids = result.rows.map((r) => r.id);
  adminIdCache = { ids, expiresAt: now + ADMIN_CACHE_TTL_MS };
  return ids;
};

/** Invalidate the admin cache when admin roster changes (suspend/grant). */
const invalidateAdminCache = () => {
  adminIdCache = { ids: null, expiresAt: 0 };
};

const fanOutToAdmins = async (template) => {
  const ids = await getActiveAdminIds();
  // Fire-and-forget per admin; one failure shouldn't block the others.
  await Promise.allSettled(
    ids.map((userId) => sendNotification({ userId, ...template }))
  );
};

const notifyAdminsSellerRegistered = ({ businessName, sellerId }) =>
  fanOutToAdmins({
    type: 'admin_seller_registered',
    title: 'New seller awaiting review',
    body: `${businessName} just applied. Review their application in the dashboard.`,
    data: { seller_id: sellerId },
  });

const notifyAdminsOrderEscalation = ({ orderId, reason }) =>
  fanOutToAdmins({
    type: 'admin_order_escalation',
    title: 'Order needs review',
    body: reason || 'An order requires admin attention.',
    orderId,
  });

module.exports = {
  sendNotification,
  notifyOrderPlaced,
  notifyOrderStatusChanged,
  notifyOrderAutoCancelled,
  notifySellerApproved,
  notifySellerRejected,
  notifySellerSuspended,
  notifyAdminsSellerRegistered,
  notifyAdminsOrderEscalation,
  invalidateAdminCache,
};
