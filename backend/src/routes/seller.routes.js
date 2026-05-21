'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const requireApprovedSeller = require('../middleware/requireApprovedSeller');
const validate = require('../middleware/validate');
const { upload, handleMulterError } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');
const {
  updateSellerProfileSchema,
  toggleAvailabilitySchema,
  sellerOrdersQuerySchema,
} = require('../validators/seller.validators');
const { updateOrderStatusSchema, cancelOrderSchema } = require('../validators/order.validators');
const sellerController = require('../controllers/seller.controller');

const router = express.Router();

/**
 * All /seller/* routes require a seller account (any status).
 * Approved-only operations layer requireApprovedSeller on top.
 *
 * Onboarding-friendly design:
 *   - Pending sellers CAN read their profile, upload avatar/banner.
 *   - Pending sellers CANNOT update profile fields, toggle open, accept orders.
 *   - Approved-only: PUT /profile, PATCH availability, all order operations.
 */
router.use(authenticate, requireRole('seller'));

// Profile — visible at any status (so pending sellers see their "Awaiting approval" state)
router.get('/profile', asyncHandler(sellerController.getProfile));

// Visual identity — uploadable while pending (pre-stage assets while waiting for review)
router.post(
  '/profile/avatar',
  uploadLimiter,
  upload.single('avatar'),
  handleMulterError,
  asyncHandler(sellerController.uploadAvatar)
);
router.post(
  '/profile/banner',
  uploadLimiter,
  upload.single('banner'),
  handleMulterError,
  asyncHandler(sellerController.uploadBanner)
);

// Mutating profile fields — approved sellers only
router.put(
  '/profile',
  requireApprovedSeller,
  validate(updateSellerProfileSchema),
  asyncHandler(sellerController.updateProfile)
);
router.patch(
  '/profile/availability',
  requireApprovedSeller,
  validate(toggleAvailabilitySchema),
  asyncHandler(sellerController.toggleAvailability)
);

router.get('/analytics', requireApprovedSeller, asyncHandler(sellerController.getAnalytics));

// Order management — approved sellers only
router.get('/orders', requireApprovedSeller, validate(sellerOrdersQuerySchema), asyncHandler(sellerController.getOrders));
router.get('/orders/:id', requireApprovedSeller, asyncHandler(sellerController.getOrderDetail));
router.patch('/orders/:id/status', requireApprovedSeller, validate(updateOrderStatusSchema), asyncHandler(sellerController.updateOrderStatus));
router.patch('/orders/:id/cancel', requireApprovedSeller, validate(cancelOrderSchema), asyncHandler(sellerController.cancelOrder));
router.get('/orders/:id/history', requireApprovedSeller, asyncHandler(sellerController.getOrderHistory));

module.exports = router;
