'use strict';

const { v4: uuidv4 } = require('uuid');

const VALID_PATTERN = /^[A-Za-z0-9._-]+$/;
const MIN_LEN = 8;
const MAX_LEN = 64;

const isValid = (value) =>
  typeof value === 'string'
  && value.length >= MIN_LEN
  && value.length <= MAX_LEN
  && VALID_PATTERN.test(value);

/**
 * Attach a unique request ID. Honors an upstream `X-Request-Id` header
 * if it looks safe, otherwise generates a UUID v4.
 * Exposes the ID via response header for client-side correlation.
 */
const requestId = (req, res, next) => {
  const incoming = req.headers['x-request-id'];
  req.requestId = isValid(incoming) ? incoming : uuidv4();
  res.setHeader('X-Request-Id', req.requestId);
  next();
};

module.exports = requestId;
