'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const requireApprovedSeller = require('../middleware/requireApprovedSeller');
const validate = require('../middleware/validate');
const { upload, handleMulterError } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');
const {
  updateItemSchema,
  toggleAvailabilitySchema,
} = require('../validators/item.validators');
const itemController = require('../controllers/item.controller');

const router = express.Router();

/**
 * /items/* — operations keyed by item ID.
 * Creation lives at POST /menus/:menuId/items (nested under the menu).
 */
router.use(authenticate, requireApprovedSeller);

router.get('/:id', asyncHandler(itemController.getItem));
router.put('/:id', validate(updateItemSchema), asyncHandler(itemController.updateItem));
router.delete('/:id', asyncHandler(itemController.deleteItem));
router.patch(
  '/:id/availability',
  validate(toggleAvailabilitySchema),
  asyncHandler(itemController.toggleAvailability)
);
router.post(
  '/:id/image',
  uploadLimiter,
  upload.single('image'),
  handleMulterError,
  asyncHandler(itemController.uploadImage)
);

module.exports = router;
