'use strict';

const serializeSellerPublic = (seller) => {
  if (!seller) return null;
  return {
    id: seller.id,
    business_name: seller.business_name,
    bio: seller.bio,
    avatar_url: seller.avatar_url,
    city: seller.city,
    address: seller.address,
    delivery_radius_km: seller.delivery_radius_km,
    is_open: seller.is_open,
    status: seller.status,
    approved_at: seller.approved_at,
    created_at: seller.created_at,
  };
};

const serializeSellerPrivate = (seller) => {
  if (!seller) return null;
  return {
    ...serializeSellerPublic(seller),
    user_id: seller.user_id,
    phone: seller.phone,
    email: seller.email,
    total_orders: seller.total_orders,
  };
};

const serializeSellerAdmin = (seller) => {
  if (!seller) return null;
  return {
    ...serializeSellerPrivate(seller),
    rejection_reason: seller.rejection_reason,
    suspended_at: seller.suspended_at,
    suspension_reason: seller.suspension_reason,
  };
};

module.exports = { serializeSellerPublic, serializeSellerPrivate, serializeSellerAdmin };
