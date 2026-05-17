'use strict';

const SELLER_VISIBLE_STATUSES = new Set(['accepted', 'preparing', 'ready']);

const serializeOrder = (order, { includeSellerContact = false } = {}) => {
  if (!order) return null;

  const showSellerContact = includeSellerContact &&
    SELLER_VISIBLE_STATUSES.has(order.status);

  const seller = order.seller
    ? {
        id: order.seller.id,
        business_name: order.seller.business_name,
        avatar_url: order.seller.avatar_url,
        ...(showSellerContact && {
          phone: order.seller.phone,
        }),
      }
    : undefined;

  return {
    id: order.id,
    status: order.status,
    total_amount: order.total_amount,
    payment_method: order.payment_method,
    delivery_address: order.delivery_address,
    customer_notes: order.customer_notes,
    estimated_ready_at: order.estimated_ready_at,
    accepted_at: order.accepted_at,
    delivered_at: order.delivered_at,
    cancelled_at: order.cancelled_at,
    auto_cancelled: order.auto_cancelled,
    seller_contact_visible: showSellerContact,
    ...(showSellerContact && {
      seller_coordination_note: 'Your seller will contact you to coordinate delivery.',
    }),
    seller,
    items: order.items,
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
};

const serializeOrderItem = (item) => ({
  id: item.id,
  name: item.name,
  price: item.price,
  quantity: item.quantity,
  subtotal: item.subtotal,
  image_url: item.image_url,
});

module.exports = { serializeOrder, serializeOrderItem };
