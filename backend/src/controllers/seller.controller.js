'use strict';

const SellerService = require('../services/seller.service');
const OrderService = require('../services/order.service');
const { sendSuccess, sendPaginated } = require('../utils/response');

const getProfile = async (req, res) => {
  const profile = await SellerService.getProfile(req.user);
  sendSuccess(res, 200, 'Profile fetched', { profile });
};

const updateProfile = async (req, res) => {
  const profile = await SellerService.updateProfile(req.user, req.body);
  sendSuccess(res, 200, 'Profile updated', { profile });
};

const toggleAvailability = async (req, res) => {
  const profile = await SellerService.toggleAvailability(req.user, req.body.is_open);
  sendSuccess(res, 200, `Shop is now ${req.body.is_open ? 'open' : 'closed'}`, { profile });
};

const getAnalytics = async (req, res) => {
  const analytics = await SellerService.getAnalytics(req.user);
  sendSuccess(res, 200, 'Analytics fetched', { analytics });
};

const getOrders = async (req, res) => {
  const { items, pagination } = await OrderService.getOrdersBySeller(req.user, req.query);
  sendPaginated(res, 'Orders fetched', items, pagination);
};

const getOrderDetail = async (req, res) => {
  const order = await OrderService.getOrderById(req.params.id, req.user);
  sendSuccess(res, 200, 'Order fetched', { order });
};

const updateOrderStatus = async (req, res) => {
  const order = await OrderService.updateOrderStatus(req.params.id, req.user, req.body);
  sendSuccess(res, 200, `Order status updated to ${req.body.status}`, { order });
};

const cancelOrder = async (req, res) => {
  const order = await OrderService.cancelOrderBySeller(req.params.id, req.user, req.body);
  sendSuccess(res, 200, 'Order cancelled', { order });
};

const getOrderHistory = async (req, res) => {
  const history = await OrderService.getOrderStatusHistory(req.params.id, req.user);
  sendSuccess(res, 200, 'Status history fetched', { history });
};

module.exports = {
  getProfile, updateProfile, toggleAvailability, getAnalytics,
  getOrders, getOrderDetail, updateOrderStatus, cancelOrder, getOrderHistory,
};
