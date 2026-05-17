'use strict';

const SellerModel = require('../../models/seller.model');
const AppError = require('../../utils/AppError');
const NotificationService = require('../notification.service');
const { serializeSellerAdmin } = require('../../utils/serializers/seller.serializer');
const { parsePaginationParams, buildPaginationMeta } = require('../../utils/pagination');

/** @returns {Promise<{ items, pagination }>} */
const getSellers = async (query) => {
  // TODO: parsePaginationParams, SellerModel.findAll with status/city filter, serialize
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} full seller detail for admin */
const getSellerDetail = async (sellerId) => {
  // TODO: SellerModel.findById(sellerId) → throw 404 if not found
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} approved seller */
const approveSeller = async (sellerId, note) => {
  // TODO:
  // 1. SellerModel.findById → throw 404
  // 2. If status !== 'pending': throw AppError(422, 'UNPROCESSABLE', 'Seller is not pending approval')
  // 3. SellerModel.approve(sellerId)
  // 4. NotificationService.notifySellerApproved({ userId: seller.user_id })
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} rejected seller */
const rejectSeller = async (sellerId, reason) => {
  // TODO: SellerModel.reject, NotificationService.notifySellerRejected
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} suspended seller */
const suspendSeller = async (sellerId, reason) => {
  // TODO: SellerModel.suspend
  throw new Error('Not implemented');
};

module.exports = { getSellers, getSellerDetail, approveSeller, rejectSeller, suspendSeller };
