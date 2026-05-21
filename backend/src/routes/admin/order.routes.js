'use strict';

const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const {
  adminOrdersQuerySchema,
  adminOrderIdParamSchema,
  forceCancelOrderSchema,
} = require('../../validators/admin.validators');
const adminOrderController = require('../../controllers/admin/order.controller');

const router = express.Router();

router.get(
  '/',
  validate(adminOrdersQuerySchema),
  asyncHandler(adminOrderController.getOrders)
);
router.get(
  '/:id',
  validate(adminOrderIdParamSchema),
  asyncHandler(adminOrderController.getOrderDetail)
);
router.patch(
  '/:id/cancel',
  validate(forceCancelOrderSchema),
  asyncHandler(adminOrderController.forceCancelOrder)
);

module.exports = router;
