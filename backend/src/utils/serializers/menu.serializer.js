'use strict';

const serializeMenu = (menu) => {
  if (!menu) return null;
  return {
    id: menu.id,
    seller_id: menu.seller_id,
    name: menu.name,
    description: menu.description,
    sort_order: menu.sort_order,
    item_count: menu.item_count !== undefined ? Number(menu.item_count) : undefined,
    created_at: menu.created_at,
    updated_at: menu.updated_at,
  };
};

/**
 * Menu with its items inlined — used by the seller's menu detail screen
 * and the public seller-profile screen.
 */
const serializeMenuWithItems = (menu, serializeItem) => {
  if (!menu) return null;
  return {
    ...serializeMenu(menu),
    items: Array.isArray(menu.items) ? menu.items.map(serializeItem) : [],
  };
};

module.exports = { serializeMenu, serializeMenuWithItems };
