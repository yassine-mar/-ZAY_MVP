'use strict';

const ItemModel = require('../models/item.model');
const MenuModel = require('../models/menu.model');
const CategoryModel = require('../models/category.model');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const UploadService = require('./upload.service');

const assertMenuOwnership = (menu, sellerId) => {
  if (!menu || menu.seller_id !== sellerId) {
    throw new AppError(404, 'NOT_FOUND', 'Menu not found');
  }
};

const assertItemOwnership = (item, sellerId) => {
  if (!item || item.seller_id !== sellerId) {
    throw new AppError(404, 'NOT_FOUND', 'Item not found');
  }
};

/**
 * Validate that a category exists AND is active. Inactive categories
 * cannot accept new items (but existing items keep their category reference).
 */
const assertCategoryUsable = async (categoryId) => {
  const category = await CategoryModel.findById(categoryId);
  if (!category || !category.is_active) {
    throw new AppError(
      400,
      'INVALID_CATEGORY',
      'Selected category does not exist or is no longer active'
    );
  }
};

const getMenuItems = async (user, menuId) => {
  const menu = await MenuModel.findById(menuId);
  assertMenuOwnership(menu, user.sellerProfile.id);
  return ItemModel.findByMenuId(menuId);
};

const addItem = async (user, menuId, itemData) => {
  const menu = await MenuModel.findById(menuId);
  assertMenuOwnership(menu, user.sellerProfile.id);
  await assertCategoryUsable(itemData.category_id);

  const item = await ItemModel.create({
    menuId,
    categoryId: itemData.category_id,
    name: String(itemData.name).trim(),
    description: itemData.description ? String(itemData.description).trim() : null,
    price: itemData.price,
    prepTimeMin: itemData.prep_time_min,
    isAvailable: itemData.is_available,
  });
  logger.info('Item added', { itemId: item.id, menuId, sellerId: user.sellerProfile.id });
  return item;
};

const getItem = async (user, itemId) => {
  const item = await ItemModel.findByIdWithSeller(itemId);
  assertItemOwnership(item, user.sellerProfile.id);
  return item;
};

const updateItem = async (user, itemId, fields) => {
  const item = await ItemModel.findByIdWithSeller(itemId);
  assertItemOwnership(item, user.sellerProfile.id);

  // Recheck category usability if it's being changed.
  if (fields.category_id !== undefined && fields.category_id !== item.category_id) {
    await assertCategoryUsable(fields.category_id);
  }

  const patch = {};
  if (fields.name !== undefined) patch.name = String(fields.name).trim();
  if (fields.description !== undefined) {
    patch.description = fields.description ? String(fields.description).trim() : null;
  }
  if (fields.price !== undefined) patch.price = fields.price;
  if (fields.category_id !== undefined) patch.category_id = fields.category_id;
  if (fields.prep_time_min !== undefined) patch.prep_time_min = fields.prep_time_min;
  if (fields.is_available !== undefined) patch.is_available = fields.is_available;

  const updated = await ItemModel.update(itemId, patch);
  if (!updated) throw new AppError(404, 'NOT_FOUND', 'Item not found');
  return updated;
};

const deleteItem = async (user, itemId) => {
  const item = await ItemModel.findByIdWithSeller(itemId);
  assertItemOwnership(item, user.sellerProfile.id);
  await ItemModel.softDelete(itemId);
  logger.info('Item deleted', { itemId, sellerId: user.sellerProfile.id });
};

const toggleAvailability = async (user, itemId, isAvailable) => {
  const item = await ItemModel.findByIdWithSeller(itemId);
  assertItemOwnership(item, user.sellerProfile.id);
  return ItemModel.toggleAvailability(itemId, Boolean(isAvailable));
};

const uploadItemImage = async (user, itemId, file) => {
  if (!file || !file.buffer) {
    throw new AppError(400, 'BAD_REQUEST', 'No image file provided');
  }

  const item = await ItemModel.findByIdWithSeller(itemId);
  assertItemOwnership(item, user.sellerProfile.id);

  const previousPublicId = item.image_public_id;

  const { secure_url, public_id } = await UploadService.uploadImage(file.buffer, 'items');
  await ItemModel.updateImage(itemId, { imageUrl: secure_url, imagePublicId: public_id });

  // Fire-and-forget cleanup of the previous Cloudinary asset.
  if (previousPublicId) {
    UploadService.deleteImage(previousPublicId).catch((err) => {
      logger.warn('Old item image cleanup failed', {
        previousPublicId,
        error: err.message,
      });
    });
  }

  logger.info('Item image uploaded', { itemId, sellerId: user.sellerProfile.id });
  return { image_url: secure_url, image_public_id: public_id };
};

module.exports = {
  getMenuItems,
  addItem,
  getItem,
  updateItem,
  deleteItem,
  toggleAvailability,
  uploadItemImage,
};
