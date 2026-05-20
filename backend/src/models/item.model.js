'use strict';

const { query } = require('./base.model');

/**
 * Columns from menu_items table — explicit list (never SELECT *).
 * Aliased fields are joined columns from related tables.
 */
const MI_COLUMNS = `
  mi.id, mi.menu_id, mi.category_id, mi.name, mi.description,
  mi.price, mi.prep_time_min, mi.image_url, mi.image_public_id,
  mi.is_available, mi.created_at, mi.updated_at
`;

const CATEGORY_JOIN_COLUMNS = `
  c.id AS category_id_full, c.name AS category_name,
  c.slug AS category_slug, c.icon AS category_icon
`;

const SELLER_JOIN_COLUMNS = `
  sp.id AS seller_id, sp.business_name AS seller_business_name,
  sp.city AS seller_city, sp.is_open AS seller_is_open,
  sp.delivery_radius_km AS seller_delivery_radius_km
`;

/**
 * Build the WHERE clause + parameter list for browse queries.
 * Returns { conditions, params, searchParamIdx } where searchParamIdx points
 * to the search term in the params array (so ORDER BY can reuse it for ranking).
 */
const buildBrowseWhere = (filters) => {
  const conditions = [
    'mi.is_available = TRUE',
    'mi.deleted_at IS NULL',
    'm.deleted_at IS NULL',
    "sp.status = 'approved'",
  ];
  const params = [];
  let searchParamIdx = null;

  if (filters.city) {
    params.push(filters.city);
    conditions.push(`sp.city = $${params.length}`);
  }
  if (filters.categorySlug) {
    params.push(filters.categorySlug);
    conditions.push(`c.slug = $${params.length}`);
  }
  if (filters.sellerId) {
    params.push(filters.sellerId);
    conditions.push(`m.seller_id = $${params.length}`);
  }
  if (filters.minPrice !== undefined && filters.minPrice !== null) {
    params.push(filters.minPrice);
    conditions.push(`mi.price >= $${params.length}`);
  }
  if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
    params.push(filters.maxPrice);
    conditions.push(`mi.price <= $${params.length}`);
  }
  if (filters.search) {
    params.push(filters.search);
    searchParamIdx = params.length;
    conditions.push(`mi.search_vector @@ plainto_tsquery('french', $${searchParamIdx})`);
  }

  return { conditions, params, searchParamIdx };
};

