'use strict';

const AuthService = require('../../services/auth.service');
const { sendSuccess } = require('../../utils/response');
const { serializeUser } = require('../../utils/serializers/user.serializer');

const adminLogin = async (req, res) => {
  const { user, token } = await AuthService.adminLogin(req.body);
  sendSuccess(res, 200, 'Admin login successful', { user: serializeUser(user), token });
};

module.exports = { adminLogin };
