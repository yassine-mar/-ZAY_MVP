'use strict';

const NotificationModel = require('../models/notification.model');
const AppError = require('../utils/AppError');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { parsePaginationParams, buildPaginationMeta } = require('../utils/pagination');
const { serializeNotification } = require('../utils/serializers/notification.serializer');

const getNotifications = async (req, res) => {
  const { page, limit, offset } = parsePaginationParams(req.query);
  const { items: raw, total } = await NotificationModel.findByUser({ userId: req.user.id, page, limit, offset });
  const items = raw.map(serializeNotification);
  sendPaginated(res, 'Notifications fetched', items, buildPaginationMeta(page, limit, total));
};

const getUnreadCount = async (req, res) => {
  const count = await NotificationModel.countUnread(req.user.id);
  sendSuccess(res, 200, 'Unread count fetched', { unread_count: count });
};

const markRead = async (req, res) => {
  await NotificationModel.markRead(req.params.id, req.user.id);
  sendSuccess(res, 200, 'Notification marked as read', {});
};

const markAllRead = async (req, res) => {
  const marked_read_count = await NotificationModel.markAllRead(req.user.id);
  sendSuccess(res, 200, 'Notifications marked as read', { marked_read_count });
};

module.exports = { getNotifications, getUnreadCount, markRead, markAllRead };
