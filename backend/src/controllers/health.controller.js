'use strict';

const { db } = require('../config/database');

const healthCheck = async (req, res) => {
  let dbStatus = 'connected';
  try {
    await db.query('SELECT 1');
  } catch {
    dbStatus = 'disconnected';
  }

  const status = dbStatus === 'connected' ? 'healthy' : 'degraded';
  const httpStatus = status === 'healthy' ? 200 : 503;

  res.status(httpStatus).json({
    success: status === 'healthy',
    data: {
      status,
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor(process.uptime()),
      db: dbStatus,
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = { healthCheck };
