'use strict';

const { query } = require('./base.model');

/** @returns {Promise<object[]>} all active categories */
const findAll = async () => {
  // TODO: SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order ASC, name ASC
  throw new Error('Not implemented');
};

/** @returns {Promise<object[]>} all categories including inactive (admin) */
const findAllAdmin = async () => {
  // TODO: SELECT * FROM categories ORDER BY sort_order ASC
  throw new Error('Not implemented');
};

/** @returns {Promise<object|null>} */
const findById = async (id) => {
  // TODO: SELECT * FROM categories WHERE id = $1
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} created category */
const create = async ({ name, slug, icon, isActive }) => {
  // TODO: INSERT INTO categories (id, name, slug, icon, is_active) VALUES (...) RETURNING *
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} updated category */
const update = async (id, fields) => {
  // TODO: dynamic UPDATE
  throw new Error('Not implemented');
};

/** @returns {Promise<void>} deactivate (not hard delete) */
const deactivate = async (id) => {
  // TODO: UPDATE categories SET is_active = FALSE WHERE id = $1
  throw new Error('Not implemented');
};

module.exports = { findAll, findAllAdmin, findById, create, update, deactivate };
