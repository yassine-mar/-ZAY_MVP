'use strict';

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const OrderModel = require('../models/order.model');
const ItemModel = require('../models/item.model');
const SellerModel = require('../models/seller.model');
const { withTransaction } = require('../models/base.model');
const NotificationService = require('./notification.service');
const { getIO } = require('../config/socket');
const { parsePaginationParams, buildPaginationMeta } = require('../utils/pagination');
const {
  ORDER_STATUSES,
  isValidTransition,
  canCustomerCancel,
  canSellerCancel,
  canAdminCancel,
} = require('../utils/orderState');
const { USER_ROLES } = require('../constants/roles');

const round2 = (n) => Math.round(Number(n) * 100) / 100;

const safeSocketEmit = (room, event, payload) => {
  try {
    getIO().to(room).emit(event, payload);
  } catch (err) {
    logger.warn('Socket emit failed', { room, event, error: err.message });
  }
};

const assertSellerOrderable = (seller) => {
  if (!seller || seller.status !== 'approved') {
    throw new AppError(404, 'NOT_FOUND', 'Seller not found');
  }
  if (!seller.is_open) {
    throw new AppError(422, 'SELLER_CLOSED', 'This seller is not currently accepting orders');
  }
};

/* ── createOrder ──────────────────────────────────────────────────────── */

const createOrder = async (user, input, { idempotencyKey } = {}) => {
  if (idempotencyKey) {
    const existing = await OrderModel.findByIdempotencyKey(user.id, idempotencyKey);
    if (existing) return OrderModel.findByIdWithItems(existing.id);
  }

  const seller = await SellerModel.findById(input.seller_id);
  assertSellerOrderable(seller);

  const requestedIds = input.items.map((i) => i.menu_item_id);
  const foundItems = await ItemModel.findByIds(requestedIds);
  const foundMap = new Map(foundItems.map((i) => [i.id, i]));

  const unavailable = [];
  for (const req of input.items) {
    const found = foundMap.get(req.menu_item_id);
    if (!found) {
      unavailable.push({
        menu_item_id: req.menu_item_id,
        reason: 'Item is currently unavailable',
      });
    } else if (found.seller_id !== input.seller_id) {
      throw new AppError(422, 'CROSS_SELLER_ORDER',
        'All items in an order must be from the same seller');
    }
  }
  if (unavailable.length > 0) {
    throw new AppError(422, 'UNPROCESSABLE', 'Some items are no longer available', unavailable);
  }

  let totalAmount = 0;
  const itemSnapshots = input.items.map((req) => {
    const found = foundMap.get(req.menu_item_id);
    const unitPrice = Number(found.price);
    const subtotal = round2(unitPrice * req.quantity);
    totalAmount += subtotal;
    return {
      menuItemId: found.id,
      name: found.name,
      price: round2(unitPrice),
      quantity: req.quantity,
      subtotal,
      imageUrl: found.image_url,
    };
  });
  totalAmount = round2(totalAmount);

  let createdOrderId;
  try {
    createdOrderId = await withTransaction(async (client) => {
      const order = await OrderModel.create(
        {
          customerId: user.id,
          sellerId: input.seller_id,
          totalAmount,
          paymentMethod: input.payment_method,
          deliveryAddress: input.delivery_address,
          customerNotes: input.customer_notes ?? null,
          idempotencyKey: idempotencyKey ?? null,
        },
        client
      );
      for (const snap of itemSnapshots) {
        await OrderModel.createItem({ orderId: order.id, ...snap }, client);
      }
      await OrderModel.insertStatusHistory(
        {
          orderId: order.id,
          fromStatus: null,
          toStatus: ORDER_STATUSES.PENDING,
          changedBy: user.id,
        },
        client
      );
      return order.id;
    });
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'idx_orders_customer_idempotency') {
      const existing = await OrderModel.findByIdempotencyKey(user.id, idempotencyKey);
      if (existing) return OrderModel.findByIdWithItems(existing.id);
    }
    throw err;
  }

  const fullOrder = await OrderModel.findByIdWithItems(createdOrderId);

  NotificationService.notifyOrderPlaced({
    order: fullOrder,
    sellerUserId: seller.user_id,
  }).catch((err) => logger.warn('Order-placed notification failed', { orderId: createdOrderId, error: err.message }));

  safeSocketEmit(`order:${createdOrderId}`, 'order:new', { orderId: createdOrderId });

  logger.info('Order placed', {
    orderId: createdOrderId, customerId: user.id, sellerId: input.seller_id, total: totalAmount,
  });

  return fullOrder;
};

