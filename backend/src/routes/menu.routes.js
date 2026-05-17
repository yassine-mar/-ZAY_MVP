'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const requireApprovedSeller = require('../middleware/requireApprovedSeller');
const validate = require('../middleware/validate');
const { createMenuSchema, updateMenuSchema } = require('../validators/menu.validators');
const menuController = require('../controllers/menu.controller');

const router = express.Router();

router.use(authenticate, requireApprovedSeller);

router.get('/', asyncHandler(menuController.getMenus));
router.post('/', validate(createMenuSchema), asyncHandler(menuController.createMenu));
router.get('/:id', asyncHandler(menuController.getMenu));
router.put('/:id', validate(updateMenuSchema), asyncHandler(menuController.updateMenu));
router.delete('/:id', asyncHandler(menuController.deleteMenu));

module.exports = router;
