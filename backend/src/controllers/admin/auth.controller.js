'use strict';

const AuthService = require('../../services/auth.service');
const { sendOk } = require('../../utils/response');
const { serializeUser } = require('../../utils/serializers/user.serializer');

/**
 * POST /api/v1/admin/auth/login
 *
 * Returns an admin access token signed with ADMIN_JWT_SECRET (separate key
 * from user tokens) with a shorter expiry (8h default). Admin login does NOT
 * issue a refresh token — admin sessions are deliberately short-lived and
 * re-login at the start of each work session is the expected pattern.
 */
const adminLogin = async (req, res) => {
  const { user, accessToken } = await AuthService.adminLogin(req.body);
  sendOk(res, 'Login successful', {
    user: serializeUser(user),
    access_token: accessToken,
    token_type: 'Bearer',
  });
};

module.exports = { adminLogin };
