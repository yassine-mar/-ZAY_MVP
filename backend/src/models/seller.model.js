'use strict';

const { query } = require('./base.model');

const COLUMNS = `
  id, user_id, business_name, bio, address, city,
  delivery_radius_km, status, is_open,
  approved_at, suspended_at, rejection_reason, suspension_reason,
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
 * Suspend the seller profile owned by `userId` (if any).
 * Called by UserService.deleteMe to prevent a deleted user's seller profile
 * from remaining listed as approved.
 * Idempotent — already-suspended profiles are not touched.
 */
const markSuspendedByUserId = async (userId, reason, client = null) => {
  const sql = `
    UPDATE seller_profiles
    SET status = 'suspended',
        suspended_at = NOW(),
        suspension_reason = $1
    WHERE user_id = $2 AND status <> 'suspended'
    RETURNING id
  `;
  const result = client
    ? await client.query(sql, [reason, userId])
    : await query(sql, [reason, userId]);
  return result.rows[0] || null;
};

// ── Seller management functions (used by admin/seller features, not auth) ─

const update = async (_id, _fields) => {
  throw new Error('Not implemented');
};
const approve = async (_id) => {
  throw new Error('Not implemented');
};
const reject = async (_id, _reason) => {
  throw new Error('Not implemented');
};
const suspend = async (_id, _reason) => {
  throw new Error('Not implemented');
};
const findAll = async (_filters) => {
  throw new Error('Not implemented');
};
const findOpenInCity = async (_filters) => {
  throw new Error('Not implemented');
};

module.exports = {
  findById,
  findByUserId,
  create,
  markSuspendedByUserId,
  update,
  approve,
  reject,
  suspend,
  findAll,
  findOpenInCity,
};
