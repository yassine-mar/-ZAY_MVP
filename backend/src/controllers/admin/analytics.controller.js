'use strict';

const AdminAnalyticsService = require('../../services/admin/analytics.admin.service');
const { sendSuccess } = require('../../utils/response');

const getOverview = async (req, res) => {
  const overview = await AdminAnalyticsService.getOverview();
  sendSuccess(res, 200, 'Analytics fetched', { overview });
};

const getOrderTrends = async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const trends = await AdminAnalyticsService.getOrderTrends(days);
  sendSuccess(res, 200, 'Order trends fetched', { trends });
};

const getTopSellers = async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const sellers = await AdminAnalyticsService.getTopSellers(limit);
  sendSuccess(res, 200, 'Top sellers fetched', { sellers });
};

module.exports = { getOverview, getOrderTrends, getTopSellers };
