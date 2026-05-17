'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const healthController = require('../controllers/health.controller');

const router = express.Router();

router.get('/', asyncHandler(healthController.healthCheck));

module.exports = router;
