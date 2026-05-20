'use strict';

const { query } = require('./base.model');

const ORDER_COLUMNS = `
  id, customer_id, seller_id, status, total_amount, payment_method,
  delivery_address, customer_notes,
  accepted_at, estimated_ready_at, delivered_at, cancelled_at,
  cancellation_reason, auto_cancelled, idempotency_key,
  created_at, updated_at
`;

/* ── Reads ─────────────────────────────────────────────────────────────── */

/**
 * Count of orders for a customer that are NOT in a terminal state.
 * Used by UserService.deleteMe to block deletion when active orders exist.
 * Defensive against the orders table not yet existing — kept from the
 * previous step for cross-feature build order.
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
    if (err.code === '42P01') return 0;
    throw err;
  }
};

const findById = async (id) => {
  const result = await query(
    `SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Full order — joins items + seller summary in a single round-trip.
 * Used by every order-detail endpoint (customer, seller, admin).
 *
 * Returns `null` if the order doesn't exist.
 */
const findByIdWithItems = async (id) => {
  const result = await query(
    `SELECT
       o.id, o.customer_id, o.seller_id, o.status, o.total_amount,
       o.payment_method, o.delivery_address, o.customer_notes,
       o.accepted_at, o.estimated_ready_at, o.delivered_at,
       o.cancelled_at, o.cancellation_reason, o.auto_cancelled,
       o.idempotency_key, o.created_at, o.updated_at,
       -- Seller summary (phone exposed via serializer based on status)
       json_build_object(
         'id', sp.id,
         'business_name', sp.business_name,
         'avatar_url', sp.avatar_url,
         'city', sp.city,
         'phone', u.phone
       ) AS seller,
       -- Customer summary (used by seller-facing views)
       json_build_object(
         'id', cu.id,
         'name', cu.name,
         'phone', cu.phone
       ) AS customer,
       -- Items (ordered by created_at)
       COALESCE(
         json_agg(
           json_build_object(
             'id', oi.id,
             'menu_item_id', oi.menu_item_id,
             'name', oi.name,
             'price', oi.price,
             'quantity', oi.quantity,
             'subtotal', oi.subtotal,
             'image_url', oi.image_url
           )
           ORDER BY oi.created_at ASC
         ) FILTER (WHERE oi.id IS NOT NULL),
         '[]'::json
       ) AS items
     FROM orders o
     JOIN seller_profiles sp ON o.seller_id = sp.id
     JOIN users u             ON sp.user_id = u.id
     JOIN users cu            ON o.customer_id = cu.id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.id = $1
     GROUP BY o.id, sp.id, u.id, cu.id`,
    [id]
  );
  return result.rows[0] || null;
};

const findByIdempotencyKey = async (customerId, key) => {
  if (!key) return null;
  const result = await query(
    `SELECT ${ORDER_COLUMNS} FROM orders
     WHERE customer_id = $1 AND idempotency_key = $2`,
    [customerId, key]
  );
  return result.rows[0] || null;
};

/**
 * Paginated order list for a customer, newest first.
 * Optional status filter (single value) and date range.
 */
