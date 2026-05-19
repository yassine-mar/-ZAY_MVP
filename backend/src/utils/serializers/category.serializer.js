'use strict';

/**
 * Public-facing shape — exposed via GET /categories.
 * Hides created_at, updated_at, is_active (assumed true on public endpoint).
 */
const serializeCategory = (category) => {
  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    sort_order: category.sort_order,
  };
};

/**
 * Admin-facing shape — exposed via /admin/categories.
 * Includes is_active and timestamps for management UI.
 */
const serializeCategoryAdmin = (category) => {
  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    sort_order: category.sort_order,
    is_active: category.is_active,
    created_at: category.created_at,
    updated_at: category.updated_at,
  };
};

module.exports = { serializeCategory, serializeCategoryAdmin };
