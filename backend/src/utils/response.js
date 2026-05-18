'use strict';

/**
 * Standard success response envelope. All success responses MUST go
 * through one of these helpers — never call res.json() directly.
 *
 * Failure responses are emitted by the global errorHandler middleware,
 * driven by AppError instances thrown from services.
 */

const send = (res, statusCode, message, data) => {
  res.status(statusCode).json({
    success: true,
    message,
    data: data === undefined ? {} : data,
  });
};

/** 200 OK — standard read/update success. */
const sendOk = (res, message, data) => send(res, 200, message, data);

/** 201 Created — POSTs that created a resource. */
const sendCreated = (res, message, data) => send(res, 201, message, data);

/** Custom status code variant (rarely needed). */
const sendSuccess = (res, statusCode, message, data) =>
  send(res, statusCode, message, data);

/** Paginated list response with { items, pagination } envelope. */
const sendPaginated = (res, message, items, pagination) => {
  res.status(200).json({
    success: true,
    message,
    data: { items, pagination },
  });
};

module.exports = { sendOk, sendCreated, sendSuccess, sendPaginated };
