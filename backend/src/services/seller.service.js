'use strict';

const SellerModel = require('../models/seller.model');
const OrderModel = require('../models/order.model');
const AppError = require('../utils/AppError');
const { serializeSellerPrivate } = require('../utils/serializers/seller.serializer');

/** @returns {Promise<object>} seller's own profile */
const getProfile = async (user) => {
  // TODO: SellerModel.findByUserId(user.id), throw 404 if not found, return serialized
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} updated seller profile */
const updateProfile = async (user, fields) => {
  // TODO: SellerModel.update(user.sellerProfile.id, fields), return serialized
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} updated profile with new is_open value */
const toggleAvailability = async (user, isOpen) => {
  // TODO: SellerModel.update(user.sellerProfile.id, { is_open: isOpen })
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} analytics summary */
const getAnalytics = async (user) => {
  // TODO: aggregate queries for orders_count, revenue, top_items (last 30 days)
  throw new Error('Not implemented');
};

module.exports = { getProfile, updateProfile, toggleAvailability, getAnalytics };
