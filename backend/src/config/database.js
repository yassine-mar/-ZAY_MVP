'use strict';

const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: env.isProduction ? { rejectUnauthorized: false } : false,
  application_name: 'zay-api',
});

pool.on('error', (err) => {
  logger.error('PostgreSQL pool error (idle client)', {
    error: err.message,
    code: err.code,
  });
});

/**
 * Verify the database is reachable. Called once at startup.
 * Throws if connection fails — server should not start.
 */
const testConnection = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
};

/**
 * Drain the pool. Called from server.js during graceful shutdown.
 */
const closeDatabase = () => pool.end();

module.exports = { db: pool, testConnection, closeDatabase };
