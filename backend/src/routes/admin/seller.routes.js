'use strict';

const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const { approveSellerSchema, rejectSellerSchema, suspendSchema } = require('../../validators/admin.validators');
const adminSellerController = require('../../controllers/admin/seller.controller');

const router = express.Router();

router.get('/', asyncHandler(adminSellerController.getSellers));
router.get('/:id', asyncHandler(adminSellerController.getSellerDetail));
router.patch('/:id/approve', validate(approveSellerSchema), asyncHandler(adminSellerController.approveSeller));
router.patch('/:id/reject', validate(rejectSellerSchema), asyncHandler(adminSellerController.rejectSeller));
router.patch('/:id/suspend', validate(suspendSchema), asyncHandler(adminSellerController.suspendSeller));

module.exports = router;
