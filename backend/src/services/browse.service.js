'use strict';

const SellerModel = require('../models/seller.model');
const ItemModel = require('../models/item.model');
const CategoryModel = require('../models/category.model');
const { parsePaginationParams, buildPaginationMeta } = require('../utils/pagination');
const { serializeSellerPublic } = require('../utils/serializers/seller.serializer');
const { serializeMenuItemWithSeller } = require('../utils/serializers/item.serializer');

/** @returns {Promise<{ items, pagination }>} approved + open sellers */
const getSellers = async (query) => {
  // TODO: parsePaginationParams, SellerModel.findOpenInCity, serialize, buildPaginationMeta
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} full seller profile with menus and items */
const getSellerProfile = async (sellerId) => {
  // TODO:
  // 1. SellerModel.findById(sellerId)
  // 2. Verify status === 'approved' → throw AppError(404, 'NOT_FOUND') if not
  // 3. Fetch menus with their items (available + not deleted)
  // 4. Return serializeSellerPublic(seller) + menus
  throw new Error('Not implemented');
};

/** @returns {Promise<{ items, pagination }>} available menu items with filters */
const getItems = async (query) => {
  // TODO: parsePaginationParams, ItemModel.findAvailableForBrowse + countAvailableForBrowse (parallel), serialize
  throw new Error('Not implemented');
};

/** @returns {Promise<object[]>} top 20 items by order count */
const getFeaturedItems = async () => {
  // TODO: ItemModel.findFeatured(20), serialize
  throw new Error('Not implemented');
};

/** @returns {Promise<object[]>} active categories with item counts */
const getCategories = async () => {
  // TODO: CategoryModel.findAll() (with item count subquery or separate query)
  throw new Error('Not implemented');
};

module.exports = { getSellers, getSellerProfile, getItems, getFeaturedItems, getCategories };
