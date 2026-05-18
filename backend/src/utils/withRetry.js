'use strict';

const logger = require('./logger');

const DEFAULT_RETRYABLE_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

const isRetryable = (err) =>
  DEFAULT_RETRYABLE_CODES.has(err.code)
  || (typeof err.status === 'number' && err.status >= 500 && err.status < 600);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry an async function with exponential backoff + jitter.
 *
 * Use for outbound calls to external services (FCM, Cloudinary, Stripe).
 * NEVER use for internal DB operations — those should fail fast and surface
 * the real error.
 *
 * @param {() => Promise<T>} fn - the operation to retry
 * @param {object} [options]
 * @param {number} [options.attempts=3] - max attempts (including the first try)
 * @param {number} [options.baseMs=200] - initial backoff
 * @param {number} [options.maxMs=5000] - cap on a single backoff
 * @param {(err: Error) => boolean} [options.shouldRetry] - predicate; defaults
 *   to network errors and 5xx HTTP responses
 * @param {string} [options.label] - logged with each retry for traceability
 * @returns {Promise<T>}
 */
const withRetry = async (fn, options = {}) => {
  const {
    attempts = 3,
    baseMs = 200,
    maxMs = 5000,
    shouldRetry = isRetryable,
    label = 'operation',
  } = options;

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const willRetry = attempt < attempts && shouldRetry(err);
      if (!willRetry) throw err;

      const exponential = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
      const jitter = Math.random() * exponential * 0.3;
      const delay = Math.floor(exponential + jitter);

      logger.warn('Retrying after error', {
        label,
        attempt,
        nextAttempt: attempt + 1,
        delayMs: delay,
        error: err.message,
        code: err.code,
      });

      // eslint-disable-next-line no-await-in-loop
      await sleep(delay);
    }
  }
  throw lastError;
};

module.exports = { withRetry };
