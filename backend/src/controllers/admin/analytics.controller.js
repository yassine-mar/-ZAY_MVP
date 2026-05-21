'use strict';

const AnalyticsAdminService = require('../../services/admin/analytics.admin.service');
const { sendOk } = require('../../utils/response');

const getOverview = async (_req, res) => {
  const overview = await AnalyticsAdminService.getOverview();
  sendOk(res, 'Analytics fetched', { overview });
};

const getOrderTrends = async (req, res) => {
  const days = req.query.days ?? 30;
  const trends = await AnalyticsAdminService.getOrderTrends(days);
  sendOk(res, 'Order trends fetched', { trends });
};

const getTopSellers = async (req, res) => {
  const limit = req.query.limit ?? 10;
  const top_sellers = await AnalyticsAdminService.getTopSellers(limit);
  sendOk(res, 'Top sellers fetched', { top_sellers });
};

module.exports = { getOverview, getOrderTrends, getTopSellers };