/* ── Reads ────────────────────────────────────────────────────────────── */

const getOrderById = async (orderId, user) => {
  const order = await OrderModel.findByIdWithItems(orderId);
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');

  if (user.role === USER_ROLES.CUSTOMER) {
    if (order.customer_id !== user.id) {
      throw new AppError(404, 'NOT_FOUND', 'Order not found');
    }
  } else if (user.role === USER_ROLES.SELLER) {
    if (!user.sellerProfile || order.seller_id !== user.sellerProfile.id) {
      throw new AppError(404, 'NOT_FOUND', 'Order not found');
    }
  }
  // Admins skip ownership.
  return order;
};

const getOrdersByCustomer = async (user, queryParams = {}) => {
  const { page, limit, offset } = parsePaginationParams(queryParams);
  const filters = {
    customerId: user.id,
    status: queryParams.status,
    fromDate: queryParams.from_date,
    toDate: queryParams.to_date,
    limit, offset,
  };
  const [items, total] = await Promise.all([
    OrderModel.findByCustomer(filters),
    OrderModel.countByCustomer(filters),
  ]);
  return { items, pagination: buildPaginationMeta(page, limit, total) };
};

const getOrdersBySeller = async (user, queryParams = {}) => {
  const { page, limit, offset } = parsePaginationParams(queryParams);
  const fromDate = queryParams.from_date
    || (queryParams.status || queryParams.to_date
      ? undefined
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const filters = {
    sellerId: user.sellerProfile.id,
    status: queryParams.status,
    fromDate,
    toDate: queryParams.to_date,
    limit, offset,
  };
  const [items, total] = await Promise.all([
    OrderModel.findBySeller(filters),
    OrderModel.countBySeller(filters),
  ]);
  return { items, pagination: buildPaginationMeta(page, limit, total) };
};

const getOrderStatusHistory = async (orderId, user) => {
  await getOrderById(orderId, user);
  return OrderModel.getStatusHistory(orderId);
};

/* ── Status transitions ───────────────────────────────────────────────── */

const performStatusTransition = async ({
  order, newStatus, changedBy, note,
  estimatedReadyAt, autoCancelled, cancellationReason,
  notifyUserIds = [],
}) => {
  if (!isValidTransition(order.status, newStatus)) {
    throw new AppError(
      422, 'INVALID_TRANSITION',
      `Cannot transition from '${order.status}' to '${newStatus}'`
    );
  }

  await withTransaction(async (client) => {
    await OrderModel.updateStatus(
      order.id,
      {
        status: newStatus,
        estimatedReadyAt: estimatedReadyAt ? new Date(estimatedReadyAt) : undefined,
        autoCancelled,
        cancellationReason,
      },
      client
    );
    await OrderModel.insertStatusHistory(
      {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: newStatus,
        changedBy,
        note,
      },
      client
    );
  });

  const fullOrder = await OrderModel.findByIdWithItems(order.id);

  for (const recipientId of notifyUserIds.filter(Boolean)) {
    NotificationService.notifyOrderStatusChanged({
      order: fullOrder,
      recipientId,
      newStatus,
    }).catch((err) => logger.warn('Status notification failed', { orderId: order.id, error: err.message }));
  }

  safeSocketEmit(`order:${order.id}`, 'order:status_changed', {
    orderId: order.id,
    status: newStatus,
    estimatedReadyAt: fullOrder.estimated_ready_at,
    changedAt: new Date().toISOString(),
  });

  return fullOrder;
};

const updateOrderStatus = async (orderId, sellerUser, { status, estimated_ready_at, note }) => {
  const order = await OrderModel.findById(orderId);
  if (!order || order.seller_id !== sellerUser.sellerProfile.id) {
    throw new AppError(404, 'NOT_FOUND', 'Order not found');
  }
  return performStatusTransition({
    order,
    newStatus: status,
    changedBy: sellerUser.id,
    note,
    estimatedReadyAt: estimated_ready_at,
    notifyUserIds: [order.customer_id],
  });
};

const cancelOrderByCustomer = async (orderId, customerUser) => {
  const order = await OrderModel.findById(orderId);
  if (!order || order.customer_id !== customerUser.id) {
    throw new AppError(404, 'NOT_FOUND', 'Order not found');
  }
  if (!canCustomerCancel(order.status)) {
    throw new AppError(422, 'INVALID_TRANSITION',
      'Only pending orders can be cancelled by the customer');
  }
  const seller = await SellerModel.findById(order.seller_id);
  return performStatusTransition({
    order,
    newStatus: ORDER_STATUSES.CANCELLED,
    changedBy: customerUser.id,
    note: 'Cancelled by customer',
    cancellationReason: 'Cancelled by customer',
    notifyUserIds: [seller?.user_id],
  });
};

const cancelOrderBySeller = async (orderId, sellerUser, { reason }) => {
  const order = await OrderModel.findById(orderId);
  if (!order || order.seller_id !== sellerUser.sellerProfile.id) {
    throw new AppError(404, 'NOT_FOUND', 'Order not found');
  }
  if (!canSellerCancel(order.status)) {
    throw new AppError(422, 'INVALID_TRANSITION', `Cannot cancel a ${order.status} order`);
  }
  return performStatusTransition({
    order,
    newStatus: ORDER_STATUSES.CANCELLED,
    changedBy: sellerUser.id,
    note: reason,
    cancellationReason: reason,
    notifyUserIds: [order.customer_id],
  });
};

/**
 * Admin force-cancel. Wider window than seller (can cancel from `ready` too)
 * — see canAdminCancel in orderState.js. Notifies BOTH customer + seller.
 */
const forceCancelByAdmin = async (orderId, adminUserId, reason) => {
  const order = await OrderModel.findById(orderId);
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
  if (!canAdminCancel(order.status)) {
    throw new AppError(422, 'INVALID_TRANSITION', `Cannot cancel a ${order.status} order`);
  }
  const seller = await SellerModel.findById(order.seller_id);
  return performStatusTransition({
    order,
    newStatus: ORDER_STATUSES.CANCELLED,
    changedBy: adminUserId,
    note: `Admin force-cancel: ${reason}`,
    cancellationReason: reason,
    notifyUserIds: [order.customer_id, seller?.user_id],
  });
};

const autoCancelExpiredOrders = async () => {
  const expired = await OrderModel.findPendingExpired();
  const cancelled = [];
  for (const order of expired) {
    try {
      await withTransaction(async (client) => {
        await OrderModel.updateStatus(
          order.id,
          {
            status: ORDER_STATUSES.CANCELLED,
            autoCancelled: true,
            cancellationReason: 'No response from seller within 30 minutes',
          },
          client
        );
        await OrderModel.insertStatusHistory(
          {
            orderId: order.id,
            fromStatus: ORDER_STATUSES.PENDING,
            toStatus: ORDER_STATUSES.CANCELLED,
            changedBy: null,
            note: 'Auto-cancelled — seller did not respond within 30 minutes',
          },
          client
        );
      });

      const fullOrder = await OrderModel.findByIdWithItems(order.id);
      cancelled.push(fullOrder);

      NotificationService.notifyOrderAutoCancelled({
        order: fullOrder,
        customerId: order.customer_id,
      }).catch((err) => logger.warn('Auto-cancel notification failed', { orderId: order.id, error: err.message }));

      safeSocketEmit(`order:${order.id}`, 'order:auto_cancelled', {
        orderId: order.id,
        reason: 'Seller did not respond within 30 minutes',
      });
    } catch (err) {
      logger.error('Auto-cancel failed for order', { orderId: order.id, error: err.message });
    }
  }
  return cancelled;
};

module.exports = {
  createOrder,
  getOrderById,
  getOrdersByCustomer,
  getOrdersBySeller,
  getOrderStatusHistory,
  cancelOrderByCustomer,
  updateOrderStatus,
  cancelOrderBySeller,
  forceCancelByAdmin,
  autoCancelExpiredOrders,
};
