'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { createOrderSchema, cancelOrderSchema, listOrdersSchema } = require('../validators/order.validators');
const orderController = require('../controllers/order.controller');

const router = express.Router();

router.use(authenticate);

router.post('/', requireRole('customer'), validate(createOrderSchema), asyncHandler(orderController.placeOrder));
router.get('/', requireRole('customer'), validate(listOrdersSchema), asyncHandler(orderController.getOrders));
router.get('/:id', requireRole('customer', 'seller'), asyncHandler(orderController.getOrder));
router.patch('/:id/cancel', requireRole('customer'), validate(cancelOrderSchema), asyncHandler(orderController.cancelOrder));

module.exports = router;
