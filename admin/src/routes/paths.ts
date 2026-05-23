/**
 * Named route paths — single source of truth.
 * Use these instead of inline strings to make refactors safe.
 */
export const PATHS = {
  LOGIN: '/login',

  DASHBOARD: '/dashboard',

  SELLERS: '/sellers',
  SELLER_DETAIL: (id: string) => `/sellers/${id}`,

  USERS: '/users',
  USER_DETAIL: (id: string) => `/users/${id}`,

  ORDERS: '/orders',
  ORDER_DETAIL: (id: string) => `/orders/${id}`,

  CATEGORIES: '/categories',

  ANALYTICS: '/analytics',
} as const;
