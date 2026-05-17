'use strict';

const { query } = require('./base.model');

/** @returns {Promise<object|null>} */
const findById = async (id) => {
  // TODO: SELECT sp.*, u.phone, u.email, u.name FROM seller_profiles sp JOIN users u ON sp.user_id = u.id WHERE sp.id = $1
  throw new Error('Not implemented');
};

/** @returns {Promise<object|null>} */
const findByUserId = async (userId) => {
  // TODO: SELECT * FROM seller_profiles WHERE user_id = $1
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} created seller_profile row */
const create = async ({ userId, businessName, bio, address, city, deliveryRadiusKm }, client) => {
  // TODO: INSERT INTO seller_profiles (id, user_id, business_name, ...) VALUES (...) RETURNING *
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} updated seller_profile row */
const update = async (id, fields) => {
  // TODO: dynamic UPDATE
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} approved seller_profile */
const approve = async (id) => {
  // TODO: UPDATE seller_profiles SET status = 'approved', approved_at = NOW() WHERE id = $1
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} rejected seller_profile */
const reject = async (id, reason) => {
  // TODO: UPDATE seller_profiles SET status = 'rejected', rejection_reason = $2 WHERE id = $1
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} suspended seller_profile */
const suspend = async (id, reason) => {
  // TODO: UPDATE seller_profiles SET status = 'suspended', suspended_at = NOW(), suspension_reason = $2 WHERE id = $1
  throw new Error('Not implemented');
};

/** @returns {Promise<{ items: object[], total: number }>} */
const findAll = async ({ status, city, page, limit }) => {
  // TODO: paginated SELECT with optional status/city filters
  throw new Error('Not implemented');
};

/** @returns {Promise<{ items: object[], total: number }>} approved + open sellers */
const findOpenInCity = async ({ city, page, limit }) => {
  // TODO: WHERE status = 'approved' AND is_open = TRUE AND city = $1
  throw new Error('Not implemented');
};

module.exports = { findById, findByUserId, create, update, approve, reject, suspend, findAll, findOpenInCity };
