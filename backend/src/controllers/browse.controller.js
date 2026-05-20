'use strict';

const BrowseService = require('../services/browse.service');
const CategoryService = require('../services/category.service');
const { sendOk, sendPaginated } = require('../utils/response');
const {
  serializeMenuItemWithSeller,
} = require('../utils/serializers/item.serializer');
const { serializeCategory } = require('../utils/serializers/category.serializer');
const { serializeSellerPublic } = require('../utils/serializers/seller.serializer');
const { serializeMenuWithItems } = require('../utils/serializers/menu.serializer');
const { serializeMenuItem } = require('../utils/serializers/item.serializer');

const getItems = async (req, res) => {
  const { items, pagination } = await BrowseService.getItems(req.query);
  sendPaginated(res, 'Items fetched', items.map(serializeMenuItemWithSeller), pagination);
};

const getFeaturedItems = async (req, res) => {
  const items = await BrowseService.getFeaturedItems(req.query);
  sendOk(res, 'Featured items fetched', {
    items: items.map(serializeMenuItemWithSeller),
  });
};

const getCategories = async (_req, res) => {
  const categories = await CategoryService.listActive();
  sendOk(res, 'Categories fetched', { categories: categories.map(serializeCategory) });
};

const getSellers = async (req, res) => {
  // Defer to BrowseService; throws 501 NOT_IMPLEMENTED for now until the
  // seller feature step lands its real implementation.
  const result = await BrowseService.getSellers(req.query);
  sendPaginated(res, 'Sellers fetched', result.items, result.pagination);
};

const getSellerProfile = async (req, res) => {
  const { seller, menus } = await BrowseService.getSellerProfile(req.params.id);
  sendOk(res, 'Seller profile fetched', {
    seller: serializeSellerPublic(seller),
    menus: menus.map((m) => serializeMenuWithItems(m, serializeMenuItem)),
  });
};

module.exports = { getItems, getFeaturedItems, getCategories, getSellers, getSellerProfile };
