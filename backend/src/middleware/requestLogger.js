'use strict';

const { runWithContext } = require('../utils/requestContext');

/**
 * Establishes per-request async context with the requestId already
 * assigned by the `requestId` middleware. Anything downstream in the
 * same async chain can call `getRequestId()` without explicit passing.
 *
 * Order matters: this middleware MUST run after `requestId` and before
 * any route handler or service is invoked.
 */
const requestLogger = (req, _res, next) => {
  runWithContext({ requestId: req.requestId, ip: req.ip }, next);
};

module.exports = requestLogger;
