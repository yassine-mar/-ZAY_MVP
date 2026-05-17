'use strict';

const CategoryModel = require('../../models/category.model');
const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/response');

const getCategories = async (req, res) => {
  const categories = await CategoryModel.findAllAdmin();
  sendSuccess(res, 200, 'Categories fetched', { categories });
};

const createCategory = async (req, res) => {
  // TODO: Service layer for uniqueness check on slug
  const category = await CategoryModel.create(req.body);
  sendSuccess(res, 201, 'Category created', { category });
};

const updateCategory = async (req, res) => {
  const category = await CategoryModel.update(req.params.id, req.body);
  if (!category) throw new AppError(404, 'NOT_FOUND', 'Category not found');
  sendSuccess(res, 200, 'Category updated', { category });
};

const deleteCategory = async (req, res) => {
  await CategoryModel.deactivate(req.params.id);
  sendSuccess(res, 200, 'Category deactivated', {});
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
