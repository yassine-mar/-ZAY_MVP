'use strict';

const { query, withTransaction } = require('./base.model');

/**
 * Insert a new refresh token row. Returns the inserted row's id + metadata.
 */
const create = async ({ userId, tokenHash, expiresAt, userAgent, ip }, client = null) => {
  const sql = `
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, user_agent, ip)
    VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)
    RETURNING id, user_id, expires_at, created_at
  `;
  const params = [userId, tokenHash, expiresAt, userAgent, ip];
  const result = client ? await client.query(sql, params) : await query(sql, params);
  return result.rows[0];
};

/**
 * Look up a token by its SHA-256 hash. Returns the full row including
 * timestamps so the caller can detect expired / revoked / used states.
 */
const findByHash = async (tokenHash) => {
  const result = await query(
    `SELECT id, user_id, token_hash, expires_at, created_at,
            used_at, revoked_at, replaced_by, user_agent, ip
     FROM refresh_tokens
     WHERE token_hash = $1`,
    [tokenHash]
  );
  return result.rows[0] || null;
};

/**
 * Atomic rotation: insert a new token row AND mark the old one as used.
 * The old row's replaced_by points to the new row for audit traceability.
 */
const rotate = async ({ oldId, userId, newTokenHash, newExpiresAt, ip, userAgent }) =>
  withTransaction(async (client) => {
    const newResult = await client.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, ip, user_agent)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, newTokenHash, newExpiresAt, ip, userAgent]
    );
    const newId = newResult.rows[0].id;

    await client.query(
      `UPDATE refresh_tokens
       SET used_at = NOW(), replaced_by = $1
       WHERE id = $2 AND used_at IS NULL`,
      [newId, oldId]
    );

    return { newId };
  });

/**
 * Mark a specific token revoked (on logout).
 * Silent no-op if the token is already revoked or doesn't exist.
 */
const revokeByHash = async (tokenHash) => {
  await query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );
};

/**
 * Revoke EVERY active refresh token for a user.
 * Called when reuse / theft is detected — forces all sessions to re-login.
 */
const revokeAllForUser = async (userId) => {
  const result = await query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
  return result.rowCount;
};

/**
 * Periodic cleanup — remove rows whose expires_at is more than 7 days past.
 * Phase 2: schedule via cron alongside auto-cancel.
 */
const deleteExpired = async () => {
  const result = await query(
    `DELETE FROM refresh_tokens
     WHERE expires_at < NOW() - INTERVAL '7 days'`
  );
  return result.rowCount;
};

module.exports = {
  create,
  findByHash,
  rotate,
  revokeByHash,
  revokeAllForUser,
  deleteExpired,
};
