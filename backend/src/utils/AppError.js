'use strict';

/**
 * Operational error class. Anything thrown as AppError is considered
 * a known, recoverable condition and is safe to expose to clients.
 *
 * Programming errors (TypeError, ReferenceError, etc.) are caught by
 * the global error handler and returned as generic INTERNAL_ERROR.
 */
class AppError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

module.exports = AppError;
