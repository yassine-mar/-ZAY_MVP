'use strict';

/**
 * Authoritative role and status constants.
 * Mirrors the PostgreSQL enums defined in migration 002.
 * Use these everywhere — never inline string literals like 'customer'.
 */

const USER_ROLES = Object.freeze({
  CUSTOMER: 'customer',
  SELLER: 'seller',
  ADMIN: 'admin',
});

const USER_STATUSES = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
});

const SELLER_STATUSES = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
});

module.exports = { USER_ROLES, USER_STATUSES, SELLER_STATUSES };
