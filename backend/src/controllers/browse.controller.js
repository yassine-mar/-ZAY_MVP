'use strict';

const BrowseService = require('../services/browse.service');
const { sendSuccess, sendPaginated } = require('../utils/response');

const getSellers = async (req, res) => {
  const { items, pagination } = await BrowseService.getSellers(req.query);
  sendPaginated(res, 'Sellers fetched', items, pagination);
};

const getSellerProfile = async (req, res) => {
  const seller = await BrowseService.getSellerProfile(req.params.id);
  sendSuccess(res, 200, 'Seller profile fetched', { seller });
};

const getItems = async (req, res) => {
  const { items, pagination } = await BrowseService.getItems(req.query);
  sendPaginated(res, 'Items fetched', items, pagination);
};

const getFeaturedItems = async (req, res) => {
  const items = await BrowseService.getFeaturedItems();
  sendSuccess(res, 200, 'Featured items fetched', { items });
};

const getCategories = async (req, res) => {
  const categories = await BrowseService.getCategories();
  sendSuccess(res, 200, 'Categories fetched', { categories });
};

module.exports = { getSellers, getSellerProfile, getItems, getFeaturedItems, getCategories };
