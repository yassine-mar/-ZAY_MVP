'use strict';

const MenuModel = require('../models/menu.model');
const AppError = require('../utils/AppError');

const assertOwnership = (menu, sellerId) => {
  if (!menu || menu.seller_id !== sellerId) {
    throw new AppError(404, 'NOT_FOUND', 'Menu not found');
  }
};

/** @returns {Promise<object[]>} */
const getMenus = async (user) => {
  // TODO: MenuModel.findBySellerId(user.sellerProfile.id)
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} */
const createMenu = async (user, { name, description }) => {
  // TODO: MenuModel.create({ sellerId: user.sellerProfile.id, name, description })
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} */
const getMenu = async (user, menuId) => {
  // TODO: MenuModel.findById(menuId), assertOwnership
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} */
const updateMenu = async (user, menuId, fields) => {
  // TODO: fetch + assertOwnership, MenuModel.update
  throw new Error('Not implemented');
};

/** @returns {Promise<void>} */
const deleteMenu = async (user, menuId) => {
  // TODO: fetch + assertOwnership, MenuModel.softDelete
  throw new Error('Not implemented');
};

module.exports = { getMenus, createMenu, getMenu, updateMenu, deleteMenu };
