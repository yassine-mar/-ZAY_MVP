'use strict';

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('UNCAUGHT EXCEPTION — shutting down', err);
  process.exit(1);
});

require('dotenv').config();

const env = require('./src/config/env');
const logger = require('./src/utils/logger');
const { createApp } = require('./src/app');
const { testConnection, closeDatabase } = require('./src/config/database');
const { getIO } = require('./src/config/socket');
const { startAutoCancelJob } = require('./src/jobs/autoCancelOrders');

let server;
let autoCancelTask;
let shuttingDown = false;

const start = async () => {
  await testConnection();
  logger.info('Database connection verified');

  const { httpServer } = createApp();

  server = httpServer.listen(env.PORT, env.HOST, () => {
    logger.info(`@ZAY API listening on ${env.HOST}:${env.PORT}`, {
      env: env.NODE_ENV,
      pid: process.pid,
      node: process.version,
    });

    if (!env.isTest) {
      autoCancelTask = startAutoCancelJob();
    }
  });

  server.on('error', (err) => {
    logger.error('HTTP server error', { error: err.message });
    process.exit(1);
  });
};

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`${signal} received — graceful shutdown starting`);

  setTimeout(() => {
    logger.error(`Forced exit — ${signal} shutdown exceeded 15s`);
    process.exit(1);
  }, 15_000).unref();

  if (autoCancelTask && typeof autoCancelTask.stop === 'function') {
    try {
      autoCancelTask.stop();
      logger.info('Cron jobs stopped');
    } catch (err) {
      logger.warn('Error stopping cron jobs', { error: err.message });
    }
  }

  try {
    const io = getIO();
    await new Promise((resolve) => io.close(resolve));
    logger.info('Socket.io closed');
  } catch (err) {
    logger.warn('Socket.io close skipped', { reason: err.message });
  }

  if (server) {
    await new Promise((resolve) => server.close(resolve));
    logger.info('HTTP server closed');
  }

  try {
    await closeDatabase();
    logger.info('Database pool closed');
  } catch (err) {
    logger.error('Error closing database', { error: err.message });
  }

  logger.info('Shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('UNHANDLED REJECTION', { error: err.message, stack: err.stack });
  shutdown('unhandledRejection');
});

start().catch((err) => {
  logger.error('Startup failed', { error: err.message, stack: err.stack });
  process.exit(1);
});
