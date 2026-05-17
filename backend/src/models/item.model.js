'use strict';

const { query } = require('./base.model');

/** @returns {Promise<object[]>} available items for browse (public) */
const findAvailableForBrowse = async ({ categorySlug, search, city, sellerId, page, limit }) => {
  // TODO: full-text search with plainto_tsquery, filters, JOIN seller + category
  throw new Error('Not implemented');
};

/** @returns {Promise<number>} total count for pagination */
const countAvailableForBrowse = async ({ categorySlug, search, city, sellerId }) => {
  // TODO: COUNT version of above query
  throw new Error('Not implemented');
};

/** @returns {Promise<object[]>} top items by order count last 30 days */
const findFeatured = async (limit = 20) => {
  // TODO: JOIN with order_items, COUNT, ORDER BY order_count DESC
  throw new Error('Not implemented');
};

/** @returns {Promise<object[]>} all items in a menu (seller view) */
const findByMenuId = async (menuId) => {
  // TODO: SELECT * FROM menu_items WHERE menu_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC
  throw new Error('Not implemented');
};

/** @returns {Promise<object|null>} */
const findById = async (id) => {
  // TODO: SELECT mi.*, c.name as category_name, c.slug as category_slug FROM menu_items mi JOIN categories c ON ... WHERE mi.id = $1 AND deleted_at IS NULL
  throw new Error('Not implemented');
};

/** @returns {Promise<object[]>} items by IDs — used during order placement to verify availability */
const findByIds = async (ids) => {
  // TODO: SELECT * FROM menu_items WHERE id = ANY($1) AND is_available = TRUE AND deleted_at IS NULL
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} created item */
const create = async ({ menuId, categoryId, name, description, price, prepTimeMin, isAvailable }) => {
  // TODO: INSERT INTO menu_items (...) RETURNING *
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} updated item */
const update = async (id, fields) => {
  // TODO: dynamic UPDATE WHERE id = $1 AND deleted_at IS NULL
  throw new Error('Not implemented');
};

/** @returns {Promise<void>} */
const softDelete = async (id) => {
  // TODO: UPDATE menu_items SET deleted_at = NOW() WHERE id = $1
  throw new Error('Not implemented');
};

/** @returns {Promise<object>} */
const toggleAvailability = async (id, isAvailable) => {
  // TODO: UPDATE menu_items SET is_available = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING *
  throw new Error('Not implemented');
};

/** @returns {Promise<void>} */
const updateImage = async (id, { imageUrl, imagePublicId }) => {
  // TODO: UPDATE menu_items SET image_url = $2, image_public_id = $3 WHERE id = $1
  throw new Error('Not implemented');
};

module.exports = {
  findAvailableForBrowse,
  countAvailableForBrowse,
  findFeatured,
  findByMenuId,
  findById,
  findByIds,
  create,
  update,
  softDelete,
  toggleAvailability,
  updateImage,
};
