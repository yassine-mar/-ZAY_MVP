import axios from 'axios';

export interface ParsedApiError {
  code: string;
  message: string;
  status: number;
  details?: Array<{ field: string; message: string }>;
  requestId?: string;
}

/**
 * Normalize any thrown thing into a consistent shape we can act on:
 *  - axios errors with a response body (the backend's envelope)
 *  - axios network errors (no response)
 *  - non-axios errors (programming bugs)
 */
export function parseApiError(err: unknown): ParsedApiError {
  if (axios.isAxiosError(err)) {
    const response = err.response;
    if (response && typeof response.data === 'object' && response.data !== null) {
      const body = response.data as {
        error?: { code?: string; message?: string; details?: any; requestId?: string };
      };
      return {
        code: body.error?.code ?? 'INTERNAL_ERROR',
        message: body.error?.message ?? err.message,
        status: response.status,
        details: body.error?.details,
        requestId: body.error?.requestId,
      };
    }
    return {
      code: 'NETWORK_ERROR',
      message: 'Could not reach the server. Check your connection.',
      status: 0,
    };
  }

  if (err instanceof Error) {
    return { code: 'UNKNOWN', message: err.message, status: 0 };
  }

  return { code: 'UNKNOWN', message: 'An unexpected error occurred.', status: 0 };
}

/**
 * Map server `details[]` validation errors back to React Hook Form `setError`.
 */
export function applyFieldErrors(
  details: ParsedApiError['details'],
  setError: (name: string, error: { message: string }) => void
): void {
  if (!details) return;
  for (const { field, message } of details) {
    if (field) setError(field, { message });
  }
}
