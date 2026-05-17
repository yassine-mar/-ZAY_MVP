'use strict';

const cron = require('node-cron');
const OrderService = require('../services/order.service');
const logger = require('../utils/logger');

/**
 * Auto-cancel cron job (Architecture Amendment 2).
 * Runs every 5 minutes. Cancels orders that have been pending > 30 minutes.
 *
 * Called from server.js on startup.
 */
const startAutoCancelJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    logger.debug('Running auto-cancel cron job');
    try {
      const cancelled = await OrderService.autoCancelExpiredOrders();
      if (cancelled && cancelled.length > 0) {
        logger.info('Auto-cancelled expired orders', { count: cancelled.length });
      }
    } catch (err) {
      logger.error('Auto-cancel job failed', { error: err.message, stack: err.stack });
    }
  });
  logger.info('Auto-cancel cron job scheduled (every 5 minutes)');
};

module.exports = { startAutoCancelJob };
