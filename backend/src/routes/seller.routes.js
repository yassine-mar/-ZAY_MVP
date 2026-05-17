'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const requireApprovedSeller = require('../middleware/requireApprovedSeller');
const validate = require('../middleware/validate');
const { updateSellerProfileSchema, toggleAvailabilitySchema, sellerOrdersQuerySchema } = require('../validators/seller.validators');
const { updateOrderStatusSchema, cancelOrderSchema } = require('../validators/order.validators');
const sellerController = require('../controllers/seller.controller');

const router = express.Router();

router.use(authenticate, requireRole('seller'));

router.get('/profile', asyncHandler(sellerController.getProfile));
router.put('/profile', requireApprovedSeller, validate(updateSellerProfileSchema), asyncHandler(sellerController.updateProfile));
router.patch('/profile/availability', requireApprovedSeller, validate(toggleAvailabilitySchema), asyncHandler(sellerController.toggleAvailability));
router.get('/analytics', requireApprovedSeller, asyncHandler(sellerController.getAnalytics));

router.get('/orders', requireApprovedSeller, validate(sellerOrdersQuerySchema), asyncHandler(sellerController.getOrders));
router.get('/orders/:id', requireApprovedSeller, asyncHandler(sellerController.getOrderDetail));
router.patch('/orders/:id/status', requireApprovedSeller, validate(updateOrderStatusSchema), asyncHandler(sellerController.updateOrderStatus));
router.patch('/orders/:id/cancel', requireApprovedSeller, validate(cancelOrderSchema), asyncHandler(sellerController.cancelOrder));
router.get('/orders/:id/history', requireApprovedSeller, asyncHandler(sellerController.getOrderHistory));

module.exports = router;
