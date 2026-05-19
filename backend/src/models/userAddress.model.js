'use strict';

const { query, withTransaction } = require('./base.model');

const COLUMNS = `
  id, user_id, label, street, district, city,
  landmark, notes, is_default, created_at, updated_at
`;

const findByUserId = async (userId) => {
  const result = await query(
    `SELECT ${COLUMNS}
     FROM user_addresses
     WHERE user_id = $1
     ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );
  return result.rows;
};

const findById = async (id) => {
  const result = await query(
    `SELECT ${COLUMNS} FROM user_addresses WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const create = async (
  { userId, label, street, district, city, landmark, notes, isDefault },
  client = null
) => {
  const sql = `
    INSERT INTO user_addresses
      (id, user_id, label, street, district, city, landmark, notes, is_default)
    VALUES
      (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING ${COLUMNS}
  `;
  const params = [
    userId,
    label,
    street,
    district || null,
    city,
    landmark || null,
    notes || null,
    Boolean(isDefault),
  ];
  const result = client ? await client.query(sql, params) : await query(sql, params);
  return result.rows[0];
};

const update = async (id, fields, client = null) => {
  const allowed = ['label', 'street', 'district', 'city', 'landmark', 'notes'];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (keys.length === 0) return findById(id);

  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = keys.map((k) => fields[k]);

  const sql = `
    UPDATE user_addresses
    SET ${setClauses}
    WHERE id = $1
    RETURNING ${COLUMNS}
  `;
  const result = client
    ? await client.query(sql, [id, ...values])
    : await query(sql, [id, ...values]);
  return result.rows[0] || null;
};

const remove = async (id) => {
  const result = await query(
    'DELETE FROM user_addresses WHERE id = $1',
    [id]
  );
  return result.rowCount > 0;
};

/**
 * Atomically set one address as the default for a user.
 * Clears is_default on all others first to satisfy the partial unique index.
 */
const setDefault = async (id, userId) =>
  withTransaction(async (client) => {
    await client.query(
      `UPDATE user_addresses
       SET is_default = FALSE
       WHERE user_id = $1 AND is_default = TRUE`,
      [userId]
    );
    const result = await client.query(
      `UPDATE user_addresses
       SET is_default = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING ${COLUMNS}`,
      [id, userId]
    );
    return result.rows[0] || null;
  });

const countByUserId = async (userId) => {
  const result = await query(
    'SELECT COUNT(*)::int AS count FROM user_addresses WHERE user_id = $1',
    [userId]
  );
  return result.rows[0].count;
};

module.exports = {
  findByUserId,
  findById,
  create,
  update,
  remove,
  setDefault,
  countByUserId,
};
