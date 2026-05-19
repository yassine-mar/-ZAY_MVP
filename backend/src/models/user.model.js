'use strict';

const { query } = require('./base.model');

/**
 * Columns safe to return to the application layer.
 * `password_hash` is intentionally excluded — only `findByEmailWithPassword`
 * returns it, and only for the login flow.
 */
const SAFE_COLUMNS = `
  id, name, email, phone, role, status,
  avatar_url, avatar_public_id, fcm_token,
  created_at, updated_at
`;

const findById = async (id, client = null) => {
  const runner = client || { query };
  const result = await runner.query(
    `SELECT ${SAFE_COLUMNS}
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
};

const findByEmailWithPassword = async (email) => {
  const result = await query(
    `SELECT ${SAFE_COLUMNS}, password_hash
     FROM users
     WHERE email = $1 AND deleted_at IS NULL`,
    [email]
  );
  return result.rows[0] || null;
};

const existsByEmail = async (email) => {
  const result = await query(
    'SELECT 1 FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1',
    [email]
  );
  return result.rowCount > 0;
};

const create = async ({ name, email, phone, passwordHash, role }, client = null) => {
  const sql = `
    INSERT INTO users (id, name, email, phone, password_hash, role, status)
    VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, 'active')
    RETURNING ${SAFE_COLUMNS}
  `;
  const params = [name, email, phone, passwordHash, role];
  const result = client ? await client.query(sql, params) : await query(sql, params);
  return result.rows[0];
};

const update = async (id, fields) => {
  const keys = Object.keys(fields);
  if (keys.length === 0) return findById(id);

  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = keys.map((k) => fields[k]);

  const result = await query(
    `UPDATE users
     SET ${setClauses}
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING ${SAFE_COLUMNS}`,
    [id, ...values]
  );
  return result.rows[0] || null;
};

const updateFcmToken = async (id, fcmToken) => {
  await query('UPDATE users SET fcm_token = $1 WHERE id = $2', [fcmToken, id]);
};

const clearFcmToken = async (id) => {
  await query('UPDATE users SET fcm_token = NULL WHERE id = $1', [id]);
};

const softDelete = async (id) => {
  await query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [id]);
};

const getFcmToken = async (id) => {
  const result = await query(
    'SELECT fcm_token FROM users WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return result.rows[0]?.fcm_token || null;
};

module.exports = {
  findById,
  findByEmailWithPassword,
  existsByEmail,
  create,
  update,
  updateFcmToken,
  clearFcmToken,
  softDelete,
  getFcmToken,
};
