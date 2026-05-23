/**
 * Backend response envelope (the interceptor unwraps `data` for us, so
 * screen code sees the inner shapes directly — these types are mostly for
 * documenting the wire format).
 */
export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  request_id?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Normalized error shape — every parseApiError() call returns this.
 * Screens, toast handlers, and field-error mappers all read these fields.
 */
export interface AppError {
  code:
    | 'NETWORK'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'VALIDATION_ERROR'
    | 'UNPROCESSABLE'
    | 'RATE_LIMITED'
    | 'SERVER'
    | 'UNKNOWN';
  message: string;
  status: number | null;
  details?: Array<{ field: string; message: string }>;
  requestId?: string;
}
