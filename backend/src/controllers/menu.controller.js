'use strict';

const MenuService = require('../services/menu.service');
const ItemService = require('../services/item.service');
const { sendOk, sendCreated } = require('../utils/response');
const { serializeMenu, serializeMenuWithItems } = require('../utils/serializers/menu.serializer');
const { serializeMenuItem } = require('../utils/serializers/item.serializer');

const getMenus = async (req, res) => {
  const menus = await MenuService.getMenus(req.user);
  sendOk(res, 'Menus fetched', { menus: menus.map(serializeMenu) });
};

const createMenu = async (req, res) => {
  const menu = await MenuService.createMenu(req.user, req.body);
  sendCreated(res, 'Menu created', { menu: serializeMenu(menu) });
};

const getMenu = async (req, res) => {
  const menu = await MenuService.getMenu(req.user, req.params.id);
  sendOk(res, 'Menu fetched', { menu: serializeMenu(menu) });
};

const updateMenu = async (req, res) => {
  const menu = await MenuService.updateMenu(req.user, req.params.id, req.body);
  sendOk(res, 'Menu updated', { menu: serializeMenu(menu) });
};

const deleteMenu = async (req, res) => {
  await MenuService.deleteMenu(req.user, req.params.id);
  sendOk(res, 'Menu deleted');
};

/* ── Nested items endpoints (live here because route is /menus/:menuId/items) ── */

const getMenuItems = async (req, res) => {
  const items = await ItemService.getMenuItems(req.user, req.params.menuId);
  sendOk(res, 'Items fetched', { items: items.map(serializeMenuItem) });
};

const addItemToMenu = async (req, res) => {
  const item = await ItemService.addItem(req.user, req.params.menuId, req.body);
  sendCreated(res, 'Item added', { item: serializeMenuItem(item) });
};

module.exports = {
  getMenus,
  createMenu,
  getMenu,
  updateMenu,
  deleteMenu,
  getMenuItems,
  addItemToMenu,
};
