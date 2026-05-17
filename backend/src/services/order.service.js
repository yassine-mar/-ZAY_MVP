'use strict';

const AppError = require('../utils/AppError');
const OrderModel = require('../models/order.model');
const ItemModel = require('../models/item.model');
const SellerModel = require('../models/seller.model');
const { withTransaction } = require('../models/base.model');
const NotificationService = require('./notification.service');
const { getIO } = require('../config/socket');
const { parsePaginationParams, buildPaginationMeta } = require('../utils/pagination');
const { serializeOrder, serializeOrderItem } = require('../utils/serializers/order.serializer');

const VALID_TRANSITIONS = {
  pending:   ['accepted', 'cancelled'],
  accepted:  ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready:     ['delivered'],
  delivered: [],
  cancelled: [],
};

/**
 * Place a new order. The most complex service in the application.
 * Validates business rules, calculates server-side total, runs atomic transaction.
 * @returns {Promise<object>} serialized order
 */
const createOrder = async (user, { seller_id, items, delivery_address, customer_notes, payment_method }) => {
  // TODO:
  // 1. Fetch seller → check status === 'approved' AND is_open === true
  // 2. Fetch all menu items by IDs (ItemModel.findByIds)
  // 3. Validate all items exist, are available, and belong to seller_id
  // 4. Validate no cross-seller items (all items.seller_id === seller_id)
  // 5. Calculate total_amount = sum(price * quantity) — SERVER SIDE ONLY
  // 6. withTransaction(async (client) => {
  //      order = OrderModel.create({ customerId: user.id, sellerId, totalAmount, ... }, client)
  //      for each item: OrderModel.createItem({ orderId: order.id, ... }, client)
  //    })
  // 7. [fire and forget] NotificationService.notifyOrderPlaced(order, seller.userId)
  // 8. [fire and forget] getIO().to(`order:${order.id}`).emit('order:new', { orderId: order.id })
  // 9. Return serialized order
  throw new Error('Not implemented');
};

/**
 * Get order by ID with ownership enforcement.
 * Customer sees their own order. Seller sees their restaurant's order.
 */
const getOrderById = async (orderId, user) => {
  // TODO:
  // 1. OrderModel.findById(orderId)
  // 2. If not found: throw AppError(404, 'NOT_FOUND', 'Order not found')
  // 3. Ownership check:
  //    - customer: order.customer_id !== user.id → throw 404 (don't reveal existence)
  //    - seller: order.seller_id !== user.sellerProfile.id → throw 404
  // 4. Return serializeOrder(order, { includeSellerContact: user.role === 'customer' })
  throw new Error('Not implemented');
};

/** @returns {Promise<{ items, pagination }>} */
const getOrdersByCustomer = async (user, query) => {
  // TODO: parsePaginationParams, OrderModel.findByCustomer, buildPaginationMeta, serialize
  throw new Error('Not implemented');
};

/** @returns {Promise<{ items, pagination }>} */
const getOrdersBySeller = async (user, query) => {
  // TODO: parsePaginationParams, OrderModel.findBySeller with default from_date = 7 days ago
  throw new Error('Not implemented');
};

/**
 * Customer cancels a pending order.
 */
const cancelOrderByCustomer = async (orderId, user) => {
  // TODO:
  // 1. getOrderById(orderId, user) — enforces ownership
  // 2. If order.status !== 'pending': throw AppError(422, 'INVALID_TRANSITION', 'Only pending orders can be cancelled')
  // 3. OrderModel.updateStatus(orderId, { status: 'cancelled', note: 'Cancelled by customer' })
  // 4. NotificationService.notifyOrderStatusChanged({ order, sellerId, newStatus: 'cancelled' })
  // 5. getIO().to(...).emit('order:status_changed', ...)
  throw new Error('Not implemented');
};

/**
 * Seller updates order status through the state machine.
 */
const updateOrderStatus = async (orderId, seller, { status, estimated_ready_at, note }) => {
  // TODO:
  // 1. OrderModel.findById(orderId) + ownership check (order.seller_id === seller.sellerProfile.id)
  // 2. Validate VALID_TRANSITIONS[currentStatus].includes(newStatus) → throw AppError(422, 'INVALID_TRANSITION')
  // 3. OrderModel.updateStatus(orderId, { status, estimatedReadyAt: estimated_ready_at, note })
  // 4. NotificationService.notifyOrderStatusChanged({ order, customerId, newStatus })
  // 5. getIO().to(`order:${orderId}`).emit('order:status_changed', { orderId, status, estimatedReadyAt: estimated_ready_at, changedAt })
  throw new Error('Not implemented');
};

/**
 * Seller cancels an order they cannot fulfill.
 */
const cancelOrderBySeller = async (orderId, seller, { reason }) => {
  // TODO: Same as updateOrderStatus but with transition validation (cannot cancel delivered)
  // and notification to customer
  throw new Error('Not implemented');
};

/**
 * Auto-cancel cron job: cancels all pending orders > 30 minutes old.
 * Called by the cron job, not by a controller.
 */
const autoCancelExpiredOrders = async () => {
  // TODO:
  // 1. OrderModel.findPendingExpired()
  // 2. For each: OrderModel.updateStatus(id, { status: 'cancelled', note: 'Auto-cancelled — no response from seller' })
  //    + mark auto_cancelled = TRUE
  // 3. NotificationService.notifyOrderAutoCancelled(order, order.customer_id)
  // 4. getIO().to(`order:${order.id}`).emit('order:auto_cancelled', ...)
  // 5. Log count of cancelled orders
  throw new Error('Not implemented');
};

module.exports = {
  createOrder,
  getOrderById,
  getOrdersByCustomer,
  getOrdersBySeller,
  cancelOrderByCustomer,
  updateOrderStatus,
  cancelOrderBySeller,
  autoCancelExpiredOrders,
  VALID_TRANSITIONS,
};
