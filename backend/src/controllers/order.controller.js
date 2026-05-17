'use strict';

const OrderService = require('../services/order.service');
const { sendSuccess, sendPaginated } = require('../utils/response');

const placeOrder = async (req, res) => {
  const order = await OrderService.createOrder(req.user, req.body);
  sendSuccess(res, 201, 'Order placed successfully', { order });
};

const getOrders = async (req, res) => {
  const { items, pagination } = await OrderService.getOrdersByCustomer(req.user, req.query);
  sendPaginated(res, 'Orders fetched', items, pagination);
};

const getOrder = async (req, res) => {
  const order = await OrderService.getOrderById(req.params.id, req.user);
  sendSuccess(res, 200, 'Order fetched', { order });
};

const cancelOrder = async (req, res) => {
  const order = await OrderService.cancelOrderByCustomer(req.params.id, req.user);
  sendSuccess(res, 200, 'Order cancelled', { order });
};

module.exports = { placeOrder, getOrders, getOrder, cancelOrder };
