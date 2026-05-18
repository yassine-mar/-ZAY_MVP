'use strict';

const cron = require('node-cron');
const OrderService = require('../services/order.service');
const { withDbLock } = require('../utils/dbLock');
const logger = require('../utils/logger');

// Stable integer identifier for the PG advisory lock.
// Unique per cron job — if you add more jobs, give each a distinct number.
const AUTO_CANCEL_LOCK_ID = 7_001_001;

/**
 * Auto-cancel cron job (Architecture Amendment 2).
 *
 * Runs every 5 minutes. Cancels orders that have been pending > 30 minutes
 * and notifies the customer via FCM + socket.
 *
 * Safe under PM2 cluster mode: only the instance that acquires the advisory
 * lock executes the work. Other instances log "skipped" and return immediately.
 *
 * Errors are caught — a failed run NEVER crashes the server.
 *
 * Called from server.js on startup. Returns the cron task so the caller can
 * stop it during graceful shutdown.
 */
const startAutoCancelJob = () => {
  const task = cron.schedule('*/5 * * * *', async () => {
    const start = Date.now();
    try {
      const { acquired, result } = await withDbLock(AUTO_CANCEL_LOCK_ID, async () =>
        OrderService.autoCancelExpiredOrders()
      );

      if (!acquired) {
        logger.debug('Auto-cancel skipped — another instance holds the lock');
        return;
      }

      const count = Array.isArray(result) ? result.length : (result ?? 0);
      if (count > 0) {
        logger.info('Auto-cancel job ran', {
          cancelledCount: count,
          durationMs: Date.now() - start,
        });
      } else {
        logger.debug('Auto-cancel job ran — no expired orders');
      }
    } catch (err) {
      logger.error('Auto-cancel job failed', {
        error: err.message,
        stack: err.stack,
      });
    }
  }, {
    scheduled: true,
    timezone: 'Africa/Casablanca',
  });

  logger.info('Auto-cancel cron scheduled (every 5 minutes, cluster-safe)');
  return task;
};

module.exports = { startAutoCancelJob };
