'use strict';

const serializeMenuItem = (item) => {
  if (!item) return null;
  const { deleted_at, ...safe } = item;
  return safe;
};

const serializeMenuItemWithSeller = (item) => {
  if (!item) return null;
  return {
    ...serializeMenuItem(item),
    seller: item.seller
      ? {
          id: item.seller.id,
          business_name: item.seller.business_name,
          city: item.seller.city,
          avatar_url: item.seller.avatar_url,
          is_open: item.seller.is_open,
          delivery_radius_km: item.seller.delivery_radius_km,
        }
      : undefined,
    category: item.category,
  };
};

module.exports = { serializeMenuItem, serializeMenuItemWithSeller };
