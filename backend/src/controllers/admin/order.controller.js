'use strict';

const OrderAdminService = require('../../services/admin/order.admin.service');
const { sendOk, sendPaginated } = require('../../utils/response');
const { serializeOrder } = require('../../utils/serializers/order.serializer');

const getOrders = async (req, res) => {
  const { items, pagination } = await OrderAdminService.listAll(req.query);
  sendPaginated(
    res,
    'Orders fetched',
    items.map((o) => serializeOrder(o, { audience: 'seller' })),
    pagination
  );
};

const getOrderDetail = async (req, res) => {
  const { order, history } = await OrderAdminService.getOrderDetail(req.params.id);
  sendOk(res, 'Order fetched', {
    order: serializeOrder(order, { audience: 'seller' }),
    history,
  });
};

const forceCancelOrder = async (req, res) => {
  const order = await OrderAdminService.forceCancelOrder(
    req.params.id,
    req.adminId,
    req.body.reason
  );
  sendOk(res, 'Order cancelled', {
    order: serializeOrder(order, { audience: 'seller' }),
  });
};

module.exports = { getOrders, getOrderDetail, forceCancelOrder };
