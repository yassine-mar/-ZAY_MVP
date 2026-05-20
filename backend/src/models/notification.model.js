'use strict';

const { query } = require('./base.model');

const COLUMNS = `
  id, user_id, type, title, body, order_id, data,
  is_read, fcm_sent, fcm_error, read_at, created_at
`;

const create = async ({ userId, type, title, body, orderId, data }) => {
  const result = await query(
    `INSERT INTO notifications
       (id, user_id, type, title, body, order_id, data)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6::jsonb)
     RETURNING ${COLUMNS}`,
    [userId, type, title, body, orderId ?? null, data ? JSON.stringify(data) : null]
  );
  return result.rows[0];
};

const markFcmSent = async (id) => {
  await query('UPDATE notifications SET fcm_sent = TRUE WHERE id = $1', [id]);
};

const markFcmError = async (id, errorMessage) => {
  await query(
    'UPDATE notifications SET fcm_error = $2 WHERE id = $1',
    [id, String(errorMessage).slice(0, 1000)]
  );
};

const findByUser = async ({ userId, limit, offset }) => {
  const result = await query(
    `SELECT ${COLUMNS}
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
};

const countByUser = async (userId) => {
  const result = await query(
    'SELECT COUNT(*)::int AS total FROM notifications WHERE user_id = $1',
    [userId]
  );
  return result.rows[0].total;
};

const countUnread = async (userId) => {
  const result = await query(
    'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return result.rows[0].count;
};

const markRead = async (id, userId) => {
  const result = await query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE id = $1 AND user_id = $2 AND is_read = FALSE`,
    [id, userId]
  );
  return result.rowCount > 0;
};

const markAllRead = async (userId) => {
  const result = await query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return result.rowCount;
};

module.exports = {
  create,
  markFcmSent,
  markFcmError,
  findByUser,
  countByUser,
  countUnread,
  markRead,
  markAllRead,
};
