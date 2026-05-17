'use strict';

const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const { createCategorySchema, updateCategorySchema } = require('../../validators/admin.validators');
const adminCategoryController = require('../../controllers/admin/category.controller');

const router = express.Router();

router.get('/', asyncHandler(adminCategoryController.getCategories));
router.post('/', validate(createCategorySchema), asyncHandler(adminCategoryController.createCategory));
router.put('/:id', validate(updateCategorySchema), asyncHandler(adminCategoryController.updateCategory));
router.delete('/:id', asyncHandler(adminCategoryController.deleteCategory));

module.exports = router;
