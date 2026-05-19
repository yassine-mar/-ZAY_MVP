'use strict';

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { upload, handleMulterError } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');
const {
  updateProfileSchema,
  updateFcmTokenSchema,
  changePasswordSchema,
} = require('../validators/user.validators');
const userController = require('../controllers/user.controller');
const userAddressRoutes = require('./userAddress.routes');

const router = express.Router();

// Every /users/me/* route requires authentication.
router.use(authenticate);

// Profile
router.get('/me', asyncHandler(userController.getMe));
router.put('/me', validate(updateProfileSchema), asyncHandler(userController.updateMe));

// Password change — sensitive operation. Requires current_password verification.
// Side effect: revokes all refresh tokens (forces re-login on other devices).
router.post(
  '/me/password',
  validate(changePasswordSchema),
  asyncHandler(userController.changePassword)
);

// Avatar upload — multipart. Rate-limited separately to protect Cloudinary quota.
router.patch(
  '/me/avatar',
  uploadLimiter,
  upload.single('avatar'),
  handleMulterError,
  asyncHandler(userController.uploadAvatar)
);

// FCM device token registration / refresh.
router.patch(
  '/me/fcm-token',
  validate(updateFcmTokenSchema),
  asyncHandler(userController.updateFcmToken)
);

// Account deletion — blocked when active orders exist.
router.delete('/me', asyncHandler(userController.deleteMe));

// Saved addresses (nested under /users/me/addresses)
router.use('/me/addresses', userAddressRoutes);

module.exports = router;
