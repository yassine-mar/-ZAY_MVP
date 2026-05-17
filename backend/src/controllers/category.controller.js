'use strict';

const CategoryService = require('../services/category.service');
const { sendSuccess } = require('../utils/response');

const getCategories = async (req, res) => {
  const categories = await CategoryService.getCategories();
  sendSuccess(res, 200, 'Categories fetched', { categories });
};

module.exports = { getCategories };
