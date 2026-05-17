'use strict';

const UserModel = require('../models/user.model');
const OrderModel = require('../models/order.model');
const AppError = require('../utils/AppError');
const UploadService = require('./upload.service');
const { serializeUser } = require('../utils/serializers/user.serializer');

/** @returns {Promise<object>} serialized user profile */
const getMe = async (userId) => {
  // TODO: UserModel.findById(userId), serialize
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} updated user */
const updateMe = async (userId, fields) => {
  // TODO: UserModel.update(userId, fields), serialize
  throw new Error('Not implemented');
};

/** @returns {Promise<{ avatar_url: string }>} */
const uploadAvatar = async (userId, file) => {
  // TODO:
  // 1. Fetch current user to get existing avatar public_id
  // 2. UploadService.uploadImage(file.buffer, 'avatars')
  // 3. If previous image: UploadService.deleteImage(prevPublicId) [non-blocking]
  // 4. UserModel.update(userId, { avatar_url, avatar_public_id })
  throw new Error('Not implemented');
};

/** @returns {Promise<void>} */
const updateFcmToken = async (userId, fcmToken) => {
  // TODO: UserModel.updateFcmToken(userId, fcmToken)
  throw new Error('Not implemented');
};

/**
 * Delete own account. Blocked if active orders exist.
 */
const deleteMe = async (userId) => {
  // TODO:
  // 1. Check for active orders: OrderModel.findByCustomer({ customerId: userId, activeOnly: true })
  // 2. If any active: throw AppError(409, 'ACTIVE_ORDERS_EXIST', 'Cannot delete account with active orders')
  // 3. UserModel.softDelete(userId)
  throw new Error('Not implemented');
};

module.exports = { getMe, updateMe, uploadAvatar, updateFcmToken, deleteMe };
