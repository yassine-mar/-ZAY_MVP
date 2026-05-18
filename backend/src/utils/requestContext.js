'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');

/**
 * Per-request async context store backed by AsyncLocalStorage.
 *
 * Solves a real problem: services and models need access to the requestId
 * (and eventually userId, locale, etc.) but threading them through every
 * function signature pollutes APIs. AsyncLocalStorage propagates the value
 * through await / Promise.then chains automatically.
 *
 * Set once by the `requestLogger` middleware at the top of the stack.
 * Read anywhere downstream via `getRequestId()` / `getUserId()`.
 *
 * Has near-zero performance cost on Node 20 (V8 optimized this path).
 */
const storage = new AsyncLocalStorage();

const runWithContext = (context, fn) => storage.run(context, fn);

const getContext = () => storage.getStore() || {};

const getRequestId = () => getContext().requestId;

const getUserId = () => getContext().userId;

const setUserId = (userId) => {
  const store = storage.getStore();
  if (store) store.userId = userId;
};

module.exports = {
  runWithContext,
  getContext,
  getRequestId,
  getUserId,
  setUserId,
};
