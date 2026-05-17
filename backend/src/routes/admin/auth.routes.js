'use strict';

const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const { authLimiter } = require('../../middleware/rateLimiter');
const validate = require('../../middleware/validate');
const { loginSchema } = require('../../validators/auth.validators');
const adminAuthController = require('../../controllers/admin/auth.controller');

const router = express.Router();

router.post('/login', authLimiter, validate(loginSchema), asyncHandler(adminAuthController.adminLogin));

module.exports = router;
