/**
 * Domain models — mirror the backend's serializer shapes 1:1.
 * When the backend adds a field, update here in one place.
 */

export type UserRole = 'customer' | 'seller' | 'admin';
export type UserStatus = 'active' | 'suspended';
export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin';
  status: UserStatus;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  avatar_url: string | null;
  suspended_at?: string | null;
  suspended_by?: string | null;
  suspension_reason?: string | null;
  created_at: string;
  updated_at: string;
  order_summary?: {
    total_orders: number;
    cancelled_orders: number;
    total_spent: number;
  };
}

export interface Seller {
  id: string;
  user_id: string;
  business_name: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  address: string;
  city: string;
  delivery_radius_km: number;
  specialties: string[];
  is_open: boolean;
  status: SellerStatus;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  suspended_at: string | null;
  suspended_by: string | null;
  suspension_reason: string | null;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  image_url: string | null;
}

export interface DeliveryAddress {
  street: string;
  district?: string;
  city: string;
  landmark?: string;
  notes?: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  total_amount: number;
  payment_method: 'cash';
  delivery_address: DeliveryAddress;
  customer_notes: string | null;
  accepted_at: string | null;
  estimated_ready_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  auto_cancelled: boolean;
  customer?: { id: string; name: string; phone: string };
  seller?: { id: string; business_name: string; avatar_url: string | null; city?: string };
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string | null;
  note: string | null;
  changed_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsOverview {
  users: {
    total: number;
    customers: number;
    admins: number;
    suspended: number;
    new_this_month: number;
    sellers: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      suspended: number;
    };
  };
  orders: {
    total: number;
    today: number;
    this_week: number;
    this_month: number;
    auto_cancelled_today: number;
    completion_rate: number | null;
  };
  revenue: {
    today: number;
    this_week: number;
    this_month: number;
    gmv_all_time: number;
    avg_order_value: number;
  };
  top_categories: Array<{ name: string; slug: string; icon: string | null; order_count: number }>;
}

export interface OrderTrendPoint {
  date: string;
  orders: number;
  cancelled: number;
  revenue: number;
}

export interface TopSeller {
  id: string;
  business_name: string;
  city: string;
  avatar_url: string | null;
  order_count: number;
  revenue: number;
  avg_order_value: number;
}
