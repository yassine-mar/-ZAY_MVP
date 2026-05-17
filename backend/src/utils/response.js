'use strict';

const sendSuccess = (res, statusCode, message, data = {}) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendPaginated = (res, message, items, pagination) => {
  res.status(200).json({
    success: true,
    message,
    data: {
      items,
      pagination,
    },
  });
};

module.exports = { sendSuccess, sendPaginated };
