'use strict';

const UserService = require('../services/user.service');
const { sendOk } = require('../utils/response');
const { serializeUser } = require('../utils/serializers/user.serializer');
const { serializeSellerPublic } = require('../utils/serializers/seller.serializer');

const getMe = async (req, res) => {
  const user = await UserService.getMe(req.user.id);
  sendOk(res, 'Profile fetched', {
    user: serializeUser(user),
    seller_profile: user.sellerProfile ? serializeSellerPublic(user.sellerProfile) : null,
  });
};

const updateMe = async (req, res) => {
  const user = await UserService.updateMe(req.user.id, req.body);
  sendOk(res, 'Profile updated', { user: serializeUser(user) });
};

const changePassword = async (req, res) => {
  await UserService.changePassword(req.user.id, {
    currentPassword: req.body.current_password,
    newPassword: req.body.new_password,
  });
  sendOk(res, 'Password changed. All other sessions have been signed out.');
};

const uploadAvatar = async (req, res) => {
  const { avatar_url } = await UserService.uploadAvatar(req.user.id, req.file);
  sendOk(res, 'Avatar updated', { avatar_url });
};

const updateFcmToken = async (req, res) => {
  await UserService.updateFcmToken(req.user.id, req.body.fcm_token);
  sendOk(res, 'Device token updated');
};

const clearFcmToken = async (req, res) => {
  await UserService.clearFcmToken(req.user.id);
  sendOk(res, 'Device token cleared');
};

const deleteMe = async (req, res) => {
  await UserService.deleteMe(req.user.id);
  sendOk(res, 'Account deleted');
};

module.exports = {
  getMe,
  updateMe,
  changePassword,
  uploadAvatar,
  updateFcmToken,
  clearFcmToken,
  deleteMe,
};
