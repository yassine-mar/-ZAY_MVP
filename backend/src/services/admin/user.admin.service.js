'use strict';

const UserModel = require('../../models/user.model');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const { query } = require('../../models/base.model');
const { parsePaginationParams, buildPaginationMeta } = require('../../utils/pagination');

const listAll = async (queryParams = {}) => {
  const { page, limit, offset } = parsePaginationParams(queryParams);
  const filters = {
    role: queryParams.role,
    status: queryParams.status,
    search: queryParams.search,
    limit,
    offset,
  };

  const [items, total] = await Promise.all([
    UserModel.findAllForAdmin(filters),
    UserModel.countAllForAdmin(filters),
  ]);

  return { items, pagination: buildPaginationMeta(page, limit, total) };
};

const fetchOrderSummary = async (userId) => {
  try {
    const result = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status NOT IN ('cancelled'))::int AS total_orders,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int       AS cancelled_orders,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'delivered'), 0) AS total_spent
       FROM orders
       WHERE customer_id = $1`,
      [userId]
    );
    return {
      total_orders: result.rows[0].total_orders,
      cancelled_orders: result.rows[0].cancelled_orders,
      total_spent: Number(result.rows[0].total_spent),
    };
  } catch (err) {
    // Orders table not yet present (staged build) → zero summary.
    if (err.code === '42P01') {
      return { total_orders: 0, cancelled_orders: 0, total_spent: 0 };
    }
    throw err;
  }
};

const getUserDetail = async (userId) => {
  const user = await UserModel.findByIdForAdmin(userId);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

  const order_summary = await fetchOrderSummary(userId);
  return { ...user, order_summary };
};

/**
 * Suspend a user account.
 *   - Cannot suspend yourself (footgun protection)
 *   - Cannot re-suspend an already-suspended user
 *   - Active customers + sellers + admins all suspendable
 */
const suspendUser = async (userId, adminUserId, reason) => {
  if (userId === adminUserId) {
    throw new AppError(400, 'CANNOT_SUSPEND_SELF', 'You cannot suspend your own account');
  }

  const existing = await UserModel.findByIdForAdmin(userId);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'User not found');
  if (existing.status !== 'active') {
    throw new AppError(
      422,
      'INVALID_STATUS',
      `Cannot suspend a ${existing.status} user`
    );
  }

  const suspended = await UserModel.adminSuspend(userId, { reason, suspendedBy: adminUserId });
  if (!suspended) throw new AppError(404, 'NOT_FOUND', 'User not found');

  logger.info('User suspended by admin', {
    userId, by: adminUserId, reason,
  });

  return suspended;
};

module.exports = { listAll, getUserDetail, suspendUser };
