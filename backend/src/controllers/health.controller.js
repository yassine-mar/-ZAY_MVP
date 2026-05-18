'use strict';

const { db } = require('../config/database');
const logger = require('../utils/logger');

const VERSION = process.env.npm_package_version || '1.0.0';

/**
 * GET /api/v1/health
 *
 * Liveness + lightweight readiness check. Consumed by:
 *   - Nginx upstream health probe
 *   - Docker HEALTHCHECK
 *   - UptimeRobot (external)
 *   - PM2 cluster manager
 *
 * Returns 200 when the DB is reachable, 503 otherwise.
 * Includes pool stats + memory so deploy verification and on-call can
 * spot saturation before users notice.
 */
const healthCheck = async (_req, res) => {
  let dbStatus = 'connected';
  let dbLatencyMs = null;

  const start = Date.now();
  try {
    await db.query('SELECT 1');
    dbLatencyMs = Date.now() - start;
  } catch (err) {
    dbStatus = 'disconnected';
    logger.warn('Health check: DB unreachable', { error: err.message });
  }

  const healthy = dbStatus === 'connected';
  const mem = process.memoryUsage();

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      status: healthy ? 'healthy' : 'degraded',
      version: VERSION,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      db: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        pool: {
          total: db.totalCount,
          idle: db.idleCount,
          waiting: db.waitingCount,
        },
      },
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      },
    },
  });
};

module.exports = { healthCheck };
