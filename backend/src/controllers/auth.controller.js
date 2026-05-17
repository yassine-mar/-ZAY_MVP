'use strict';

const AuthService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response');
const { serializeUser } = require('../utils/serializers/user.serializer');

const register = async (req, res) => {
  const { user, token } = await AuthService.register(req.body);
  sendSuccess(res, 201, 'Account created successfully', { user: serializeUser(user), token });
};

const registerSeller = async (req, res) => {
  const { user, sellerProfile, token } = await AuthService.registerSeller(req.body);
  sendSuccess(res, 201, 'Seller account submitted for approval. You will be notified once reviewed.', {
    user: serializeUser(user),
    seller_profile: sellerProfile,
    token,
  });
};

const login = async (req, res) => {
  const { user, token } = await AuthService.login(req.body);
  sendSuccess(res, 200, 'Login successful', { user: serializeUser(user), token });
};

const logout = async (req, res) => {
  await AuthService.logout(req.user.id);
  sendSuccess(res, 200, 'Logged out successfully', {});
};

module.exports = { register, registerSeller, login, logout };
