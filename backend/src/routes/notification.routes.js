'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { listNotificationsSchema } = require('../validators/notification.validators');
const notificationController = require('../controllers/notification.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', validate(listNotificationsSchema), asyncHandler(notificationController.getNotifications));
router.get('/unread-count', asyncHandler(notificationController.getUnreadCount));
router.patch('/read-all', asyncHandler(notificationController.markAllRead));
router.patch('/:id/read', asyncHandler(notificationController.markRead));

module.exports = router;
