'use strict';

const { db } = require('../config/database');

/**
 * Execute a single parameterized query on the pool.
 * Use for all standalone queries outside transactions.
 */
const query = (text, params) => db.query(text, params);

/**
 * Execute multiple queries as a single atomic transaction.
 * Auto-commits on success, auto-rollbacks on error.
 * @param {(client: import('pg').PoolClient) => Promise<any>} callback
 */
const withTransaction = async (callback) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { query, withTransaction };
