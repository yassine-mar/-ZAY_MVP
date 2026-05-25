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

/* ── Browse / Catalog ─────────────────────────────────────────────────── */

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

/** Browse listing — light shape used in cards/lists. */
export interface SellerSummary {
  id: string;
  business_name: string;
  city: string;
  avatar_url: string | null;
  cover_image_url: string | null;
  rating: number | null;
  item_count: number;
  delivery_radius_km: number;
  is_open: boolean;
}

/** Browse detail — adds the menus + open hours, etc. */
export interface SellerDetail extends SellerSummary {
  description: string | null;
  phone?: string;          // visible after order accepted (Amendment 3)
  menus: Menu[];
}

export interface Menu {
  id: string;
  name: string;
  description: string | null;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  menu_id: string;
  seller_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  seller?: { id: string; business_name: string; avatar_url: string | null };
}

/* ── Cart (client-side only) ──────────────────────────────────────────── */

export interface CartLine {
  menu_item_id: string;
  name: string;
  price: number;        // snapshot at add-time — server revalidates on checkout
  quantity: number;
  image_url: string | null;
}

/* ── Orders ───────────────────────────────────────────────────────────── */

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export interface DeliveryAddress {
  street: string;
  district?: string;
  city: string;
  landmark?: string;
  notes?: string;
}

export interface OrderItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderCustomerSnapshot {
  id: string;
  name: string;
  phone: string;
}

export interface OrderSellerSnapshot {
  id: string;
  business_name: string;
  avatar_url: string | null;
  phone?: string;        // revealed when status >= accepted
  city?: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  total_amount: number;
  items: OrderItem[];
  customer?: OrderCustomerSnapshot;
  seller: OrderSellerSnapshot;
  delivery_address: DeliveryAddress;
  customer_notes: string | null;
  estimated_ready_at: string | null;
  created_at: string;
}

export interface OrderStatusEntry {
  id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  changed_at: string;
}

/* ── Place order input ────────────────────────────────────────────────── */

export interface PlaceOrderInput {
  seller_id: string;
  items: Array<{ menu_item_id: string; quantity: number }>;
  delivery_address: DeliveryAddress;
  customer_notes?: string;
}

export interface CartValidationResult {
  available: Array<{ menu_item_id: string; current_price: number; quantity: number }>;
  unavailable: Array<{ menu_item_id: string; reason: string }>;
}
