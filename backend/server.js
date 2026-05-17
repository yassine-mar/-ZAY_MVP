'use strict';

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('UNCAUGHT EXCEPTION — shutting down', err);
  process.exit(1);
});

require('dotenv').config();

const { createApp } = require('./src/app');
const { db } = require('./src/config/database');
const { startAutoCancelJob } = require('./src/jobs/autoCancelOrders');
const logger = require('./src/utils/logger');
const env = require('./src/config/env');

const { httpServer } = createApp();

const server = httpServer.listen(env.PORT, () => {
  logger.info(`@ZAY API running on port ${env.PORT} [${env.NODE_ENV}]`);
  if (!env.isTest) {
    startAutoCancelJob();
  }
});

const shutdown = (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    try {
      await db.end();
      logger.info('Database pool closed. Exiting.');
    } catch (err) {
      logger.error('Error closing DB pool', { error: err.message });
    }
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION', { error: err?.message, stack: err?.stack });
  shutdown('unhandledRejection');
});
