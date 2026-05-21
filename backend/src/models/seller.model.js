'use strict';

const { query } = require('./base.model');

const COLUMNS = `
  id, user_id, business_name, bio, address, city,
  delivery_radius_km, status, is_open,
  avatar_url, avatar_public_id, banner_url, banner_public_id,
  specialties,
  approved_at, approved_by,
  rejected_at, rejected_by, rejection_reason,
  suspended_at, suspended_by, suspension_reason,
  created_at, updated_at
`;

const findById = async (id) => {
  const result = await query(
    `SELECT sp.${COLUMNS.split(',').map((c) => c.trim()).join(', sp.')},
            u.name AS user_name, u.email AS user_email, u.phone AS user_phone
     FROM seller_profiles sp
     JOIN users u ON sp.user_id = u.id
     WHERE sp.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const findByUserId = async (userId, client = null) => {
  const sql = `SELECT ${COLUMNS} FROM seller_profiles WHERE user_id = $1`;
  const runner = client || { query };
  const result = await runner.query(sql, [userId]);
  return result.rows[0] || null;
};

const create = async (
  { userId, businessName, bio, address, city, deliveryRadiusKm },
  client = null
) => {
  const sql = `
    INSERT INTO seller_profiles
      (id, user_id, business_name, bio, address, city, delivery_radius_km, status, is_open)
    VALUES
      (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, 'pending', FALSE)
    RETURNING ${COLUMNS}
  `;
  const params = [userId, businessName, bio || null, address, city, deliveryRadiusKm || 5];
  const result = client ? await client.query(sql, params) : await query(sql, params);
  return result.rows[0];
};

/**
 * Fields the SELLER can update on themselves.
 * `status`, `is_open`, `approved_*`, `rejected_*`, `suspended_*` are administered
 * via dedicated endpoints — never via the generic update path.
 */
const SELLER_UPDATABLE = new Set([
  'business_name', 'bio', 'address', 'city', 'delivery_radius_km',
  'avatar_url', 'avatar_public_id', 'banner_url', 'banner_public_id',
  'specialties', 'is_open',
]);

const update = async (id, fields) => {
  const keys = Object.keys(fields).filter((k) => SELLER_UPDATABLE.has(k));
  if (keys.length === 0) return findByUserIdOrId(id);

  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = keys.map((k) => fields[k]);

  const result = await query(
    `UPDATE seller_profiles
     SET ${setClauses}
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    [id, ...values]
  );
  return result.rows[0] || null;
};

// Internal: utility for update() fallback when no fields changed
const findByUserIdOrId = async (id) => {
  const result = await query(`SELECT ${COLUMNS} FROM seller_profiles WHERE id = $1`, [id]);
  return result.rows[0] || null;
};

/* ── Admin-only mutations ──────────────────────────────────────────────── */

const approve = async (id, { approvedBy }) => {
  const result = await query(
    `UPDATE seller_profiles
     SET status = 'approved',
         approved_at = NOW(),
         approved_by = $2,
         rejection_reason = NULL,
         rejected_at = NULL,
         rejected_by = NULL
     WHERE id = $1 AND status = 'pending'
     RETURNING ${COLUMNS}`,
    [id, approvedBy]
  );
  return result.rows[0] || null;
};

const reject = async (id, { reason, rejectedBy }) => {
  const result = await query(
    `UPDATE seller_profiles
     SET status = 'rejected',
         rejected_at = NOW(),
         rejected_by = $2,
         rejection_reason = $3,
         is_open = FALSE
     WHERE id = $1 AND status = 'pending'
     RETURNING ${COLUMNS}`,
    [id, rejectedBy, reason]
  );
  return result.rows[0] || null;
};

const suspend = async (id, { reason, suspendedBy }) => {
  const result = await query(
    `UPDATE seller_profiles
     SET status = 'suspended',
         suspended_at = NOW(),
         suspended_by = $2,
         suspension_reason = $3,
         is_open = FALSE
     WHERE id = $1 AND status = 'approved'
     RETURNING ${COLUMNS}`,
    [id, suspendedBy, reason]
  );
  return result.rows[0] || null;
};

/* ── Admin queries ─────────────────────────────────────────────────────── */

const buildAdminFilter = ({ status, city }) => {
  const conditions = [];
  const params = [];
  if (status) { params.push(status); conditions.push(`sp.status = $${params.length}`); }
  if (city) { params.push(city); conditions.push(`sp.city = $${params.length}`); }
  return { conditions, params };
};

const findAll = async ({ status, city, limit, offset }) => {
  const { conditions, params } = buildAdminFilter({ status, city });
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const result = await query(
    `SELECT sp.${COLUMNS.split(',').map((c) => c.trim()).join(', sp.')},
            u.name AS user_name, u.email AS user_email, u.phone AS user_phone
     FROM seller_profiles sp
     JOIN users u ON sp.user_id = u.id
     ${where}
     ORDER BY sp.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );
  return result.rows;
};

const countAll = async ({ status, city }) => {
  const { conditions, params } = buildAdminFilter({ status, city });
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(
    `SELECT COUNT(*)::int AS total FROM seller_profiles sp ${where}`,
    params
  );
  return result.rows[0].total;
};

const findOpenInCity = async ({ city, limit, offset }) => {
  const conditions = ["sp.status = 'approved'", 'sp.is_open = TRUE'];
  const params = [];
  if (city) {
    params.push(city);
    conditions.push(`sp.city = $${params.length}`);
  }
  params.push(limit, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const result = await query(
    `SELECT sp.${COLUMNS.split(',').map((c) => c.trim()).join(', sp.')}
     FROM seller_profiles sp
     WHERE ${conditions.join(' AND ')}
     ORDER BY sp.created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );
  return result.rows;
};

const countOpenInCity = async ({ city }) => {
  const conditions = ["status = 'approved'", 'is_open = TRUE'];
  const params = [];
  if (city) {
    params.push(city);
    conditions.push(`city = $${params.length}`);
  }
  const result = await query(
    `SELECT COUNT(*)::int AS total FROM seller_profiles WHERE ${conditions.join(' AND ')}`,
    params
  );
  return result.rows[0].total;
};

/* ── Cascade helper from user.service.deleteMe ─────────────────────────── */

const markSuspendedByUserId = async (userId, reason, client = null) => {
  const sql = `
    UPDATE seller_profiles
    SET status = 'suspended',
        suspended_at = NOW(),
        suspension_reason = $1,
        is_open = FALSE
    WHERE user_id = $2 AND status <> 'suspended'
    RETURNING id
  `;
  const result = client
    ? await client.query(sql, [reason, userId])
    : await query(sql, [reason, userId]);
  return result.rows[0] || null;
};

module.exports = {
  findById,
  findByUserId,
  create,
  update,
  approve,
  reject,
  suspend,
  findAll,
  countAll,
  findOpenInCity,
  countOpenInCity,
  markSuspendedByUserId,
};
