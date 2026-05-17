'use strict';

const ItemService = require('../services/item.service');
const { sendSuccess } = require('../utils/response');
const { serializeMenuItem } = require('../utils/serializers/item.serializer');

const addItem = async (req, res) => {
  const item = await ItemService.addItem(req.user, req.params.menuId, req.body);
  sendSuccess(res, 201, 'Item added', { item: serializeMenuItem(item) });
};

const getItem = async (req, res) => {
  const item = await ItemService.getItem(req.user, req.params.id);
  sendSuccess(res, 200, 'Item fetched', { item: serializeMenuItem(item) });
};

const updateItem = async (req, res) => {
  const item = await ItemService.updateItem(req.user, req.params.id, req.body);
  sendSuccess(res, 200, 'Item updated', { item: serializeMenuItem(item) });
};

const deleteItem = async (req, res) => {
  await ItemService.deleteItem(req.user, req.params.id);
  sendSuccess(res, 200, 'Item deleted', {});
};

const toggleAvailability = async (req, res) => {
  const item = await ItemService.toggleAvailability(req.user, req.params.id, req.body.is_available);
  sendSuccess(res, 200, `Item is now ${req.body.is_available ? 'available' : 'unavailable'}`, { item: serializeMenuItem(item) });
};

const uploadImage = async (req, res) => {
  const { image_url, image_public_id } = await ItemService.uploadItemImage(req.user, req.params.id, req.file);
  sendSuccess(res, 200, 'Image uploaded', { image_url, image_public_id });
};

module.exports = { addItem, getItem, updateItem, deleteItem, toggleAvailability, uploadImage };
