/**
 * Domain types — mirror the backend serializer shapes.
 * When the API evolves, update these in one place and the TypeScript
 * compiler will surface every screen that needs to change.
 */

export type UserRole = 'customer' | 'seller' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  avatar_url: string | null;
  created_at: string;
  seller_profile?: SellerProfile | null;
}

export interface SellerProfile {
  id: string;
  business_name: string;
  description: string | null;
  city: string;
  delivery_radius_km: number;
  status: SellerStatus;
  rejection_reason: string | null;
  approved_at: string | null;
  is_open: boolean;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: 'Bearer';
}

/* ── Form input shapes ────────────────────────────────────────────────── */

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterCustomerInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface RegisterSellerInput extends RegisterCustomerInput {
  business_name: string;
  city: string;
  delivery_radius_km: number;
}

export interface PasswordResetRequestInput {
  email: string;
}
