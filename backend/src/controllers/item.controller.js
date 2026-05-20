'use strict';

const ItemService = require('../services/item.service');
const { sendOk } = require('../utils/response');
const { serializeMenuItem } = require('../utils/serializers/item.serializer');

/**
 * NOTE: addItem (POST) is exposed at /menus/:menuId/items by menu.routes.js
 * — see menu.controller.addItemToMenu. This controller hosts the operations
 * keyed by item ID only.
 */

const getItem = async (req, res) => {
  const item = await ItemService.getItem(req.user, req.params.id);
  sendOk(res, 'Item fetched', { item: serializeMenuItem(item) });
};

const updateItem = async (req, res) => {
  const item = await ItemService.updateItem(req.user, req.params.id, req.body);
  sendOk(res, 'Item updated', { item: serializeMenuItem(item) });
};

const deleteItem = async (req, res) => {
  await ItemService.deleteItem(req.user, req.params.id);
  sendOk(res, 'Item deleted');
};

const toggleAvailability = async (req, res) => {
  const item = await ItemService.toggleAvailability(req.user, req.params.id, req.body.is_available);
  const stateLabel = req.body.is_available ? 'available' : 'unavailable';
  sendOk(res, `Item is now ${stateLabel}`, { item: serializeMenuItem(item) });
};

const uploadImage = async (req, res) => {
  const { image_url, image_public_id } = await ItemService.uploadItemImage(
    req.user,
    req.params.id,
    req.file
  );
  sendOk(res, 'Image uploaded', { image_url, image_public_id });
};

module.exports = { getItem, updateItem, deleteItem, toggleAvailability, uploadImage };
