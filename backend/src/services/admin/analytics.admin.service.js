'use strict';

const { query } = require('../../models/base.model');

/**
 * Platform analytics — backs the admin /dashboard screen.
 * All aggregation runs in PostgreSQL (no external analytics service in MVP).
 *
 * Three parallel queries for `getOverview`, defensive against the orders
 * table not existing (staged build pattern).
 */

const EMPTY_ORDER_BLOCK = Object.freeze({
  total: 0,
  today: 0,
  this_week: 0,
  this_month: 0,
  auto_cancelled_today: 0,
  completion_rate: null,
});

const EMPTY_REVENUE_BLOCK = Object.freeze({
  today: 0,
  this_week: 0,
  this_month: 0,
  gmv_all_time: 0,
  avg_order_value: 0,
});

const getOverview = async () => {
  // User stats — single query
  const userPromise = query(
    `SELECT
       COUNT(*) FILTER (WHERE deleted_at IS NULL)::int                       AS total_users,
       COUNT(*) FILTER (WHERE role = 'customer' AND deleted_at IS NULL)::int AS total_customers,
       COUNT(*) FILTER (WHERE role = 'seller'   AND deleted_at IS NULL)::int AS total_sellers,
       COUNT(*) FILTER (WHERE role = 'admin'    AND deleted_at IS NULL)::int AS total_admins,
       COUNT(*) FILTER (WHERE status = 'suspended' AND deleted_at IS NULL)::int AS suspended_users,
       COUNT(*) FILTER (
         WHERE created_at >= DATE_TRUNC('month', NOW()) AND deleted_at IS NULL
       )::int AS new_this_month
     FROM users`
  );

  // Seller status breakdown
  const sellerBreakdownPromise = query(
    `SELECT status, COUNT(*)::int AS count
     FROM seller_profiles
     GROUP BY status`
  );

  // Order + revenue stats (combined) — defensive against missing table
  const orderStatsPromise = query(
    `SELECT
       COUNT(*)::int AS total_orders,
       COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int        AS orders_today,
       COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('week', NOW()))::int  AS orders_this_week,
       COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()))::int AS orders_this_month,
       COUNT(*) FILTER (
         WHERE status = 'cancelled' AND auto_cancelled = TRUE
           AND created_at::date = CURRENT_DATE
       )::int AS auto_cancelled_today,
       COUNT(*) FILTER (WHERE status = 'delivered')::int   AS delivered,
       COUNT(*) FILTER (WHERE status IN ('delivered', 'cancelled'))::int AS finalized,
       COALESCE(SUM(total_amount) FILTER (
         WHERE status = 'delivered' AND created_at::date = CURRENT_DATE
       ), 0) AS revenue_today,
       COALESCE(SUM(total_amount) FILTER (
         WHERE status = 'delivered' AND created_at >= DATE_TRUNC('week', NOW())
       ), 0) AS revenue_this_week,
       COALESCE(SUM(total_amount) FILTER (
         WHERE status = 'delivered' AND created_at >= DATE_TRUNC('month', NOW())
       ), 0) AS revenue_this_month,
       COALESCE(SUM(total_amount) FILTER (WHERE status = 'delivered'), 0) AS gmv_all_time,
       COALESCE(AVG(total_amount) FILTER (WHERE status = 'delivered'), 0) AS aov
     FROM orders`
  ).catch((err) => {
    if (err.code === '42P01') return null;
    throw err;
  });

  // Top categories — only if orders + order_items exist
  const topCategoriesPromise = query(
    `SELECT c.name, c.slug, c.icon, COUNT(oi.id)::int AS order_count
     FROM order_items oi
     JOIN menu_items mi ON oi.menu_item_id = mi.id
     JOIN categories c  ON mi.category_id = c.id
     JOIN orders o      ON oi.order_id = o.id
     WHERE o.status NOT IN ('cancelled')
     GROUP BY c.id, c.name, c.slug, c.icon
     ORDER BY order_count DESC
     LIMIT 5`
  ).catch((err) => {
    if (err.code === '42P01') return null;
    throw err;
  });

  const [userResult, sellerBreakdownResult, orderResult, topCategoriesResult] =
    await Promise.all([userPromise, sellerBreakdownPromise, orderStatsPromise, topCategoriesPromise]);

  const u = userResult.rows[0];

  // Pivot seller status counts into a typed object
  const sellerCounts = {
    pending: 0, approved: 0, rejected: 0, suspended: 0,
  };
  for (const row of sellerBreakdownResult.rows) {
    sellerCounts[row.status] = row.count;
  }

  // Orders + revenue blocks (zeroed when orders table missing)
  let ordersBlock = EMPTY_ORDER_BLOCK;
  let revenueBlock = EMPTY_REVENUE_BLOCK;

  if (orderResult) {
    const o = orderResult.rows[0];
    const finalized = o.finalized;
    ordersBlock = {
      total: o.total_orders,
      today: o.orders_today,
      this_week: o.orders_this_week,
      this_month: o.orders_this_month,
      auto_cancelled_today: o.auto_cancelled_today,
      completion_rate: finalized > 0 ? Number((o.delivered / finalized).toFixed(4)) : null,
    };
    revenueBlock = {
      today: Number(o.revenue_today),
      this_week: Number(o.revenue_this_week),
      this_month: Number(o.revenue_this_month),
      gmv_all_time: Number(o.gmv_all_time),
      avg_order_value: Number(Number(o.aov).toFixed(2)),
    };
  }

  return {
    users: {
      total: u.total_users,
      customers: u.total_customers,
      admins: u.total_admins,
      suspended: u.suspended_users,
      new_this_month: u.new_this_month,
      sellers: {
        total: u.total_sellers,
        ...sellerCounts,
      },
    },
    orders: ordersBlock,
    revenue: revenueBlock,
    top_categories: topCategoriesResult ? topCategoriesResult.rows : [],
  };
};

