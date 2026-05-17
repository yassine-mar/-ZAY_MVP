'use strict';

/**
 * Platform-wide analytics for the admin dashboard.
 * All queries run on PostgreSQL directly — no external analytics service in MVP.
 */

/** @returns {Promise<object>} platform KPI overview */
const getOverview = async () => {
  // TODO: Aggregate queries for:
  // - users: total, by role, by status
  // - orders: total, today, this_week, this_month, auto_cancelled, completion_rate
  // - revenue: GMV this month, avg order value
  // - top_categories: top 5 by order count
  throw new Error('Not implemented');
};

/** @returns {Promise<object[]>} daily order counts for the last N days */
const getOrderTrends = async (days = 30) => {
  // TODO: SELECT DATE(created_at), COUNT(*), SUM(total_amount) FROM orders GROUP BY DATE(created_at) ORDER BY date DESC LIMIT $1
  throw new Error('Not implemented');
};

/** @returns {Promise<object[]>} top sellers by order count and revenue */
const getTopSellers = async (limit = 10) => {
  // TODO: JOIN seller_profiles with orders COUNT + SUM
  throw new Error('Not implemented');
};

module.exports = { getOverview, getOrderTrends, getTopSellers };
