'use strict';

const AuthService = require('../services/auth.service');
const { sendOk, sendCreated } = require('../utils/response');
const { serializeUser } = require('../utils/serializers/user.serializer');
const { serializeSellerPublic } = require('../utils/serializers/seller.serializer');

/**
 * Build the audit context from the request — used for refresh_tokens.ip
 * and refresh_tokens.user_agent. Trust proxy is set in app.js so req.ip
 * reflects the real client IP (from X-Forwarded-For).
 */
const buildContext = (req) => ({
  ip: req.ip || null,
  userAgent: req.headers['user-agent'] || null,
});

const register = async (req, res) => {
  const { user, tokens } = await AuthService.register(req.body, buildContext(req));
  sendCreated(res, 'Account created successfully', {
    user: serializeUser(user),
    ...tokens,
  });
};

const registerSeller = async (req, res) => {
  const { user, sellerProfile, tokens } = await AuthService.registerSeller(
    req.body,
    buildContext(req)
  );
  sendCreated(
    res,
    'Seller account submitted for approval. You will be notified once reviewed.',
    {
      user: serializeUser(user),
      seller_profile: serializeSellerPublic(sellerProfile),
      ...tokens,
    }
  );
};

const login = async (req, res) => {
  const { user, sellerProfile, tokens } = await AuthService.login(
    req.body,
    buildContext(req)
  );
  sendOk(res, 'Login successful', {
    user: serializeUser(user),
    seller_profile: sellerProfile ? serializeSellerPublic(sellerProfile) : null,
    ...tokens,
  });
};

const refresh = async (req, res) => {
  const tokens = await AuthService.refresh(req.body, buildContext(req));
  sendOk(res, 'Token refreshed', tokens);
};

const logout = async (req, res) => {
  await AuthService.logout(req.user.id, req.body?.refresh_token);
  sendOk(res, 'Logged out successfully');
};

module.exports = { register, registerSeller, login, refresh, logout };
