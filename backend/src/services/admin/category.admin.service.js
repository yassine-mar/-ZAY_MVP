'use strict';

const CategoryModel = require('../../models/category.model');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const { slugify } = require('../../utils/slugify');

const MIN_SLUG_LENGTH = 2;
const MAX_SLUG_LENGTH = 100;

/**
 * Translate Postgres unique-constraint violations into a meaningful 409.
 * The DB has two unique indexes on categories: name and slug.
 */
const mapUniqueViolation = (err) => {
  if (err && err.code === '23505') {
    if (err.constraint === 'categories_slug_unique') {
      return new AppError(409, 'CONFLICT', 'A category with this slug already exists');
    }
    if (err.constraint === 'categories_name_unique') {
      return new AppError(409, 'CONFLICT', 'A category with this name already exists');
    }
    return new AppError(409, 'CONFLICT', 'Category conflict');
  }
  return err;
};

const listAll = async () => CategoryModel.findAll();

const get = async (id) => {
  const category = await CategoryModel.findById(id);
  if (!category) throw new AppError(404, 'NOT_FOUND', 'Category not found');
  return category;
};

const create = async ({ name, slug, icon, sort_order, is_active }) => {
  const finalName = String(name).trim();
  const finalSlug = (slug && slug.trim()) || slugify(finalName, MAX_SLUG_LENGTH);

  if (!finalSlug || finalSlug.length < MIN_SLUG_LENGTH) {
    throw new AppError(
      400,
      'INVALID_SLUG',
      'Slug could not be generated from the provided name. Provide an explicit `slug`.'
    );
  }

  try {
    const category = await CategoryModel.create({
      name: finalName,
      slug: finalSlug,
      icon: icon ? icon.trim() : null,
      sortOrder: sort_order ?? 0,
      isActive: is_active ?? true,
    });
    logger.info('Category created', { categoryId: category.id, slug: category.slug });
    return category;
  } catch (err) {
    throw mapUniqueViolation(err);
  }
};

const update = async (id, fields) => {
  const existing = await CategoryModel.findById(id);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Category not found');

  const patch = {};

  if (fields.name !== undefined) {
    patch.name = String(fields.name).trim();
  }

  // Auto-regenerate slug when name changed and slug not explicitly provided.
  if (fields.slug !== undefined) {
    patch.slug = fields.slug.trim();
  } else if (patch.name && patch.name !== existing.name) {
    patch.slug = slugify(patch.name, MAX_SLUG_LENGTH);
    if (!patch.slug || patch.slug.length < MIN_SLUG_LENGTH) {
      throw new AppError(
        400,
        'INVALID_SLUG',
        'Slug could not be generated from the new name. Provide an explicit `slug`.'
      );
    }
  }

  if (fields.icon !== undefined) patch.icon = fields.icon ? fields.icon.trim() : null;
  if (fields.sort_order !== undefined) patch.sort_order = fields.sort_order;
  if (fields.is_active !== undefined) patch.is_active = fields.is_active;

  try {
    const category = await CategoryModel.update(id, patch);
    if (!category) throw new AppError(404, 'NOT_FOUND', 'Category not found');
    logger.info('Category updated', { categoryId: id, fields: Object.keys(patch) });
    return category;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw mapUniqueViolation(err);
  }
};

/**
 * Soft delete via deactivation.
 * Existing menu_items that reference this category remain functional;
 * they simply won't appear in active-category browse results.
 */
const deactivate = async (id) => {
  const category = await CategoryModel.deactivate(id);
  if (!category) throw new AppError(404, 'NOT_FOUND', 'Category not found');
  logger.info('Category deactivated', { categoryId: id });
  return category;
};

module.exports = { listAll, get, create, update, deactivate };
