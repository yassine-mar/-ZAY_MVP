'use strict';

const MenuService = require('../services/menu.service');
const { sendSuccess } = require('../utils/response');

const getMenus = async (req, res) => {
  const menus = await MenuService.getMenus(req.user);
  sendSuccess(res, 200, 'Menus fetched', { menus });
};

const createMenu = async (req, res) => {
  const menu = await MenuService.createMenu(req.user, req.body);
  sendSuccess(res, 201, 'Menu created', { menu });
};

const getMenu = async (req, res) => {
  const menu = await MenuService.getMenu(req.user, req.params.id);
  sendSuccess(res, 200, 'Menu fetched', { menu });
};

const updateMenu = async (req, res) => {
  const menu = await MenuService.updateMenu(req.user, req.params.id, req.body);
  sendSuccess(res, 200, 'Menu updated', { menu });
};

const deleteMenu = async (req, res) => {
  await MenuService.deleteMenu(req.user, req.params.id);
  sendSuccess(res, 200, 'Menu deleted', {});
};

module.exports = { getMenus, createMenu, getMenu, updateMenu, deleteMenu };
