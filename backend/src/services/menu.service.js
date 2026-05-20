'use strict';

const MenuModel = require('../models/menu.model');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * 404 (not 403) on ownership mismatch — same as elsewhere in the codebase.
 * No enumeration leak.
 */
const assertOwnership = (menu, sellerId) => {
  if (!menu || menu.seller_id !== sellerId) {
    throw new AppError(404, 'NOT_FOUND', 'Menu not found');
  }
};

const getMenus = async (user) => MenuModel.findBySellerId(user.sellerProfile.id);

const createMenu = async (user, { name, description, sort_order }) => {
  const menu = await MenuModel.create({
    sellerId: user.sellerProfile.id,
    name: String(name).trim(),
    description: description ? String(description).trim() : null,
    sortOrder: sort_order ?? 0,
  });
  logger.info('Menu created', { menuId: menu.id, sellerId: user.sellerProfile.id });
  return menu;
};

const getMenu = async (user, menuId) => {
  const menu = await MenuModel.findById(menuId);
  assertOwnership(menu, user.sellerProfile.id);
  return menu;
};

const updateMenu = async (user, menuId, fields) => {
  const menu = await MenuModel.findById(menuId);
  assertOwnership(menu, user.sellerProfile.id);

  const patch = {};
  if (fields.name !== undefined) patch.name = String(fields.name).trim();
  if (fields.description !== undefined) {
    patch.description = fields.description ? String(fields.description).trim() : null;
  }
  if (fields.sort_order !== undefined) patch.sort_order = fields.sort_order;

  const updated = await MenuModel.update(menuId, patch);
  if (!updated) throw new AppError(404, 'NOT_FOUND', 'Menu not found');
  return updated;
};

const deleteMenu = async (user, menuId) => {
  const menu = await MenuModel.findById(menuId);
  assertOwnership(menu, user.sellerProfile.id);
  await MenuModel.softDelete(menuId);
  logger.info('Menu deleted', { menuId, sellerId: user.sellerProfile.id });
};

module.exports = { getMenus, createMenu, getMenu, updateMenu, deleteMenu };
