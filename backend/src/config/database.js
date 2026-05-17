'use strict';

const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: env.isProduction ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  logger.debug('New client connected to PostgreSQL pool');
});

pool.on('error', (err) => {
  logger.error('PostgreSQL pool error', { error: err.message });
});

module.exports = { db: pool };
