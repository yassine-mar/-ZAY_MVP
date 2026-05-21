'use strict';

/**
 * Public-facing — what a customer sees on the browse + seller profile screens.
 * Hides administrative fields (rejection reasons, suspended_by, etc.).
 */
const serializeSellerPublic = (seller) => {
  if (!seller) return null;
  return {
    id: seller.id,
    business_name: seller.business_name,
    bio: seller.bio,
    avatar_url: seller.avatar_url,
    banner_url: seller.banner_url,
    city: seller.city,
    address: seller.address,
    delivery_radius_km: seller.delivery_radius_km,
    specialties: seller.specialties ?? [],
    is_open: seller.is_open,
    status: seller.status,
    approved_at: seller.approved_at,
    created_at: seller.created_at,
  };
};

/**
 * Self-view — adds owner contact info (user's email/phone) and the analytics-relevant
 * total_orders if joined. Used by GET /seller/profile and the auth response.
 */
const serializeSellerPrivate = (seller) => {
  if (!seller) return null;
  return {
    ...serializeSellerPublic(seller),
    user_id: seller.user_id,
    avatar_public_id: seller.avatar_public_id,
    banner_public_id: seller.banner_public_id,
    phone: seller.user_phone || seller.phone,
    email: seller.user_email || seller.email,
    total_orders: seller.total_orders,
  };
};

/**
 * Admin view — full audit trail.
 * Exposes every status-management column so the admin dashboard can render
 * "Rejected by Admin X on Y because Z" timelines.
 */
const serializeSellerAdmin = (seller) => {
  if (!seller) return null;
  return {
    ...serializeSellerPrivate(seller),
    approved_by: seller.approved_by,
    rejected_at: seller.rejected_at,
    rejected_by: seller.rejected_by,
    rejection_reason: seller.rejection_reason,
    suspended_at: seller.suspended_at,
    suspended_by: seller.suspended_by,
    suspension_reason: seller.suspension_reason,
  };
};

module.exports = { serializeSellerPublic, serializeSellerPrivate, serializeSellerAdmin };
