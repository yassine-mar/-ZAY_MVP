'use strict';

const { query } = require('./base.model');

/** @returns {Promise<object>} created order row with items */
const create = async ({ customerId, sellerId, totalAmount, paymentMethod, deliveryAddress, customerNotes }, client) => {
  // TODO: INSERT INTO orders (...) VALUES (...) RETURNING *
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} created order_item row */
const createItem = async ({ orderId, menuItemId, name, price, quantity }, client) => {
  // TODO: INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity, subtotal) VALUES (...) RETURNING *
  throw new Error('Not implemented');
};

/** @returns {Promise<object|null>} order with items and seller info */
const findById = async (id) => {
  // TODO: SELECT orders.*, json_agg(order_items.*) as items, seller row FROM orders JOIN ...
  throw new Error('Not implemented');
};

/** @returns {Promise<{ items: object[], total: number }>} */
const findByCustomer = async ({ customerId, status, fromDate, toDate, page, limit }) => {
  // TODO: paginated SELECT with customer_id = $1 filter
  throw new Error('Not implemented');
};

/** @returns {Promise<{ items: object[], total: number }>} */
const findBySeller = async ({ sellerId, status, fromDate, toDate, page, limit }) => {
  // TODO: paginated SELECT with seller join and filters
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} updated order row */
const updateStatus = async (id, { status, estimatedReadyAt, note }, client) => {
  // TODO: UPDATE orders SET status = $2, updated_at = NOW(), (conditional lifecycle timestamps) WHERE id = $1
  // NOTE: order_status_history is populated by DB trigger automatically
  throw new Error('Not implemented');
};

/** @returns {Promise<object[]>} orders pending > 30 minutes for auto-cancel cron */
const findPendingExpired = async () => {
  // TODO: SELECT * FROM orders WHERE status = 'pending' AND created_at < NOW() - INTERVAL '30 minutes'
  throw new Error('Not implemented');
};

/** @returns {Promise<object[]>} full status history for one order */
const getStatusHistory = async (orderId) => {
  // TODO: SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY changed_at ASC
  throw new Error('Not implemented');
};

module.exports = { create, createItem, findById, findByCustomer, findBySeller, updateStatus, findPendingExpired, getStatusHistory };
