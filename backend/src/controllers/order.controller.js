'use strict';

const OrderService = require('../services/order.service');
const { sendOk, sendCreated, sendPaginated } = require('../utils/response');
const { serializeOrder } = require('../utils/serializers/order.serializer');

const placeOrder = async (req, res) => {
  // Idempotency-Key: optional, client-generated UUID. Replay returns the
  // same order without creating a duplicate (per API design critique #1).
  const idempotencyKey = req.headers['idempotency-key']
    || req.headers['x-idempotency-key']
    || null;

  const order = await OrderService.createOrder(req.user, req.body, { idempotencyKey });
  sendCreated(res, 'Order placed successfully', {
    order: serializeOrder(order, { includeSellerContact: true }),
  });
};

const getOrders = async (req, res) => {
  const { items, pagination } = await OrderService.getOrdersByCustomer(req.user, req.query);
  sendPaginated(
    res,
    'Orders fetched',
    items.map((o) => serializeOrder(o, { includeSellerContact: false })),
    pagination
  );
};

const getOrder = async (req, res) => {
  const order = await OrderService.getOrderById(req.params.id, req.user);
  // Customers see seller phone for accepted/preparing/ready (Amendment 3).
  sendOk(res, 'Order fetched', {
    order: serializeOrder(order, { includeSellerContact: req.user.role === 'customer' }),
  });
};

const cancelOrder = async (req, res) => {
  const order = await OrderService.cancelOrderByCustomer(req.params.id, req.user);
  sendOk(res, 'Order cancelled', {
    order: serializeOrder(order, { includeSellerContact: false }),
  });
};

module.exports = { placeOrder, getOrders, getOrder, cancelOrder };
