'use strict';

const ItemModel = require('../models/item.model');
const MenuModel = require('../models/menu.model');
const AppError = require('../utils/AppError');
const UploadService = require('./upload.service');
const { serializeMenuItem } = require('../utils/serializers/item.serializer');

const assertItemOwnership = async (itemId, sellerId) => {
  // TODO: fetch item → fetch menu → verify menu.seller_id === sellerId
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} */
const addItem = async (user, menuId, itemData) => {
  // TODO: verify menu ownership, ItemModel.create({ menuId, ...itemData })
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} */
const getItem = async (user, itemId) => {
  // TODO: fetch item + assertItemOwnership
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} */
const updateItem = async (user, itemId, fields) => {
  // TODO: assertItemOwnership, ItemModel.update
  throw new Error('Not implemented');
};

/** @returns {Promise<void>} */
const deleteItem = async (user, itemId) => {
  // TODO: assertItemOwnership, ItemModel.softDelete
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} */
const toggleAvailability = async (user, itemId, isAvailable) => {
  // TODO: assertItemOwnership, ItemModel.toggleAvailability
  throw new Error('Not implemented');
};

/** @returns {Promise<{ image_url: string, image_public_id: string }>} */
const uploadItemImage = async (user, itemId, file) => {
  // TODO:
  // 1. assertItemOwnership
  // 2. Fetch current item to get existing public_id
  // 3. UploadService.uploadImage(file.buffer, 'items')
  // 4. If previous image: UploadService.deleteImage(prevPublicId) [non-blocking]
  // 5. ItemModel.updateImage(itemId, { imageUrl, imagePublicId })
  throw new Error('Not implemented');
};

module.exports = { addItem, getItem, updateItem, deleteItem, toggleAvailability, uploadItemImage };
