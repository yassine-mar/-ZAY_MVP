/**
 * Shape of the backend's standard response envelope.
 * The axios response interceptor unwraps the envelope so API callers receive
 * `data` directly. These types document what `data` looks like inside.
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

/** Generic listing query params for any admin /list endpoint. */
export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
}
