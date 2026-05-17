'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');

const env = require('./config/env');
const { initSocket } = require('./config/socket');
const requestId = require('./middleware/requestId');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');
const logger = require('./utils/logger');
const apiRouter = require('./routes/index');

const createApp = () => {
  const app = express();
  const httpServer = createServer(app);

  initSocket(httpServer);

  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => req.path === '/api/v1/health',
  }));
  app.use(requestId);
  app.use(cors(env.corsOptions));
  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));
  app.use(globalLimiter);

  app.use('/api/v1', apiRouter);

  app.use((req, _res, next) => {
    next(new AppError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.path} not found`));
  });

  app.use(errorHandler);

  return { app, httpServer };
};

module.exports = { createApp };
