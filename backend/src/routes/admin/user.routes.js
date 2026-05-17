'use strict';

const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const { suspendSchema } = require('../../validators/admin.validators');
const adminUserController = require('../../controllers/admin/user.controller');

const router = express.Router();

router.get('/', asyncHandler(adminUserController.getUsers));
router.get('/:id', asyncHandler(adminUserController.getUserDetail));
router.patch('/:id/suspend', validate(suspendSchema), asyncHandler(adminUserController.suspendUser));

module.exports = router;
