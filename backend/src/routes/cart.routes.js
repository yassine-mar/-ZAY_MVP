'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { validateCartSchema } = require('../validators/cart.validators');
const cartController = require('../controllers/cart.controller');

const router = express.Router();

/**
 * Cart validation is a CUSTOMER concern (the seller never has a cart).
 * The global rate limiter applies — no separate cart limiter needed.
 * Read-only at the DB layer (no writes), so cheap to call before checkout.
 */
router.use(authenticate, requireRole('customer'));

router.post(
  '/validate',
  validate(validateCartSchema),
  asyncHandler(cartController.validateCart)
);

module.exports = router;
