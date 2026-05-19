'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const {
  registerSchema,
  registerSellerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} = require('../validators/auth.validators');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Public auth surface — all rate-limited at 10 req / 15 min / IP.
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(authController.register)
);
router.post(
  '/register/seller',
  authLimiter,
  validate(registerSellerSchema),
  asyncHandler(authController.registerSeller)
);
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login));

// Refresh is rate-limited too — refresh-token brute force is a real attack vector.
router.post(
  '/refresh',
  authLimiter,
  validate(refreshSchema),
  asyncHandler(authController.refresh)
);

// Logout requires a valid access token. The refresh_token body field is
// optional but recommended — sending it lets the server invalidate the
// refresh token immediately rather than waiting for natural expiry.
router.post(
  '/logout',
  authenticate,
  validate(logoutSchema),
  asyncHandler(authController.logout)
);

module.exports = router;