const findAvailableForBrowse = async (filters) => {
  const { conditions, params, searchParamIdx } = buildBrowseWhere(filters);

  let orderBy;
  if (searchParamIdx) {
    // Search active → rank by FTS score, tie-break by recency.
    orderBy = `ts_rank(mi.search_vector, plainto_tsquery('french', $${searchParamIdx})) DESC, mi.created_at DESC`;
  } else if (filters.sort === 'price_asc') {
    orderBy = 'mi.price ASC, mi.created_at DESC';
  } else if (filters.sort === 'price_desc') {
    orderBy = 'mi.price DESC, mi.created_at DESC';
  } else {
    orderBy = 'mi.created_at DESC';
  }

  params.push(filters.limit);
  const limitIdx = params.length;
  params.push(filters.offset);
  const offsetIdx = params.length;

  const result = await query(
    `SELECT ${MI_COLUMNS},
            ${CATEGORY_JOIN_COLUMNS},
            ${SELLER_JOIN_COLUMNS}
     FROM menu_items mi
     JOIN menus m            ON mi.menu_id = m.id
     JOIN categories c       ON mi.category_id = c.id
     JOIN seller_profiles sp ON m.seller_id = sp.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ${orderBy}
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params
  );

  return result.rows;
};

const countAvailableForBrowse = async (filters) => {
  const { conditions, params } = buildBrowseWhere(filters);

  const result = await query(
    `SELECT COUNT(*)::int AS total
     FROM menu_items mi
     JOIN menus m            ON mi.menu_id = m.id
     JOIN categories c       ON mi.category_id = c.id
     JOIN seller_profiles sp ON m.seller_id = sp.id
     WHERE ${conditions.join(' AND ')}`,
    params
  );
  return result.rows[0].total;
};

/**
 * Featured items — top by order count over the last 30 days.
 * Falls back to most-recent when the orders table doesn't exist yet
 * (graceful build-out: this works before the orders feature ships).
 */
const findFeatured = async ({ limit = 20, city } = {}) => {
  const conditions = [
    'mi.is_available = TRUE',
    'mi.deleted_at IS NULL',
    'm.deleted_at IS NULL',
    "sp.status = 'approved'",
  ];
  const params = [];
  if (city) {
    params.push(city);
    conditions.push(`sp.city = $${params.length}`);
  }
  params.push(limit);
  const limitIdx = params.length;

  const orderCountSql = `
    SELECT ${MI_COLUMNS},
           ${CATEGORY_JOIN_COLUMNS},
           ${SELLER_JOIN_COLUMNS},
           COUNT(oi.id) AS order_count
    FROM menu_items mi
    JOIN menus m            ON mi.menu_id = m.id
    JOIN categories c       ON mi.category_id = c.id
    JOIN seller_profiles sp ON m.seller_id = sp.id
    LEFT JOIN order_items oi ON oi.menu_item_id = mi.id
    LEFT JOIN orders o ON o.id = oi.order_id
      AND o.created_at > NOW() - INTERVAL '30 days'
      AND o.status NOT IN ('cancelled')
    WHERE ${conditions.join(' AND ')}
    GROUP BY mi.id, c.id, sp.id
    ORDER BY COUNT(oi.id) DESC, mi.created_at DESC
    LIMIT $${limitIdx}
  `;

  const recentFallbackSql = `
    SELECT ${MI_COLUMNS},
           ${CATEGORY_JOIN_COLUMNS},
           ${SELLER_JOIN_COLUMNS}
    FROM menu_items mi
    JOIN menus m            ON mi.menu_id = m.id
    JOIN categories c       ON mi.category_id = c.id
    JOIN seller_profiles sp ON m.seller_id = sp.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY mi.created_at DESC
    LIMIT $${limitIdx}
  `;

  try {
    const result = await query(orderCountSql, params);
    return result.rows;
  } catch (err) {
    if (err.code === '42P01') {
      // orders / order_items not yet migrated — fall back to recency-based featured.
      const result = await query(recentFallbackSql, params);
      return result.rows;
    }
    throw err;
  }
};

const findByMenuId = async (menuId) => {
  const result = await query(
    `SELECT ${MI_COLUMNS}, ${CATEGORY_JOIN_COLUMNS}
     FROM menu_items mi
     JOIN categories c ON mi.category_id = c.id
     WHERE mi.menu_id = $1 AND mi.deleted_at IS NULL
     ORDER BY mi.created_at DESC`,
    [menuId]
  );
  return result.rows;
};

const findById = async (id) => {
  const result = await query(
    `SELECT ${MI_COLUMNS}, ${CATEGORY_JOIN_COLUMNS}
     FROM menu_items mi
     JOIN categories c ON mi.category_id = c.id
     WHERE mi.id = $1 AND mi.deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Find by id + join through menus to expose seller_id for ownership checks.
 * One query, defense against TOCTOU when multiple ownership checks are needed.
 */
const findByIdWithSeller = async (id) => {
  const result = await query(
    `SELECT ${MI_COLUMNS},
            ${CATEGORY_JOIN_COLUMNS},
            m.seller_id AS seller_id
     FROM menu_items mi
     JOIN menus m ON mi.menu_id = m.id
     JOIN categories c ON mi.category_id = c.id
     WHERE mi.id = $1 AND mi.deleted_at IS NULL AND m.deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Used by the orders feature to verify item availability at checkout.
 * Returns only items that are AVAILABLE — caller compares input IDs to
 * result IDs to detect unavailable items.
 */
const findByIds = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const result = await query(
    `SELECT ${MI_COLUMNS}, m.seller_id AS seller_id
     FROM menu_items mi
     JOIN menus m ON mi.menu_id = m.id
     WHERE mi.id = ANY($1::uuid[])
       AND mi.is_available = TRUE
       AND mi.deleted_at IS NULL
       AND m.deleted_at IS NULL`,
    [ids]
  );
  return result.rows;
};

const create = async ({
  menuId, categoryId, name, description, price, prepTimeMin, isAvailable,
}) => {
  const result = await query(
    `INSERT INTO menu_items
       (id, menu_id, category_id, name, description, price, prep_time_min, is_available)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7)
     RETURNING ${MI_COLUMNS}`,
    [
      menuId, categoryId, name, description || null,
      price, prepTimeMin ?? null, isAvailable ?? true,
    ]
  );
  return result.rows[0];
};

const ALLOWED_UPDATE_FIELDS = new Set([
  'name', 'description', 'price', 'category_id', 'prep_time_min', 'is_available',
]);

const update = async (id, fields) => {
  const entries = Object.entries(fields).filter(([k]) => ALLOWED_UPDATE_FIELDS.has(k));
  if (entries.length === 0) return findById(id);

  const setClauses = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values = entries.map(([, v]) => v);

  const result = await query(
    `UPDATE menu_items
     SET ${setClauses}
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING ${MI_COLUMNS}`,
    [id, ...values]
  );
  // Re-fetch with category info for consistent serialization.
  return result.rows[0] ? findById(id) : null;
};

const softDelete = async (id) => {
  await query(
    'UPDATE menu_items SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
};

const toggleAvailability = async (id, isAvailable) => {
  const result = await query(
    `UPDATE menu_items
     SET is_available = $2
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING ${MI_COLUMNS}`,
    [id, isAvailable]
  );
  return result.rows[0] ? findById(id) : null;
};

const updateImage = async (id, { imageUrl, imagePublicId }) => {
  await query(
    `UPDATE menu_items
     SET image_url = $2, image_public_id = $3
     WHERE id = $1 AND deleted_at IS NULL`,
    [id, imageUrl, imagePublicId]
  );
};

module.exports = {
  findAvailableForBrowse,
  countAvailableForBrowse,
  findFeatured,
  findByMenuId,
  findById,
  findByIdWithSeller,
  findByIds,
  create,
  update,
  softDelete,
  toggleAvailability,
  updateImage,
};
