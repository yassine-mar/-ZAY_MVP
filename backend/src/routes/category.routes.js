'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const categoryController = require('../controllers/category.controller');

const router = express.Router();

router.get('/', asyncHandler(categoryController.getCategories));

module.exports = router;
