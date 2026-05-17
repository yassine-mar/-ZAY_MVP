'use strict';

const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const adminAnalyticsController = require('../../controllers/admin/analytics.controller');

const router = express.Router();

router.get('/overview', asyncHandler(adminAnalyticsController.getOverview));
router.get('/orders', asyncHandler(adminAnalyticsController.getOrderTrends));
router.get('/sellers', asyncHandler(adminAnalyticsController.getTopSellers));

module.exports = router;
