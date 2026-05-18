'use strict';

const rateLimit = require('express-rate-limit');

const HEALTH_PATH = '/api/v1/health';

const buildLimiter = ({ max, windowMs, message }) =>
  rateLimit({
    max,
    windowMs,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => req.path === HEALTH_PATH,
    handler: (req, res) => {
      const retryAfter = Math.ceil(windowMs / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          requestId: req.requestId,
        },
      });
    },
  });

const globalLimiter = buildLimiter({
  max: 300,
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests. Please slow down.',
});

const authLimiter = buildLimiter({
  max: 10,
  windowMs: 15 * 60 * 1000,
  message: 'Too many authentication attempts. Please wait 15 minutes and try again.',
});

const uploadLimiter = buildLimiter({
  max: 20,
  windowMs: 60 * 60 * 1000,
  message: 'Upload limit reached. Please wait before uploading more images.',
});

module.exports = { globalLimiter, authLimiter, uploadLimiter };
