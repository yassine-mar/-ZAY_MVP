'use strict';

const { query } = require('./base.model');

const COLUMNS = 'id, name, slug, icon, sort_order, is_active, created_at, updated_at';

const findActive = async () => {
  const result = await query(
    `SELECT ${COLUMNS}
     FROM categories
     WHERE is_active = TRUE
     ORDER BY sort_order ASC, name ASC`
  );
  return result.rows;
};

const findAll = async () => {
  const result = await query(
    `SELECT ${COLUMNS}
     FROM categories
     ORDER BY is_active DESC, sort_order ASC, name ASC`
  );
  return result.rows;
};

const findById = async (id) => {
  const result = await query(
    `SELECT ${COLUMNS} FROM categories WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const findBySlug = async (slug) => {
  const result = await query(
    `SELECT ${COLUMNS} FROM categories WHERE slug = $1`,
    [slug]
  );
  return result.rows[0] || null;
};

const create = async ({ name, slug, icon, sortOrder, isActive }) => {
  const result = await query(
    `INSERT INTO categories (id, name, slug, icon, sort_order, is_active)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [name, slug, icon || null, sortOrder ?? 0, isActive ?? true]
  );
  return result.rows[0];
};

const ALLOWED_UPDATE_FIELDS = new Set(['name', 'slug', 'icon', 'sort_order', 'is_active']);

const update = async (id, fields) => {
  const entries = Object.entries(fields).filter(([k]) => ALLOWED_UPDATE_FIELDS.has(k));
  if (entries.length === 0) return findById(id);

  const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values = entries.map(([, v]) => v);

  const result = await query(
    `UPDATE categories
     SET ${setClauses}
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    [id, ...values]
  );
  return result.rows[0] || null;
};

/**
 * Soft delete via is_active = FALSE.
 * Returns the updated row (or null if not found).
 * Idempotent — calling on an already-inactive category is a no-op (returns the row).
 */
const deactivate = async (id) => {
  const result = await query(
    `UPDATE categories
     SET is_active = FALSE
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  findActive,
  findAll,
  findById,
  findBySlug,
  create,
  update,
  deactivate,
};
