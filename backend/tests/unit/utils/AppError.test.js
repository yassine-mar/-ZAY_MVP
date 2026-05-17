'use strict';

const AppError = require('../../../src/utils/AppError');

describe('AppError', () => {
  it('creates an operational error with the correct shape', () => {
    const err = new AppError(404, 'NOT_FOUND', 'Resource not found');

    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource not found');
    expect(err.isOperational).toBe(true);
    expect(err.details).toBeNull();
  });

  it('preserves details when provided', () => {
    const details = [{ field: 'email', message: 'Invalid email' }];
    const err = new AppError(400, 'VALIDATION_ERROR', 'Validation failed', details);

    expect(err.details).toEqual(details);
  });

  it('captures stack trace', () => {
    const err = new AppError(500, 'INTERNAL_ERROR', 'Crash');
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('AppError');
  });
});
