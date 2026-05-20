'use strict';

/**
 * Order status state machine — the authoritative definition.
 *
 * Customer can:
 *   - Cancel only PENDING orders (before seller accepts)
 *
 * Seller can:
 *   - Accept pending → set estimated_ready_at
 *   - Move accepted → preparing → ready → delivered
 *   - Cancel anything except terminal states (delivered/cancelled)
 *
 * Admin can:
 *   - Cancel anything not yet terminal (force-cancel with reason)
 *   - Cannot manipulate other transitions (avoid trust issues)
 *
 * Terminal states: delivered, cancelled. No outgoing transitions.
 */

const ORDER_STATUSES = Object.freeze({
  PENDING:   'pending',
  ACCEPTED:  'accepted',
  PREPARING: 'preparing',
  READY:     'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
});

const VALID_TRANSITIONS = Object.freeze({
  pending:   ['accepted', 'cancelled'],
  accepted:  ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready:     ['delivered'],
  delivered: [],
  cancelled: [],
});

const TERMINAL_STATUSES = Object.freeze(new Set(['delivered', 'cancelled']));

// Which statuses each actor is allowed to cancel FROM.
const CUSTOMER_CANCEL_FROM = Object.freeze(new Set(['pending']));
const SELLER_CANCEL_FROM = Object.freeze(new Set(['pending', 'accepted', 'preparing']));
const ADMIN_CANCEL_FROM = Object.freeze(new Set(['pending', 'accepted', 'preparing', 'ready']));

// Statuses during which the seller's phone is exposed to the customer
// (Architecture Amendment 3 — delivery coordination).
const SELLER_CONTACT_VISIBLE = Object.freeze(new Set(['accepted', 'preparing', 'ready']));

const isValidTransition = (from, to) => Boolean(VALID_TRANSITIONS[from]?.includes(to));

const isTerminal = (status) => TERMINAL_STATUSES.has(status);

const canCustomerCancel = (status) => CUSTOMER_CANCEL_FROM.has(status);
const canSellerCancel = (status) => SELLER_CANCEL_FROM.has(status);
const canAdminCancel = (status) => ADMIN_CANCEL_FROM.has(status);

const isSellerContactVisible = (status) => SELLER_CONTACT_VISIBLE.has(status);

module.exports = {
  ORDER_STATUSES,
  VALID_TRANSITIONS,
  TERMINAL_STATUSES,
  isValidTransition,
  isTerminal,
  canCustomerCancel,
  canSellerCancel,
  canAdminCancel,
  isSellerContactVisible,
};
