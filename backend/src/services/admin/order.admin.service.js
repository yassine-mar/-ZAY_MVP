'use strict';

const OrderModel = require('../../models/order.model');
const OrderService = require('../order.service');
const AppError = require('../../utils/AppError');
const { parsePaginationParams, buildPaginationMeta } = require('../../utils/pagination');

const listAll = async (queryParams = {}) => {
  const { page, limit, offset } = parsePaginationParams(queryParams);
  const filters = {
    status: queryParams.status,
    sellerId: queryParams.seller_id,
    customerId: queryParams.customer_id,
    fromDate: queryParams.from_date,
    toDate: queryParams.to_date,
    autoCancelled: queryParams.auto_cancelled,
    limit,
    offset,
  };

  const [items, total] = await Promise.all([
    OrderModel.findAllForAdmin(filters),
    OrderModel.countAllForAdmin(filters),
  ]);

  return { items, pagination: buildPaginationMeta(page, limit, total) };
};

const getOrderDetail = async (orderId) => {
  const order = await OrderModel.findByIdWithItems(orderId);
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');

  const history = await OrderModel.getStatusHistory(orderId);
  return { order, history };
};

/**
 * Admin force-cancel: delegates to OrderService so the state-machine check,
 * audit row, and dual-party notification all run through the standard path.
 */
const forceCancelOrder = async (orderId, adminUserId, reason) =>
  OrderService.forceCancelByAdmin(orderId, adminUserId, reason);

module.exports = { listAll, getOrderDetail, forceCancelOrder };
