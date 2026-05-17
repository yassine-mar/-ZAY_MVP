'use strict';

const AdminSellerService = require('../../services/admin/seller.admin.service');
const { sendSuccess, sendPaginated } = require('../../utils/response');

const getSellers = async (req, res) => {
  const { items, pagination } = await AdminSellerService.getSellers(req.query);
  sendPaginated(res, 'Sellers fetched', items, pagination);
};

const getSellerDetail = async (req, res) => {
  const seller = await AdminSellerService.getSellerDetail(req.params.id);
  sendSuccess(res, 200, 'Seller fetched', { seller });
};

const approveSeller = async (req, res) => {
  const seller = await AdminSellerService.approveSeller(req.params.id, req.body.note);
  sendSuccess(res, 200, 'Seller approved successfully', { seller });
};

const rejectSeller = async (req, res) => {
  const seller = await AdminSellerService.rejectSeller(req.params.id, req.body.reason);
  sendSuccess(res, 200, 'Seller rejected', { seller });
};

const suspendSeller = async (req, res) => {
  const seller = await AdminSellerService.suspendSeller(req.params.id, req.body.reason);
  sendSuccess(res, 200, 'Seller suspended', { seller });
};

module.exports = { getSellers, getSellerDetail, approveSeller, rejectSeller, suspendSeller };
