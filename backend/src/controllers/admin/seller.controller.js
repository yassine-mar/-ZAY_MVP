'use strict';

const SellerAdminService = require('../../services/admin/seller.admin.service');
const { sendOk, sendPaginated } = require('../../utils/response');
const { serializeSellerAdmin } = require('../../utils/serializers/seller.serializer');

const getSellers = async (req, res) => {
  const { items, pagination } = await SellerAdminService.listAll(req.query);
  sendPaginated(res, 'Sellers fetched', items.map(serializeSellerAdmin), pagination);
};

const getSellerDetail = async (req, res) => {
  const seller = await SellerAdminService.getSellerDetail(req.params.id);
  sendOk(res, 'Seller fetched', { seller: serializeSellerAdmin(seller) });
};

const approveSeller = async (req, res) => {
  const seller = await SellerAdminService.approveSeller(
    req.params.id,
    req.adminId,        // set by admin authenticate middleware
    req.body?.note
  );
  sendOk(res, 'Seller approved successfully', { seller: serializeSellerAdmin(seller) });
};

const rejectSeller = async (req, res) => {
  const seller = await SellerAdminService.rejectSeller(
    req.params.id,
    req.adminId,
    req.body.reason
  );
  sendOk(res, 'Seller rejected', { seller: serializeSellerAdmin(seller) });
};

const suspendSeller = async (req, res) => {
  const seller = await SellerAdminService.suspendSeller(
    req.params.id,
    req.adminId,
    req.body.reason
  );
  sendOk(res, 'Seller suspended', { seller: serializeSellerAdmin(seller) });
};

module.exports = { getSellers, getSellerDetail, approveSeller, rejectSeller, suspendSeller };
