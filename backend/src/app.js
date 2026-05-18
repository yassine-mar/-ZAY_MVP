'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');

const env = require('./config/env');
const { initSocket } = require('./config/socket');
const requestId = require('./middleware/requestId');
const requestLogger = require('./middleware/requestLogger');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');
const logger = require('./utils/logger');
const apiRouter = require('./routes/index');

const HEALTH_PATH = '/api/v1/health';

const createApp = () => {
  const app = express();
  const httpServer = createServer(app);

  initSocket(httpServer);

  // Behind Nginx — trust the first proxy hop for req.ip and rate limiting.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.disable('etag');

  // Order matters here:
  //   1. morgan       — logs every request (skips /health)
  //   2. requestId    — assigns req.requestId (honors upstream X-Request-Id)
  //   3. requestLogger — opens AsyncLocalStorage context so any downstream
  //                      code can call getRequestId() without param threading
  //   4. cors         — must precede body parser (handles OPTIONS preflight)
  //   5. helmet       — security headers on every response
  //   6. body parsers — JSON + urlencoded, both capped at 10kb
  //   7. globalLimiter — rate limit, after parsers so 429s have requestId
  app.use(morgan(env.isProduction ? 'combined' : 'dev', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => req.path === HEALTH_PATH,
  }));
  app.use(requestId);
  app.use(requestLogger);
  app.use(cors(env.corsOptions));
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));
  app.use(globalLimiter);

  app.use('/api/v1', apiRouter);

  app.use((req, _res, next) => {
    next(new AppError(404, 'ROUTE_NOT_FOUND', `Route ${req.method} ${req.path} not found`));
  });

  app.use(errorHandler);

  return { app, httpServer };
};

module.exports = { createApp };
