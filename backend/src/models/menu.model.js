'use strict';

const { query } = require('./base.model');

const COLUMNS = `
  id, seller_id, name, description, sort_order,
  created_at, updated_at
`;

/**
 * List a seller's menus with item counts (excludes soft-deleted items).
 * Used by the seller's menu management screen.
 */
const findBySellerId = async (sellerId) => {
  const result = await query(
    `SELECT
       m.id, m.seller_id, m.name, m.description, m.sort_order,
       m.created_at, m.updated_at,
       COUNT(mi.id) FILTER (WHERE mi.deleted_at IS NULL) AS item_count
     FROM menus m
     LEFT JOIN menu_items mi ON mi.menu_id = m.id
     WHERE m.seller_id = $1 AND m.deleted_at IS NULL
     GROUP BY m.id
     ORDER BY m.sort_order ASC, m.name ASC`,
    [sellerId]
  );
  return result.rows;
};

const findById = async (id) => {
  const result = await query(
    `SELECT ${COLUMNS} FROM menus WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Menu with embedded available items (and category data).
 * Used by the public seller profile screen.
 */
const findByIdWithItems = async (id) => {
  const result = await query(
    `SELECT
       m.id, m.seller_id, m.name, m.description, m.sort_order,
       m.created_at, m.updated_at,
       COALESCE(
         json_agg(
           json_build_object(
             'id', mi.id,
             'name', mi.name,
             'description', mi.description,
             'price', mi.price,
             'prep_time_min', mi.prep_time_min,
             'image_url', mi.image_url,
             'is_available', mi.is_available,
             'category', json_build_object(
               'id', c.id,
               'name', c.name,
               'slug', c.slug,
               'icon', c.icon
             ),
             'created_at', mi.created_at
           )
           ORDER BY mi.created_at DESC
         ) FILTER (WHERE mi.id IS NOT NULL AND mi.deleted_at IS NULL AND mi.is_available = TRUE),
         '[]'::json
       ) AS items
     FROM menus m
     LEFT JOIN menu_items mi ON mi.menu_id = m.id
     LEFT JOIN categories c ON mi.category_id = c.id
     WHERE m.id = $1 AND m.deleted_at IS NULL
     GROUP BY m.id`,
    [id]
  );
  return result.rows[0] || null;
};

const create = async ({ sellerId, name, description, sortOrder }) => {
  const result = await query(
    `INSERT INTO menus (id, seller_id, name, description, sort_order)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4)
     RETURNING ${COLUMNS}`,
    [sellerId, name, description || null, sortOrder ?? 0]
  );
  return result.rows[0];
};

const ALLOWED_UPDATE_FIELDS = new Set(['name', 'description', 'sort_order']);

const update = async (id, fields) => {
  const entries = Object.entries(fields).filter(([k]) => ALLOWED_UPDATE_FIELDS.has(k));
  if (entries.length === 0) return findById(id);

  const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values = entries.map(([, v]) => v);

  const result = await query(
    `UPDATE menus
     SET ${setClauses}
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING ${COLUMNS}`,
    [id, ...values]
  );
  return result.rows[0] || null;
};

/**
 * Soft delete. The CASCADE on menu_items.menu_id is for hard delete only,
 * so existing items remain queryable for historical orders. Browse queries
 * filter out items whose menu has deleted_at IS NOT NULL.
 */
const softDelete = async (id) => {
  await query(
    'UPDATE menus SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
};

module.exports = {
  findBySellerId,
  findById,
  findByIdWithItems,
  create,
  update,
  softDelete,
};
