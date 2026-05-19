'use strict';

const CategoryAdminService = require('../../services/admin/category.admin.service');
const { sendOk, sendCreated } = require('../../utils/response');
const { serializeCategoryAdmin } = require('../../utils/serializers/category.serializer');

const getCategories = async (_req, res) => {
  const categories = await CategoryAdminService.listAll();
  sendOk(res, 'Categories fetched', {
    categories: categories.map(serializeCategoryAdmin),
  });
};

const createCategory = async (req, res) => {
  const category = await CategoryAdminService.create(req.body);
  sendCreated(res, 'Category created', { category: serializeCategoryAdmin(category) });
};

const updateCategory = async (req, res) => {
  const category = await CategoryAdminService.update(req.params.id, req.body);
  sendOk(res, 'Category updated', { category: serializeCategoryAdmin(category) });
};

const deleteCategory = async (req, res) => {
  const category = await CategoryAdminService.deactivate(req.params.id);
  sendOk(res, 'Category deactivated', { category: serializeCategoryAdmin(category) });
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
