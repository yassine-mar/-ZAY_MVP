'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { upload, handleMulterError } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { updateProfileSchema, updateFcmTokenSchema } = require('../validators/user.validators');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.use(authenticate);

router.get('/me', asyncHandler(userController.getMe));
router.put('/me', validate(updateProfileSchema), asyncHandler(userController.updateMe));
router.patch('/me/avatar', uploadLimiter, upload.single('avatar'), handleMulterError, asyncHandler(userController.uploadAvatar));
router.patch('/me/fcm-token', validate(updateFcmTokenSchema), asyncHandler(userController.updateFcmToken));
router.delete('/me', asyncHandler(userController.deleteMe));

module.exports = router;
