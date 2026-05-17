'use strict';

const OrderModel = require('../../models/order.model');
const AppError = require('../../utils/AppError');
const NotificationService = require('../notification.service');
const { parsePaginationParams, buildPaginationMeta } = require('../../utils/pagination');

/** @returns {Promise<{ items, pagination }>} */
const getOrders = async (query) => {
  // TODO: paginated, all filters (status, seller_id, customer_id, date range, auto_cancelled)
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} full order detail with status history */
const getOrderDetail = async (orderId) => {
  // TODO: OrderModel.findById + OrderModel.getStatusHistory
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} cancelled order */
const forceCancelOrder = async (orderId, reason) => {
  // TODO:
  // 1. fetch order → 404 if not found
  // 2. If status in ('delivered', 'cancelled'): throw 422
  // 3. OrderModel.updateStatus({ status: 'cancelled', note: reason })
  // 4. Notify both customer and seller
  throw new Error('Not implemented');
};

module.exports = { getOrders, getOrderDetail, forceCancelOrder };
