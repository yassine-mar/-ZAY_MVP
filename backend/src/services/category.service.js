'use strict';

const CategoryModel = require('../models/category.model');

/**
 * Public read-only service. Used by:
 *   - GET /api/v1/categories            (customer browse)
 *   - GET /api/v1/browse/categories     (alt path — same data)
 *
 * Returns only active categories, sorted by sort_order then name.
 */
const listActive = async () => CategoryModel.findActive();

const getBySlug = async (slug) => CategoryModel.findBySlug(slug);

module.exports = { listActive, getBySlug };
