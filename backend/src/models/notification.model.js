'use strict';

const { query } = require('./base.model');

/** @returns {Promise<object>} created notification row */
const create = async ({ userId, type, title, body, orderId, data }) => {
  // TODO: INSERT INTO notifications (id, user_id, type, title, body, order_id, data) VALUES (...) RETURNING *
  throw new Error('Not implemented');
};

/** @returns {Promise<void>} */
const markFcmSent = async (id) => {
  // TODO: UPDATE notifications SET fcm_sent = TRUE WHERE id = $1
  throw new Error('Not implemented');
};

/** @returns {Promise<void>} */
const markFcmError = async (id, errorMessage) => {
  // TODO: UPDATE notifications SET fcm_error = $2 WHERE id = $1
  throw new Error('Not implemented');
};

/** @returns {Promise<{ items: object[], total: number }>} */
const findByUser = async ({ userId, page, limit }) => {
  // TODO: paginated SELECT WHERE user_id = $1 ORDER BY created_at DESC
  throw new Error('Not implemented');
};

/** @returns {Promise<number>} */
const countUnread = async (userId) => {
  // TODO: SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE
  throw new Error('Not implemented');
};

/** @returns {Promise<void>} */
const markRead = async (id, userId) => {
  // TODO: UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2
  throw new Error('Not implemented');
};

/** @returns {Promise<number>} count of rows updated */
const markAllRead = async (userId) => {
  // TODO: UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE RETURNING COUNT(*)
  throw new Error('Not implemented');
};

module.exports = { create, markFcmSent, markFcmError, findByUser, countUnread, markRead, markAllRead };
