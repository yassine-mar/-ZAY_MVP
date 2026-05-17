'use strict';

const UserService = require('../services/user.service');
const { sendSuccess } = require('../utils/response');
const { serializeUser } = require('../utils/serializers/user.serializer');

const getMe = async (req, res) => {
  const user = await UserService.getMe(req.user.id);
  sendSuccess(res, 200, 'Profile fetched', { user: serializeUser(user) });
};

const updateMe = async (req, res) => {
  const user = await UserService.updateMe(req.user.id, req.body);
  sendSuccess(res, 200, 'Profile updated', { user: serializeUser(user) });
};

const uploadAvatar = async (req, res) => {
  const { avatar_url } = await UserService.uploadAvatar(req.user.id, req.file);
  sendSuccess(res, 200, 'Avatar updated', { avatar_url });
};

const updateFcmToken = async (req, res) => {
  await UserService.updateFcmToken(req.user.id, req.body.fcm_token);
  sendSuccess(res, 200, 'Device token updated', {});
};

const deleteMe = async (req, res) => {
  await UserService.deleteMe(req.user.id);
  sendSuccess(res, 200, 'Account deleted', {});
};

module.exports = { getMe, updateMe, uploadAvatar, updateFcmToken, deleteMe };
