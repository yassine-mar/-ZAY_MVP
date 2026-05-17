'use strict';

const express = require('express');
const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');

const adminAuthRoutes = require('./auth.routes');
const adminSellerRoutes = require('./seller.routes');
const adminUserRoutes = require('./user.routes');
const adminOrderRoutes = require('./order.routes');
const adminCategoryRoutes = require('./category.routes');
const adminAnalyticsRoutes = require('./analytics.routes');

const router = express.Router();

const authenticateAdmin = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Admin authentication required'));
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.ADMIN_JWT_SECRET, { algorithms: ['HS256'] });
    req.adminId = payload.sub;
    return next();
  } catch {
    return next(new AppError(401, 'UNAUTHORIZED', 'Invalid admin token'));
  }
};

router.use('/auth', adminAuthRoutes);
router.use(authenticateAdmin);
router.use('/sellers', adminSellerRoutes);
router.use('/users', adminUserRoutes);
router.use('/orders', adminOrderRoutes);
router.use('/categories', adminCategoryRoutes);
router.use('/analytics', adminAnalyticsRoutes);

module.exports = router;