const findByCustomer = async ({ customerId, status, fromDate, toDate, limit, offset }) => {
  const conditions = ['o.customer_id = $1'];
  const params = [customerId];

  if (status) {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }
  if (fromDate) {
    params.push(fromDate);
    conditions.push(`o.created_at >= $${params.length}`);
  }
  if (toDate) {
    params.push(toDate);
    conditions.push(`o.created_at <= $${params.length}`);
  }

  params.push(limit, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const result = await query(
    `SELECT
       o.${ORDER_COLUMNS.split(',').map((c) => c.trim()).join(', o.')},
       sp.business_name AS seller_business_name,
       sp.avatar_url    AS seller_avatar_url
     FROM orders o
     JOIN seller_profiles sp ON o.seller_id = sp.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY o.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  return result.rows;
};

const countByCustomer = async ({ customerId, status, fromDate, toDate }) => {
  const conditions = ['customer_id = $1'];
  const params = [customerId];
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (fromDate) { params.push(fromDate); conditions.push(`created_at >= $${params.length}`); }
  if (toDate) { params.push(toDate); conditions.push(`created_at <= $${params.length}`); }

  const result = await query(
    `SELECT COUNT(*)::int AS total FROM orders WHERE ${conditions.join(' AND ')}`,
    params
  );
  return result.rows[0].total;
};

const findBySeller = async ({ sellerId, status, fromDate, toDate, limit, offset }) => {
  const conditions = ['o.seller_id = $1'];
  const params = [sellerId];

  if (status) { params.push(status); conditions.push(`o.status = $${params.length}`); }
  if (fromDate) { params.push(fromDate); conditions.push(`o.created_at >= $${params.length}`); }
  if (toDate) { params.push(toDate); conditions.push(`o.created_at <= $${params.length}`); }

  params.push(limit, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const result = await query(
    `SELECT
       o.${ORDER_COLUMNS.split(',').map((c) => c.trim()).join(', o.')},
       cu.name  AS customer_name,
       cu.phone AS customer_phone
     FROM orders o
     JOIN users cu ON o.customer_id = cu.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY o.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  return result.rows;
};

const countBySeller = async ({ sellerId, status, fromDate, toDate }) => {
  const conditions = ['seller_id = $1'];
  const params = [sellerId];
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  if (fromDate) { params.push(fromDate); conditions.push(`created_at >= $${params.length}`); }
  if (toDate) { params.push(toDate); conditions.push(`created_at <= $${params.length}`); }

  const result = await query(
    `SELECT COUNT(*)::int AS total FROM orders WHERE ${conditions.join(' AND ')}`,
    params
  );
  return result.rows[0].total;
};

/**
 * Pending orders older than 30 minutes — input to auto-cancel cron.
 */
const findPendingExpired = async () => {
  const result = await query(
    `SELECT id, customer_id, seller_id, total_amount, created_at
     FROM orders
     WHERE status = 'pending'
       AND created_at < NOW() - INTERVAL '30 minutes'
     ORDER BY created_at ASC
     LIMIT 100`
  );
  return result.rows;
};

const getStatusHistory = async (orderId) => {
  const result = await query(
    `SELECT id, order_id, from_status, to_status, changed_by, note, changed_at
     FROM order_status_history
     WHERE order_id = $1
     ORDER BY changed_at ASC`,
    [orderId]
  );
  return result.rows;
};

/* ── Writes ────────────────────────────────────────────────────────────── */

const create = async (
  { customerId, sellerId, totalAmount, paymentMethod, deliveryAddress,
    customerNotes, idempotencyKey },
  client = null
) => {
  const sql = `
    INSERT INTO orders
      (id, customer_id, seller_id, status, total_amount, payment_method,
       delivery_address, customer_notes, idempotency_key)
    VALUES
      (uuid_generate_v4(), $1, $2, 'pending', $3, $4, $5::jsonb, $6, $7)
    RETURNING ${ORDER_COLUMNS}
  `;
  const params = [
    customerId, sellerId, totalAmount, paymentMethod,
    JSON.stringify(deliveryAddress), customerNotes ?? null, idempotencyKey ?? null,
  ];
  const result = client ? await client.query(sql, params) : await query(sql, params);
  return result.rows[0];
};

const createItem = async (
  { orderId, menuItemId, name, price, quantity, subtotal, imageUrl },
  client = null
) => {
  const sql = `
    INSERT INTO order_items
      (id, order_id, menu_item_id, name, price, quantity, subtotal, image_url)
    VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7)
    RETURNING id, order_id, menu_item_id, name, price, quantity, subtotal, image_url
  `;
  const params = [orderId, menuItemId, name, price, quantity, subtotal, imageUrl ?? null];
  const result = client ? await client.query(sql, params) : await query(sql, params);
  return result.rows[0];
};

const insertStatusHistory = async (
  { orderId, fromStatus, toStatus, changedBy, note },
  client = null
) => {
  const sql = `
    INSERT INTO order_status_history
      (id, order_id, from_status, to_status, changed_by, note)
    VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)
    RETURNING id
  `;
  const params = [orderId, fromStatus ?? null, toStatus, changedBy ?? null, note ?? null];
  const result = client ? await client.query(sql, params) : await query(sql, params);
  return result.rows[0];
};

/**
 * Status update. The lifecycle-timestamps trigger (migration 015) auto-sets
 * accepted_at / delivered_at / cancelled_at when status changes — we only set
 * estimated_ready_at + cancellation_reason + auto_cancelled here.
 *
 * Returns the updated order row, or null if not found / no transition occurred.
 */
const updateStatus = async (
  id,
  { status, estimatedReadyAt, autoCancelled, cancellationReason },
  client = null
) => {
  const sets = ['status = $2'];
  const params = [id, status];

  if (estimatedReadyAt !== undefined) {
    params.push(estimatedReadyAt);
    sets.push(`estimated_ready_at = $${params.length}`);
  }
  if (autoCancelled !== undefined) {
    params.push(autoCancelled);
    sets.push(`auto_cancelled = $${params.length}`);
  }
  if (cancellationReason !== undefined) {
    params.push(cancellationReason);
    sets.push(`cancellation_reason = $${params.length}`);
  }

  const sql = `
    UPDATE orders
    SET ${sets.join(', ')}
    WHERE id = $1
    RETURNING ${ORDER_COLUMNS}
  `;
  const result = client ? await client.query(sql, params) : await query(sql, params);
  return result.rows[0] || null;
};

module.exports = {
  countActiveByCustomer,
  findById,
  findByIdWithItems,
  findByIdempotencyKey,
  findByCustomer,
  countByCustomer,
  findBySeller,
  countBySeller,
  findPendingExpired,
  getStatusHistory,
  create,
  createItem,
  insertStatusHistory,
  updateStatus,
};
