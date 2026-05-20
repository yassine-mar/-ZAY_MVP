'use strict';

const SellerService = require('../services/seller.service');
const OrderService = require('../services/order.service');
const { sendOk, sendPaginated } = require('../utils/response');
const { serializeOrder } = require('../utils/serializers/order.serializer');

/* ── Seller profile (stubs — implemented in seller management step) ──── */

const getProfile = async (req, res) => {
  const profile = await SellerService.getProfile(req.user);
  sendOk(res, 'Profile fetched', { profile });
};

const updateProfile = async (req, res) => {
  const profile = await SellerService.updateProfile(req.user, req.body);
  sendOk(res, 'Profile updated', { profile });
};

const toggleAvailability = async (req, res) => {
  const profile = await SellerService.toggleAvailability(req.user, req.body.is_open);
  sendOk(res, `Shop is now ${req.body.is_open ? 'open' : 'closed'}`, { profile });
};

const getAnalytics = async (req, res) => {
  const analytics = await SellerService.getAnalytics(req.user);
  sendOk(res, 'Analytics fetched', { analytics });
};

/* ── Seller order endpoints (real — backed by OrderService) ───────────── */

const getOrders = async (req, res) => {
  const { items, pagination } = await OrderService.getOrdersBySeller(req.user, req.query);
  sendPaginated(
    res,
    'Orders fetched',
    items.map((o) => serializeOrder(o, { audience: 'seller' })),
    pagination
  );
};

const getOrderDetail = async (req, res) => {
  const order = await OrderService.getOrderById(req.params.id, req.user);
  sendOk(res, 'Order fetched', {
    order: serializeOrder(order, { audience: 'seller' }),
  });
};

const updateOrderStatus = async (req, res) => {
  const order = await OrderService.updateOrderStatus(req.params.id, req.user, req.body);
  sendOk(res, `Order status updated to ${req.body.status}`, {
    order: serializeOrder(order, { audience: 'seller' }),
  });
};

const cancelOrder = async (req, res) => {
  const order = await OrderService.cancelOrderBySeller(req.params.id, req.user, req.body);
  sendOk(res, 'Order cancelled', {
    order: serializeOrder(order, { audience: 'seller' }),
  });
};

const getOrderHistory = async (req, res) => {
  const history = await OrderService.getOrderStatusHistory(req.params.id, req.user);
  sendOk(res, 'Status history fetched', { history });
};

module.exports = {
  getProfile, updateProfile, toggleAvailability, getAnalytics,
  getOrders, getOrderDetail, updateOrderStatus, cancelOrder, getOrderHistory,
};
