'use strict';

const { db } = require('../config/database');
const logger = require('../utils/logger');

const VERSION = process.env.npm_package_version || '1.0.0';

const healthCheck = async (_req, res) => {
  let dbStatus = 'connected';
  try {
    await db.query('SELECT 1');
  } catch (err) {
    dbStatus = 'disconnected';
    logger.warn('Health check: DB unreachable', { error: err.message });
  }

  const healthy = dbStatus === 'connected';

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      status: healthy ? 'healthy' : 'degraded',
      version: VERSION,
      uptime: Math.floor(process.uptime()),
      db: dbStatus,
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = { healthCheck };
