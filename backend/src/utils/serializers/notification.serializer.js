'use strict';

const serializeNotification = (notification) => {
  if (!notification) return null;
  const { fcm_sent, fcm_error, data, ...safe } = notification;
  return safe;
};

module.exports = { serializeNotification };
