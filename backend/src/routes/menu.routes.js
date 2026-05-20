'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const requireApprovedSeller = require('../middleware/requireApprovedSeller');
const validate = require('../middleware/validate');
const { createMenuSchema, updateMenuSchema } = require('../validators/menu.validators');
const { createItemSchema } = require('../validators/item.validators');
const menuController = require('../controllers/menu.controller');

const router = express.Router();

/**
 * All /menus/* routes require an approved seller.
 */
router.use(authenticate, requireApprovedSeller);

// Menu CRUD
router.get('/', asyncHandler(menuController.getMenus));
router.post('/', validate(createMenuSchema), asyncHandler(menuController.createMenu));
router.get('/:id', asyncHandler(menuController.getMenu));
router.put('/:id', validate(updateMenuSchema), asyncHandler(menuController.updateMenu));
router.delete('/:id', asyncHandler(menuController.deleteMenu));

// Nested items operations (POST + GET keyed by parent menu).
router.get('/:menuId/items', asyncHandler(menuController.getMenuItems));
router.post(
  '/:menuId/items',
  validate(createItemSchema),
  asyncHandler(menuController.addItemToMenu)
);

module.exports = router;
