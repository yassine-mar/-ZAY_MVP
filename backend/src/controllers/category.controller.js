'use strict';

const CategoryService = require('../services/category.service');
const { sendOk } = require('../utils/response');
const { serializeCategory } = require('../utils/serializers/category.serializer');

const getCategories = async (_req, res) => {
  const categories = await CategoryService.listActive();
  sendOk(res, 'Categories fetched', {
    categories: categories.map(serializeCategory),
  });
};

module.exports = { getCategories };
