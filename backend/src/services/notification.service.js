'use strict';

const NotificationModel = require('../models/notification.model');
const UserModel = require('../models/user.model');
const { messaging } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * Two-track notification: DB record + FCM push.
 * Both operations run concurrently. FCM failure does NOT throw —
 * it logs the error and marks fcm_error on the DB record.
 */
const sendNotification = async ({ userId, type, title, body, orderId = null, data = null }) => {
  // TODO:
  // 1. NotificationModel.create({ userId, type, title, body, orderId, data })
  // 2. UserModel.getFcmToken(userId)
  // 3. If fcmToken: try sendFCMMessage(fcmToken, { title, body, data })
  //      on success: NotificationModel.markFcmSent(notification.id)
  //      on fail: NotificationModel.markFcmError(notification.id, error.message)
  //               logger.warn('FCM delivery failed', { userId, type, error })
  // NOTE: Use Promise.allSettled for fire-and-forget — never await this in caller
  throw new Error('Not implemented');
};

/** @returns {Promise<void>} sends FCM message to a specific token */
const sendFCMMessage = async (fcmToken, { title, body, data }) => {
  // TODO: messaging.send({ token: fcmToken, notification: { title, body }, data: stringify data })
  throw new Error('Not implemented');
};

// ── Typed notification helpers ─────────────────────────────────────────────

/** Notifies seller when a new order is placed */
const notifyOrderPlaced = async ({ order, sellerUserId }) => {
  // TODO: sendNotification({ userId: sellerUserId, type: 'order_placed', title: 'New Order!', body: `Order #... placed`, orderId: order.id })
  throw new Error('Not implemented');
};

/** Notifies customer when seller accepts their order */
const notifyOrderAccepted = async ({ order, customerId }) => {
  throw new Error('Not implemented');
};

/** Notifies customer or seller of any status change */
const notifyOrderStatusChanged = async ({ order, recipientId, newStatus }) => {
  throw new Error('Not implemented');
};

/** Notifies seller when their account is approved */
const notifySellerApproved = async ({ userId }) => {
  // TODO: sendNotification({ userId, type: 'seller_approved', title: 'Account Approved!', body: '...' })
  throw new Error('Not implemented');
};

/** Notifies seller when their account is rejected */
const notifySellerRejected = async ({ userId, reason }) => {
  throw new Error('Not implemented');
};

/** Notifies customer when their order is auto-cancelled by the cron job */
const notifyOrderAutoCancelled = async ({ order, customerId }) => {
  // TODO: sendNotification({ ..., type: 'order_auto_cancelled', body: 'Order automatically cancelled — seller unavailable' })
  throw new Error('Not implemented');
};

module.exports = {
  sendNotification,
  notifyOrderPlaced,
  notifyOrderAccepted,
  notifyOrderStatusChanged,
  notifySellerApproved,
  notifySellerRejected,
  notifyOrderAutoCancelled,
};
