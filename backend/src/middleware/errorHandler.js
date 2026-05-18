'use strict';

const env = require('../config/env');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

/**
 * Convert common non-AppError exceptions into AppError for consistent client responses.
 * Returns null when the error is not recognized — the handler treats it as a programming error.
 */
const normalizeError = (err) => {
  if (err instanceof AppError) return err;

  // express.json() malformed body
  if (err.type === 'entity.parse.failed') {
    return new AppError(400, 'BAD_REQUEST', 'Malformed JSON body');
  }
  if (err.type === 'entity.too.large') {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds size limit');
  }

  // jsonwebtoken errors (defense-in-depth — authenticate.js usually catches these first)
  if (err.name === 'JsonWebTokenError') {
    return new AppError(401, 'UNAUTHORIZED', 'Invalid authentication token');
  }
  if (err.name === 'TokenExpiredError') {
    return new AppError(401, 'TOKEN_EXPIRED', 'Authentication token has expired');
  }

  // CORS rejection
  if (err.message === 'Not allowed by CORS') {
    return new AppError(403, 'CORS_REJECTED', 'Origin not allowed');
  }

  // PostgreSQL unique violation — last-resort safety net for race conditions
  // (services should throw CONFLICT explicitly when they expect duplicates)
  if (err.code === '23505') {
    return new AppError(409, 'CONFLICT', 'Resource already exists');
  }

  return null;
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  const normalized = normalizeError(err) || err;
  const isOperational = normalized.isOperational === true;

  if (!isOperational) {
    logger.error('Unhandled error', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      error: normalized.message,
      stack: normalized.stack,
    });
  } else if (normalized.statusCode >= 500) {
    logger.error('Operational 5xx', {
      requestId: req.requestId,
      code: normalized.code,
      message: normalized.message,
    });
  } else {
    logger.warn('Operational error', {
      requestId: req.requestId,
      code: normalized.code,
      statusCode: normalized.statusCode,
      method: req.method,
      url: req.originalUrl,
    });
  }

  const statusCode = isOperational ? normalized.statusCode : 500;
  const response = {
    success: false,
    error: {
      code: isOperational ? normalized.code : 'INTERNAL_ERROR',
      message: isOperational
        ? normalized.message
        : 'Something went wrong. Please try again.',
      requestId: req.requestId,
    },
  };

  if (isOperational && normalized.details) {
    response.error.details = normalized.details;
  }

  if (!env.isProduction && !isOperational && normalized.stack) {
    response.error.stack = normalized.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
