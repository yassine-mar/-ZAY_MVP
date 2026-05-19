'use strict';

const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} = require('../../validators/admin.validators');
const adminCategoryController = require('../../controllers/admin/category.controller');

/**
 * Admin authentication is applied at the parent router (src/routes/admin/index.js),
 * so every handler here can assume the caller is an authenticated admin.
 */
const router = express.Router();

router.get('/', asyncHandler(adminCategoryController.getCategories));
router.post('/', validate(createCategorySchema), asyncHandler(adminCategoryController.createCategory));
router.put('/:id', validate(updateCategorySchema), asyncHandler(adminCategoryController.updateCategory));
router.delete(
  '/:id',
  validate(categoryIdParamSchema),
  asyncHandler(adminCategoryController.deleteCategory)
);

module.exports = router;
