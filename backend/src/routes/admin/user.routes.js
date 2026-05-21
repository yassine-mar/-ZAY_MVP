'use strict';

const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const {
  suspendSchema,
  adminUsersQuerySchema,
  categoryIdParamSchema, // reused for generic UUID validation
} = require('../../validators/admin.validators');
const adminUserController = require('../../controllers/admin/user.controller');

const router = express.Router();

router.get(
  '/',
  validate(adminUsersQuerySchema),
  asyncHandler(adminUserController.getUsers)
);
router.get(
  '/:id',
  validate(categoryIdParamSchema),
  asyncHandler(adminUserController.getUserDetail)
);
router.patch(
  '/:id/suspend',
  validate(suspendSchema),
  asyncHandler(adminUserController.suspendUser)
);

module.exports = router;
