'use strict';

const rateLimit = require('express-rate-limit');

const buildLimiter = (max, windowMs, message) =>
  rateLimit({
    max,
    windowMs,
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy: true,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
      },
    },
  });

const globalLimiter = buildLimiter(
  300,
  15 * 60 * 1000,
  'Too many requests. Please slow down.'
);

const authLimiter = buildLimiter(
  10,
  15 * 60 * 1000,
  'Too many authentication attempts. Please wait 15 minutes before trying again.'
);

const uploadLimiter = buildLimiter(
  20,
  60 * 60 * 1000,
  'Upload limit reached. Please wait before uploading more images.'
);

module.exports = { globalLimiter, authLimiter, uploadLimiter };
