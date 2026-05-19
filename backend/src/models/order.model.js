'use strict';

const { query } = require('./base.model');

/**
 * Count of orders for a customer that are NOT in a terminal state.
 * Used by UserService.deleteMe to block deletion when active orders exist.
 *
 * Defensive against the orders table not yet existing (relation code 42P01) —
 * this allows the user feature to function before the orders feature ships.
 * Once the orders migration is applied, the defensive branch is never hit.
 */
const countActiveByCustomer = async (customerId) => {
  try {
    const result = await query(
      `SELECT COUNT(*)::int AS count
       FROM orders
       WHERE customer_id = $1
         AND status NOT IN ('delivered', 'cancelled')`,
      [customerId]
    );
    return result.rows[0].count;
  } catch (err) {
    if (err.code === '42P01') return 0; // orders table not yet migrated
    throw err;
  }
};

// ── Order feature functions — implemented in the orders feature step ──────

const create = async (_input, _client) => {
  throw new Error('Not implemented');
};
const createItem = async (_input, _client) => {
  throw new Error('Not implemented');
};
const findById = async (_id) => {
  throw new Error('Not implemented');
};
const findByCustomer = async (_filters) => {
  throw new Error('Not implemented');
};
const findBySeller = async (_filters) => {
  throw new Error('Not implemented');
};
const updateStatus = async (_id, _patch, _client) => {
  throw new Error('Not implemented');
};
const findPendingExpired = async () => {
  throw new Error('Not implemented');
};
const getStatusHistory = async (_orderId) => {
  throw new Error('Not implemented');
};

module.exports = {
  countActiveByCustomer,
  create,
  createItem,
  findById,
  findByCustomer,
  findBySeller,
  updateStatus,
  findPendingExpired,
  getStatusHistory,
};
