'use strict';

const env = require('../config/env');
const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  const isOperational = err.isOperational === true;

  if (!isOperational) {
    logger.error('Unhandled error', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      error: err.message,
      stack: err.stack,
    });
  }

  const statusCode = isOperational ? err.statusCode : 500;
  const code = isOperational ? err.code : 'INTERNAL_ERROR';
  const message = isOperational
    ? err.message
    : 'Something went wrong. Please try again.';

  const response = {
    success: false,
    error: {
      code,
      message,
      requestId: req.requestId,
    },
  };

  if (isOperational && err.details) {
    response.error.details = err.details;
  }

  if (!env.isProduction && !isOperational) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
