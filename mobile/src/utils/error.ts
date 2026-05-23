import { AxiosError } from 'axios';
import type { AppError } from '@/types/api.types';

const STATUS_CODE_MAP: Record<number, AppError['code']> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE',
  429: 'RATE_LIMITED',
};

const GENERIC_MESSAGES: Record<AppError['code'], string> = {
  NETWORK:          'No internet connection. Please check your network and try again.',
  UNAUTHORIZED:     'Please sign in to continue.',
  FORBIDDEN:        'You don\'t have permission to do that.',
  NOT_FOUND:        'We couldn\'t find what you were looking for.',
  CONFLICT:         'That conflicts with an existing record.',
  VALIDATION_ERROR: 'Please check the highlighted fields and try again.',
  UNPROCESSABLE:    'Something doesn\'t look right. Please review your input.',
  RATE_LIMITED:     'Too many attempts. Please wait a moment and try again.',
  SERVER:           'Server error. Please try again in a moment.',
  UNKNOWN:          'Something went wrong. Please try again.',
};

/**
 * Normalize anything thrown by axios or app code into an AppError shape.
 * Always returns — never throws.
 */
export function parseApiError(error: unknown): AppError {
  if (error instanceof AxiosError) {
    // No response received — network failure or timeout.
    if (!error.response) {
      return {
        code: 'NETWORK',
        message: GENERIC_MESSAGES.NETWORK,
        status: null,
      };
    }

    const status = error.response.status;
    const body = error.response.data as
      | { code?: string; message?: string; details?: Array<{ field: string; message: string }>; request_id?: string }
      | undefined;

    const code =
      (body?.code as AppError['code'] | undefined) ??
      STATUS_CODE_MAP[status] ??
      (status >= 500 ? 'SERVER' : 'UNKNOWN');

    return {
      code,
      message: body?.message ?? GENERIC_MESSAGES[code] ?? GENERIC_MESSAGES.UNKNOWN,
      status,
      details: body?.details,
      requestId: body?.request_id,
    };
  }

  if (error instanceof Error) {
    return { code: 'UNKNOWN', message: error.message, status: null };
  }

  return { code: 'UNKNOWN', message: GENERIC_MESSAGES.UNKNOWN, status: null };
}
