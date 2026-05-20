'use strict';

/**
 * Default shape — strips internals (deleted_at, image_public_id).
 * Used when the item is being returned to its owner (seller).
 */
const serializeMenuItem = (item) => {
  if (!item) return null;
  return {
    id: item.id,
    menu_id: item.menu_id,
    category_id: item.category_id,
    name: item.name,
    description: item.description,
    price: item.price,
    prep_time_min: item.prep_time_min,
    image_url: item.image_url,
    is_available: item.is_available,
    category: item.category_name
      ? {
          id: item.category_id,
          name: item.category_name,
          slug: item.category_slug,
          icon: item.category_icon,
        }
      : item.category || null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
};

/**
 * Browse shape — adds seller summary (business_name, city, is_open).
 * Used by the public browse list and search results.
 */
const serializeMenuItemWithSeller = (item) => {
  if (!item) return null;
  const base = serializeMenuItem(item);

  // Two shapes supported: pre-joined columns (seller_business_name)
  // or a nested item.seller object.
  const seller = item.seller_business_name
    ? {
        id: item.seller_id,
        business_name: item.seller_business_name,
        city: item.seller_city,
        is_open: item.seller_is_open,
        delivery_radius_km: item.seller_delivery_radius_km,
      }
    : item.seller || null;

  return { ...base, seller };
};

module.exports = { serializeMenuItem, serializeMenuItemWithSeller };
