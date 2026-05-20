'use strict';

const { isSellerContactVisible } = require('../orderState');

/**
 * Order response shape.
 *
 * Audience:
 *   - 'customer' (default) — sees seller summary (phone only after accepted)
 *   - 'seller'              — sees customer summary (name + phone for delivery)
 *
 * `includeSellerContact` (customer audience): toggles whether the seller's
 * phone is exposed. The serializer ALSO consults order.status — phone is
 * only revealed for accepted / preparing / ready (Amendment 3). The flag
 * lets callers opt-out (e.g., on the order-list endpoint where the phone
 * isn't needed even for accepted orders).
 */
const serializeOrder = (order, { audience = 'customer', includeSellerContact = true } = {}) => {
  if (!order) return null;

  const sellerContactVisible =
    audience === 'customer' && includeSellerContact && isSellerContactVisible(order.status);

  const seller = order.seller_business_name
    ? { id: order.seller_id, business_name: order.seller_business_name, avatar_url: order.seller_avatar_url }
    : order.seller || null;

  if (seller && sellerContactVisible) {
    seller.phone = order.seller?.phone ?? seller.phone ?? null;
  } else if (seller) {
    delete seller.phone;
  }

  const customer = audience === 'seller'
    ? (order.customer || (order.customer_name ? {
        id: order.customer_id,
        name: order.customer_name,
        phone: order.customer_phone,
      } : null))
    : undefined;

  return {
    id: order.id,
    status: order.status,
    total_amount: Number(order.total_amount),
    payment_method: order.payment_method,
    delivery_address: order.delivery_address,
    customer_notes: order.customer_notes,
    accepted_at: order.accepted_at,
    estimated_ready_at: order.estimated_ready_at,
    delivered_at: order.delivered_at,
    cancelled_at: order.cancelled_at,
    cancellation_reason: order.cancellation_reason,
    auto_cancelled: Boolean(order.auto_cancelled),
    seller_contact_visible: sellerContactVisible,
    ...(sellerContactVisible && {
      seller_coordination_note: 'Your seller will contact you to coordinate delivery.',
    }),
    seller,
    ...(customer !== undefined && { customer }),
    items: Array.isArray(order.items) ? order.items.map(serializeOrderItem) : [],
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
};

const serializeOrderItem = (item) => ({
  id: item.id,
  menu_item_id: item.menu_item_id,
  name: item.name,
  price: Number(item.price),
  quantity: item.quantity,
  subtotal: Number(item.subtotal),
  image_url: item.image_url,
});

module.exports = { serializeOrder, serializeOrderItem };
