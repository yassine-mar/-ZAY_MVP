'use strict';

const express = require('express');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const categoryRoutes = require('./category.routes');
const menuRoutes = require('./menu.routes');
const itemRoutes = require('./item.routes');
const browseRoutes = require('./browse.routes');
const orderRoutes = require('./order.routes');
const cartRoutes = require('./cart.routes');
const sellerRoutes = require('./seller.routes');
const notificationRoutes = require('./notification.routes');
const healthRoutes = require('./health.routes');
const adminRoutes = require('./admin/index');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/menus', menuRoutes);
router.use('/items', itemRoutes);
router.use('/browse', browseRoutes);
router.use('/orders', orderRoutes);
router.use('/cart', cartRoutes);
router.use('/seller', sellerRoutes);
router.use('/notifications', notificationRoutes);
router.use('/health', healthRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
