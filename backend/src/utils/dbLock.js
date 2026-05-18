'use strict';

const { db } = require('../config/database');

/**
 * Acquire a PostgreSQL session-level advisory lock keyed by `lockId`.
 *
 * Safe under PM2 cluster mode — only one process can hold a given lockId
 * at a time across all instances connected to the same database.
 *
 * Usage (cron job):
 *
 *   await withDbLock(7001, async () => {
 *     await OrderService.autoCancelExpiredOrders();
 *   });
 *
 * Returns:
 *   { acquired: true, result }   — function ran, here's its return value
 *   { acquired: false }          — another instance is currently running it
 *
 * The lock is released even if the function throws.
 *
 * @param {number} lockId - integer identifier, unique per logical job
 * @param {() => Promise<T>} fn - work to perform under the lock
 * @returns {Promise<{ acquired: boolean, result?: T }>}
 */
const withDbLock = async (lockId, fn) => {
  const client = await db.connect();
  try {
    const lockResult = await client.query(
      'SELECT pg_try_advisory_lock($1) AS locked',
      [lockId]
    );

    if (!lockResult.rows[0].locked) {
      return { acquired: false };
    }

    try {
      const result = await fn(client);
      return { acquired: true, result };
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
    }
  } finally {
    client.release();
  }
};

module.exports = { withDbLock };
