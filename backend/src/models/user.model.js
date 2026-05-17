'use strict';

const { query } = require('./base.model');

/** @returns {Promise<object|null>} user row without password_hash */
const findById = async (id) => {
  // TODO: SELECT id, name, email, phone, role, avatar_url, fcm_token, status, created_at, updated_at FROM users WHERE id = $1 AND deleted_at IS NULL
  throw new Error('Not implemented');
};

/** @returns {Promise<object|null>} full user row including password_hash (for auth only) */
const findByEmailWithPassword = async (email) => {
  // TODO: SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL
  throw new Error('Not implemented');
};

/** @returns {Promise<boolean>} */
const existsByEmail = async (email) => {
  // TODO: SELECT 1 FROM users WHERE email = $1
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} created user row */
const create = async ({ name, email, phone, passwordHash, role }, client) => {
  // TODO: INSERT INTO users (id, name, email, phone, password_hash, role) VALUES (uuid_generate_v4(), $1, ...) RETURNING ...
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} updated user row */
const update = async (id, fields) => {
  // TODO: dynamic UPDATE with only provided fields
  throw new Error('Not implemented');
};

/** @returns {Promise<void>} */
const updateFcmToken = async (id, fcmToken) => {
  // TODO: UPDATE users SET fcm_token = $1 WHERE id = $2
  throw new Error('Not implemented');
};

/** @returns {Promise<void>} */
const clearFcmToken = async (id) => {
  // TODO: UPDATE users SET fcm_token = NULL WHERE id = $1
  throw new Error('Not implemented');
};

/** @returns {Promise<void>} soft delete — sets deleted_at */
const softDelete = async (id) => {
  // TODO: UPDATE users SET deleted_at = NOW() WHERE id = $1
  throw new Error('Not implemented');
};

/** @returns {Promise<string|null>} FCM token or null */
const getFcmToken = async (id) => {
  // TODO: SELECT fcm_token FROM users WHERE id = $1
  throw new Error('Not implemented');
};

module.exports = { findById, findByEmailWithPassword, existsByEmail, create, update, updateFcmToken, clearFcmToken, softDelete, getFcmToken };
