'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { registerSchema, registerSellerSchema, loginSchema } = require('../validators/auth.validators');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(authController.register));
router.post('/register/seller', authLimiter, validate(registerSellerSchema), asyncHandler(authController.registerSeller));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login));
router.post('/logout', authenticate, asyncHandler(authController.logout));

module.exports = router;