const getOrderTrends = async (daysInput = 30) => {
  const days = Math.min(Math.max(Math.trunc(Number(daysInput)) || 30, 1), 365);
  try {
    const result = await query(
      `SELECT
         DATE_TRUNC('day', created_at)::date AS day,
         COUNT(*) FILTER (WHERE status NOT IN ('cancelled'))::int AS orders,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int        AS cancelled,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'delivered'), 0) AS revenue
       FROM orders
       WHERE created_at >= NOW() - $1::interval
       GROUP BY DATE_TRUNC('day', created_at)
       ORDER BY day ASC`,
      [`${days} days`]
    );
    return result.rows.map((r) => ({
      date: r.day instanceof Date
        ? r.day.toISOString().slice(0, 10)
        : String(r.day).slice(0, 10),
      orders: r.orders,
      cancelled: r.cancelled,
      revenue: Number(r.revenue),
    }));
  } catch (err) {
    if (err.code === '42P01') return [];
    throw err;
  }
};

const getTopSellers = async (limitInput = 10) => {
  const limit = Math.min(Math.max(Math.trunc(Number(limitInput)) || 10, 1), 50);
  try {
    const result = await query(
      `SELECT
         sp.id,
         sp.business_name,
         sp.city,
         sp.avatar_url,
         COUNT(o.id) FILTER (WHERE o.status NOT IN ('cancelled'))::int AS order_count,
         COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'delivered'), 0) AS revenue,
         COALESCE(AVG(o.total_amount) FILTER (WHERE o.status = 'delivered'), 0) AS avg_order_value
       FROM seller_profiles sp
       LEFT JOIN orders o ON o.seller_id = sp.id
       WHERE sp.status = 'approved'
       GROUP BY sp.id, sp.business_name, sp.city, sp.avatar_url
       ORDER BY order_count DESC, revenue DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map((r) => ({
      id: r.id,
      business_name: r.business_name,
      city: r.city,
      avatar_url: r.avatar_url,
      order_count: r.order_count,
      revenue: Number(r.revenue),
      avg_order_value: Number(Number(r.avg_order_value).toFixed(2)),
    }));
  } catch (err) {
    if (err.code === '42P01') return [];
    throw err;
  }
};

module.exports = {
  getOverview,
  getOrderTrends,
  getTopSellers,
  EMPTY_ORDER_BLOCK,
  EMPTY_REVENUE_BLOCK,
};
