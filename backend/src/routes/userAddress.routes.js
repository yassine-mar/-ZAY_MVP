'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
} = require('../validators/userAddress.validators');
const ctrl = require('../controllers/userAddress.controller');

/**
 * Mounted under /users/me/addresses by user.routes.js
 * Authentication is applied at the parent (user.routes.js uses `router.use(authenticate)`),
 * so every handler here can assume req.user is set.
 */
const router = express.Router();

router.get('/', asyncHandler(ctrl.list));
router.post('/', validate(createAddressSchema), asyncHandler(ctrl.create));
router.get('/:id', validate(addressIdParamSchema), asyncHandler(ctrl.get));
router.put('/:id', validate(updateAddressSchema), asyncHandler(ctrl.update));
router.delete('/:id', validate(addressIdParamSchema), asyncHandler(ctrl.remove));
router.patch('/:id/default', validate(addressIdParamSchema), asyncHandler(ctrl.setDefault));

module.exports = router;
