'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const {
  browseItemsQuerySchema,
  browseSellerProfileParamSchema,
  browseFeaturedQuerySchema,
} = require('../validators/browse.validators');
const browseController = require('../controllers/browse.controller');

const router = express.Router();

/**
 * Public browse endpoints — no authentication required.
 */
router.get('/sellers', asyncHandler(browseController.getSellers));
router.get(
  '/sellers/:id',
  validate(browseSellerProfileParamSchema),
  asyncHandler(browseController.getSellerProfile)
);

// IMPORTANT: more specific routes BEFORE wildcard ones.
router.get(
  '/items/featured',
  validate(browseFeaturedQuerySchema),
  asyncHandler(browseController.getFeaturedItems)
);
router.get(
  '/items',
  validate(browseItemsQuerySchema),
  asyncHandler(browseController.getItems)
);

router.get('/categories', asyncHandler(browseController.getCategories));

module.exports = router;
