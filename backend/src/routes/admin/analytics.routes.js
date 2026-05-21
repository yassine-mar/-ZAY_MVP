'use strict';

const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const {
  analyticsOrdersQuerySchema,
  analyticsSellersQuerySchema,
} = require('../../validators/admin.validators');
const adminAnalyticsController = require('../../controllers/admin/analytics.controller');

const router = express.Router();

router.get('/overview', asyncHandler(adminAnalyticsController.getOverview));
router.get(
  '/orders',
  validate(analyticsOrdersQuerySchema),
  asyncHandler(adminAnalyticsController.getOrderTrends)
);
router.get(
  '/sellers',
  validate(analyticsSellersQuerySchema),
  asyncHandler(adminAnalyticsController.getTopSellers)
);

module.exports = router;
