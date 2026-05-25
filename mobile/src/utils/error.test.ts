/**
 * Pure unit tests for the error normalizer.
 *
 * `parseApiError` is the single funnel between axios/network errors and the
 * `AppError` shape the rest of the app consumes (toasts, inline form errors,
 * ErrorScreens). It MUST never throw and MUST always return the same shape.
 */
import { AxiosError, AxiosHeaders } from 'axios';
import { parseApiError } from './error';

const buildAxiosError = (
  status: number,
  body?: unknown,
): AxiosError => {
  const headers = new AxiosHeaders();
  // AxiosError needs a usable config; the request method/url are surfaced in logs.
  const config = { headers, url: '/test', method: 'POST' as const };
  const err = new AxiosError('Request failed', String(status), config as never);
  err.response = {
    status,
    statusText: '',
    headers: {},
    config: config as never,
    data: body,
  };
  return err;
};

describe('parseApiError', () => {
  /* ── Network failure (no response received) ─────────────────────────── */

  it('returns NETWORK when no response is present (e.g. timeout)', () => {
    const err = new AxiosError('connect ETIMEDOUT', 'ECONNABORTED');
    expect(parseApiError(err)).toEqual({
      code: 'NETWORK',
      status: null,
      message: expect.stringMatching(/internet/i),
    });
  });

  /* ── HTTP status → AppError code mapping ────────────────────────────── */

  it.each([
    [400, 'VALIDATION_ERROR'],
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [422, 'UNPROCESSABLE'],
    [429, 'RATE_LIMITED'],
    [500, 'SERVER'],
    [502, 'SERVER'],
    [503, 'SERVER'],
  ] as const)('maps HTTP %s → %s', (status, expectedCode) => {
    const parsed = parseApiError(buildAxiosError(status));
    expect(parsed.code).toBe(expectedCode);
    expect(parsed.status).toBe(status);
  });

  /* ── Backend body honored over status-based default ─────────────────── */

  it('prefers backend-provided code over status-based default', () => {
    const err = buildAxiosError(400, {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
    const parsed = parseApiError(err);
    expect(parsed.code).toBe('INVALID_CREDENTIALS');
    expect(parsed.message).toBe('Invalid email or password');
  });

  it('preserves field-level details for inline form errors', () => {
    const err = buildAxiosError(400, {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: [
        { field: 'email', message: 'Already taken' },
        { field: 'phone', message: 'Invalid format' },
      ],
    });
    const parsed = parseApiError(err);
    expect(parsed.details).toEqual([
      { field: 'email', message: 'Already taken' },
      { field: 'phone', message: 'Invalid format' },
    ]);
  });

  it('preserves request_id for support / Sentry correlation', () => {
    const err = buildAxiosError(500, {
      code: 'SERVER',
      message: 'Boom',
      request_id: 'req-abc-123',
    });
    expect(parseApiError(err).requestId).toBe('req-abc-123');
  });

  /* ── Falls back to generic messages so toast copy is never blank ────── */

  it('substitutes a user-facing message when backend body has none', () => {
    const parsed = parseApiError(buildAxiosError(429));
    expect(parsed.message).toMatch(/too many|wait/i);
  });

  /* ── Non-Axios errors don't crash ───────────────────────────────────── */

  it('handles a plain Error as UNKNOWN', () => {
    const parsed = parseApiError(new Error('something broke'));
    expect(parsed).toEqual({
      code: 'UNKNOWN',
      status: null,
      message: 'something broke',
    });
  });

  it('handles a non-Error throwable (string) as UNKNOWN with generic message', () => {
    const parsed = parseApiError('weird value');
    expect(parsed.code).toBe('UNKNOWN');
    expect(parsed.status).toBeNull();
    expect(parsed.message).toMatch(/something went wrong/i);
  });

  it('never throws and always returns the AppError shape', () => {
    const samples = [null, undefined, 42, [], {}, 'oops'];
    for (const s of samples) {
      const parsed = parseApiError(s);
      expect(parsed).toEqual(
        expect.objectContaining({
          code: expect.any(String),
          message: expect.any(String),
          status: null,
        }),
      );
    }
  });
});
