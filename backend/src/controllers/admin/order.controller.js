'use strict';

const AdminOrderService = require('../../services/admin/order.admin.service');
const { sendSuccess, sendPaginated } = require('../../utils/response');

const getOrders = async (req, res) => {
  const { items, pagination } = await AdminOrderService.getOrders(req.query);
  sendPaginated(res, 'Orders fetched', items, pagination);
};

const getOrderDetail = async (req, res) => {
  const order = await AdminOrderService.getOrderDetail(req.params.id);
  sendSuccess(res, 200, 'Order fetched', { order });
};

const forceCancelOrder = async (req, res) => {
  const order = await AdminOrderService.forceCancelOrder(req.params.id, req.body.reason);
  sendSuccess(res, 200, 'Order cancelled', { order });
};

module.exports = { getOrders, getOrderDetail, forceCancelOrder };
