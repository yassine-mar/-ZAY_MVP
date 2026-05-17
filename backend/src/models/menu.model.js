'use strict';

const { query } = require('./base.model');

/** @returns {Promise<object[]>} menus belonging to the seller */
const findBySellerId = async (sellerId) => {
  // TODO: SELECT * FROM menus WHERE seller_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC
  throw new Error('Not implemented');
};

/** @returns {Promise<object|null>} menu with items */
const findById = async (id) => {
  // TODO: SELECT menus.*, json_agg(menu_items.*) as items FROM menus LEFT JOIN menu_items ON ... WHERE menus.id = $1
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} created menu */
const create = async ({ sellerId, name, description }) => {
  // TODO: INSERT INTO menus (id, seller_id, name, description) VALUES (...) RETURNING *
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} updated menu */
const update = async (id, fields) => {
  // TODO: dynamic UPDATE WHERE id = $1 AND deleted_at IS NULL
  throw new Error('Not implemented');
};

/** @returns {Promise<void>} soft delete (sets deleted_at) */
const softDelete = async (id) => {
  // TODO: UPDATE menus SET deleted_at = NOW() WHERE id = $1
  throw new Error('Not implemented');
};

module.exports = { findBySellerId, findById, create, update, softDelete };
