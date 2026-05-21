'use strict';

/**
 * Default user serializer — strips secrets + device tokens.
 * Used by every authenticated endpoint that returns the calling user.
 */
const serializeUser = (user) => {
  if (!user) return null;
  const { password_hash, fcm_token, ...safe } = user;
  return safe;
};

/**
 * Minimal public shape — used when a user appears inside another resource
 * (order.customer, notification.user, etc.) and we don't want to leak the
 * full profile.
 */
const serializeUserPublic = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    avatar_url: user.avatar_url,
  };
};

/**
 * Admin-view shape — full audit trail including suspension columns.
 * Never returned to non-admin endpoints.
 */
const serializeUserAdmin = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    avatar_url: user.avatar_url,
    suspended_at: user.suspended_at,
    suspended_by: user.suspended_by,
    suspension_reason: user.suspension_reason,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
};

module.exports = { serializeUser, serializeUserPublic, serializeUserAdmin };
