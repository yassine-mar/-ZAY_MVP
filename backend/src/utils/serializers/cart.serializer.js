'use strict';

/**
 * Cart-validation response shape. Tightly scoped to what the mobile
 * cart/checkout screen actually needs — no internal flags leak.
 */

const serializeCartSeller = (seller) => {
  if (!seller) return null;
  return {
    id: seller.id,
    business_name: seller.business_name,
    city: seller.city,
    is_open: seller.is_open,
    status: seller.status,
    delivery_radius_km: seller.delivery_radius_km,
  };
};

const serializeValidatedItem = (item) => ({
  menu_item_id: item.menu_item_id,
  name: item.name ?? null,
  image_url: item.image_url ?? null,
  current_price: item.current_price ?? null,
  client_price: item.client_price ?? null,
  quantity: item.quantity,
  subtotal: item.subtotal,
  available: item.available,
  price_changed: Boolean(item.price_changed),
  issues: item.issues,
});

module.exports = { serializeCartSeller, serializeValidatedItem };
