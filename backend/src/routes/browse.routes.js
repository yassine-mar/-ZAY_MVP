'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const browseController = require('../controllers/browse.controller');

const router = express.Router();

router.get('/sellers', asyncHandler(browseController.getSellers));
router.get('/sellers/:id', asyncHandler(browseController.getSellerProfile));
router.get('/items', asyncHandler(browseController.getItems));
router.get('/items/featured', asyncHandler(browseController.getFeaturedItems));
router.get('/categories', asyncHandler(browseController.getCategories));

module.exports = router;
