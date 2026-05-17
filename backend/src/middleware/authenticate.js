'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const UserModel = require('../models/user.model');
const SellerModel = require('../models/seller.model');

const authenticate = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  const token = authHeader.slice(7);

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Your session has expired. Please log in again.'));
    }
    return next(new AppError(401, 'UNAUTHORIZED', 'Invalid authentication token'));
  }

  const user = await UserModel.findById(payload.sub);
  if (!user) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  if (user.status === 'suspended') {
    return next(new AppError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended. Please contact support.'));
  }

  if (user.role === 'seller') {
    user.sellerProfile = await SellerModel.findByUserId(user.id);
  }

  req.user = user;
  return next();
};

module.exports = authenticate;
