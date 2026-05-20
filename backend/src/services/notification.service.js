'use strict';

const NotificationModel = require('../models/notification.model');
const UserModel = require('../models/user.model');
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

module.exports = {
  sendNotification,
  notifyOrderPlaced,
  notifyOrderStatusChanged,
  notifyOrderAutoCancelled,
  notifySellerApproved,
  notifySellerRejected,
  notifySellerSuspended,
};
